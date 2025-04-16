import {
  TextractClient,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand
} from "@aws-sdk/client-textract";
import { connectToDatabase } from "./mongo";
import { Form } from "@/models/form";
import { ObjectId } from "mongodb";

const textractClient = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function processFormWithOCR(formId: string, userId: string) {
  try {
    const { db } = await connectToDatabase();
    const form = await db.collection<Form>("forms").findOne({
      _id: new ObjectId(formId),
      userId: new ObjectId(userId),
    });

    if (!form) {
      return { success: false, error: "Form not found" };
    }

    // Start Textract text detection
    const startCommand = new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: process.env.AWS_S3_BUCKET,
          Name: form.s3Key,
        },
      },
    });

    const startResponse = await textractClient.send(startCommand);
    const jobId = startResponse.JobId;

    if (!jobId) {
      return { success: false, error: "Failed to start form analysis" };
    }

    // Poll for job completion
    let jobStatus = "IN_PROGRESS";
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max
    const fields: any[] = [];

    console.log('Starting OCR processing for form:', {
      formId,
      jobId,
      timestamp: new Date().toISOString()
    });

    while (jobStatus === "IN_PROGRESS" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds between checks
      attempts++;

      console.log('Checking OCR status:', {
        formId,
        jobId,
        attempt: attempts,
        timestamp: new Date().toISOString()
      });

      const getCommand = new GetDocumentTextDetectionCommand({ JobId: jobId });
      const getResponse = await textractClient.send(getCommand);

      jobStatus = getResponse.JobStatus || "FAILED";

      if (jobStatus === "SUCCEEDED") {
        console.log('OCR processing succeeded:', {
          formId,
          jobId,
          timestamp: new Date().toISOString()
        });
        // Extract text from blocks
        const blocks = getResponse.Blocks || [];
        const text = blocks
          .filter(block => block.BlockType === "LINE")
          .map(block => block.Text)
          .join("\n");

        // Update form with extracted text
        await db.collection<Form>("forms").updateOne(
          { _id: new ObjectId(formId) },
          { 
            $set: { 
              status: "completed",
              fields: [{ key: "text", value: text }],
              processedAt: new Date(),
            }
          }
        );

        return { success: true, fields: [{ key: "text", value: text }] };
      }
    }

    // Update form status to failed if job failed or timed out
    await db.collection<Form>("forms").updateOne(
      { _id: new ObjectId(formId) },
      { 
        $set: { 
          status: "failed",
          error: jobStatus === "FAILED" ? "Form analysis failed" : "Form analysis timed out",
          processedAt: new Date(),
        }
      }
    );

    return { 
      success: false, 
      error: jobStatus === "FAILED" ? "Form analysis failed" : "Form analysis timed out" 
    };
  } catch (error) {
    console.error("Error processing form with OCR:", error);
    return { success: false, error: "Failed to process form" };
  }
}

function extractFormFields(blocks: any[]) {
  const formFields: any[] = [];
  const keyValueMap = new Map();
  
  // First pass: collect all KEY_VALUE_SET blocks
  blocks.forEach(block => {
    if (block.BlockType === "KEY_VALUE_SET") {
      if (block.EntityTypes?.includes("KEY")) {
        keyValueMap.set(block.Id, { key: null, value: null });
      }
    }
  });

  // Second pass: link keys and values
  blocks.forEach(block => {
    if (block.BlockType === "KEY_VALUE_SET") {
      const keyValue = keyValueMap.get(block.Id);
      if (keyValue) {
        if (block.EntityTypes?.includes("KEY")) {
          const keyText = getTextForBlock(block, blocks);
          keyValue.key = keyText;
        } else if (block.EntityTypes?.includes("VALUE")) {
          const valueText = getTextForBlock(block, blocks);
          keyValue.value = valueText;
        }
      }
    }
  });

  // Convert to array of form fields
  keyValueMap.forEach((value, key) => {
    if (value.key && value.value) {
      formFields.push({
        key: value.key,
        value: value.value
      });
    }
  });

  return formFields;
}

function getTextForBlock(block: any, blocks: any[]) {
  let text = "";
  if (block.Relationships) {
    block.Relationships.forEach((rel: any) => {
      if (rel.Type === "CHILD") {
        rel.Ids.forEach((id: string) => {
          const childBlock = blocks.find(b => b.Id === id);
          if (childBlock && childBlock.BlockType === "WORD") {
            text += (text ? " " : "") + (childBlock.Text || "");
          }
        });
      }
    });
  }
  return text;
}

export async function checkFormOCRStatus(jobId: string) {
  try {
    const command = new GetDocumentTextDetectionCommand({ JobId: jobId });
    const response = await textractClient.send(command);

    return {
      status: response.JobStatus,
      fields: extractFormFields(response.Blocks || [])
    };
  } catch (error) {
    console.error("Error checking form OCR status:", error);
    throw error;
  }
} 