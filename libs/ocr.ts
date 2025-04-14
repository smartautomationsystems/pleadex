import { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } from "@aws-sdk/client-textract";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { connectToDatabase } from "./mongo";
import { Document } from "@/models/document";
import { ObjectId } from "mongodb";

const textract = new TextractClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const sns = new SNSClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function processDocumentWithOCR(documentId: string, userId: string) {
  try {
    console.log("Starting OCR processing for document:", documentId);
    console.log("AWS Configuration:", {
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_BUCKET_NAME,
      roleArn: process.env.AWS_TEXTTRACT_ROLE_ARN,
      topicArn: process.env.AWS_SNS_TOPIC_ARN
    });
    
    const { db } = await connectToDatabase();
    const document = await db.collection<Document>("documents").findOne({ 
      _id: new ObjectId(documentId), 
      userId: new ObjectId(userId) 
    });
    
    if (!document) {
      console.error("Document not found:", { documentId, userId });
      throw new Error("Document not found");
    }

    console.log("Found document:", {
      id: document._id,
      s3Key: document.s3Key,
      status: document.status
    });

    // Start Textract job
    const startCommand = new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: process.env.AWS_BUCKET_NAME,
          Name: document.s3Key,
        },
      },
      NotificationChannel: {
        RoleArn: process.env.AWS_TEXTTRACT_ROLE_ARN,
        SNSTopicArn: process.env.AWS_SNS_TOPIC_ARN,
      },
      ClientRequestToken: documentId, // Unique token for idempotency
      JobTag: documentId, // Tag to identify the job
    });

    console.log("Starting Textract job with params:", {
      bucket: process.env.AWS_BUCKET_NAME,
      key: document.s3Key,
      roleArn: process.env.AWS_TEXTTRACT_ROLE_ARN,
      topicArn: process.env.AWS_SNS_TOPIC_ARN,
    });

    const startResponse = await textract.send(startCommand);
    const jobId = startResponse.JobId;

    if (!jobId) {
      console.error("Failed to start Textract job:", startResponse);
      throw new Error("Failed to start Textract job");
    }

    console.log("Started Textract job successfully:", jobId);

    // Update document status
    await db.collection<Document>("documents").updateOne(
      { _id: new ObjectId(documentId) },
      { 
        $set: { 
          status: "processing",
          ocrJobId: jobId,
          updatedAt: new Date()
        }
      }
    );

    console.log("Updated document status to processing");
    return { success: true, jobId };
  } catch (error) {
    console.error("OCR processing error:", {
      error,
      documentId,
      userId,
      timestamp: new Date().toISOString()
    });
    
    // Update document status to failed
    try {
      const { db } = await connectToDatabase();
      await db.collection<Document>("documents").updateOne(
        { _id: new ObjectId(documentId) },
        { 
          $set: { 
            status: "failed",
            updatedAt: new Date()
          }
        }
      );
      console.log("Updated document status to failed");
    } catch (dbError) {
      console.error("Failed to update document status:", dbError);
    }
    
    throw error;
  }
}

export async function checkOCRStatus(jobId: string) {
  try {
    console.log("Checking OCR status for job:", jobId);
    const command = new GetDocumentTextDetectionCommand({ JobId: jobId });
    const response = await textract.send(command);
    
    console.log("OCR status response:", {
      jobId,
      status: response.JobStatus,
      hasText: !!response.Blocks?.length
    });
    
    return {
      status: response.JobStatus,
      text: response.Blocks?.map(block => block.Text || "").join(" ") || "",
    };
  } catch (error) {
    console.error("Error checking OCR status:", {
      error,
      jobId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Handle SNS notifications
export async function handleOCRNotification(message: any) {
  try {
    console.log("Received OCR notification:", message);
    const { db } = await connectToDatabase();
    const { JobId, Status, DocumentLocation } = message;
    
    if (Status === "SUCCEEDED") {
      console.log("OCR job succeeded:", JobId);
      const result = await checkOCRStatus(JobId);
      
      await db.collection<Document>("documents").updateOne(
        { ocrJobId: JobId },
        { 
          $set: { 
            status: "completed",
            ocrText: result.text,
            updatedAt: new Date()
          }
        }
      );
      console.log("Updated document with OCR text");
    } else if (Status === "FAILED") {
      console.error("OCR job failed:", JobId);
      await db.collection<Document>("documents").updateOne(
        { ocrJobId: JobId },
        { 
          $set: { 
            status: "failed",
            updatedAt: new Date()
          }
        }
      );
      console.log("Updated document status to failed");
    }
  } catch (error) {
    console.error("Error handling OCR notification:", {
      error,
      message,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
} 