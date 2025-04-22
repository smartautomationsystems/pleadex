import {
  TextractClient,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand
} from "@aws-sdk/client-textract";
import { connectToDatabase } from "./mongo";
import { Document } from "@/models/document";
import { ObjectId } from "mongodb";

const textract = new TextractClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  },
  endpoint: `https://textract.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com`
});

export async function processDocumentWithOCR(documentId: string, userId: string) {
  try {
    console.log("Starting OCR processing for document:", documentId);

    const { db } = await connectToDatabase();
    const document = await db.collection<Document>("documents").findOne({
      _id: new ObjectId(documentId),
      userId: new ObjectId(userId)
    });

    if (!document) {
      console.error("Document not found:", { documentId, userId });
      throw new Error("Document not found");
    }

    const startCommand = new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: process.env.AWS_S3_BUCKET,
          Name: document.s3Key
        }
      },
      ClientRequestToken: documentId,
      JobTag: documentId
    });

    const startResponse = await textract.send(startCommand);
    const jobId = startResponse.JobId;

    if (!jobId) {
      throw new Error("Textract job failed to start");
    }

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

    let jobStatus = "IN_PROGRESS";
    let attempts = 0;
    const maxAttempts = 75; // 2.5 minutes at 2s interval
    let allText = "";

    while (jobStatus === "IN_PROGRESS" && attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;

      const statusCommand = new GetDocumentTextDetectionCommand({ JobId: jobId });
      const statusResponse = await textract.send(statusCommand);
      jobStatus = statusResponse.JobStatus || "IN_PROGRESS";

      if (jobStatus === "SUCCEEDED") {
        // Get all pages of text
        let nextToken = statusResponse.NextToken;
        let currentPage = 1;
        
        // Process first page
        const firstPageText = statusResponse.Blocks?.filter((b) => b.BlockType === "LINE")
          .map((b) => b.Text || "")
          .join("\n") || "";
        allText += firstPageText;

        // Process remaining pages
        while (nextToken) {
          const nextPageCommand = new GetDocumentTextDetectionCommand({
            JobId: jobId,
            NextToken: nextToken
          });
          const nextPageResponse = await textract.send(nextPageCommand);
          currentPage++;
          
          const pageText = nextPageResponse.Blocks?.filter((b) => b.BlockType === "LINE")
            .map((b) => b.Text || "")
            .join("\n") || "";
          allText += "\n\n" + pageText;
          
          nextToken = nextPageResponse.NextToken;
        }

        console.log(`Extracted text from ${currentPage} pages`);

        await db.collection<Document>("documents").updateOne(
          { _id: new ObjectId(documentId) },
          {
            $set: {
              status: "completed",
              content: allText,
              updatedAt: new Date()
            }
          }
        );

        console.log("OCR complete for document:", documentId);
        return { success: true, text: allText };
      } else if (jobStatus === "FAILED") {
        throw new Error("Textract job failed");
      }
    }

    throw new Error("Textract job timed out");
  } catch (error) {
    console.error("OCR processing error:", error);
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
    } catch (dbError) {
      console.error("Failed to update status to failed:", dbError);
    }
    throw error;
  }
}

export async function checkOCRStatus(jobId: string) {
  try {
    const command = new GetDocumentTextDetectionCommand({ JobId: jobId });
    const response = await textract.send(command);

    return {
      status: response.JobStatus,
      text: response.Blocks?.map((block) => block.Text || "").join(" ") || ""
    };
  } catch (error) {
    console.error("Error checking OCR status:", error);
    throw error;
  }
}

export async function handleOCRNotification(notification: any) {
  try {
    const { db } = await connectToDatabase();
    const { JobId, Status } = notification;

    if (Status === "SUCCEEDED") {
      const result = await checkOCRStatus(JobId);
      await db.collection<Document>("documents").updateOne(
        { ocrJobId: JobId },
        {
          $set: {
            status: "completed",
            content: result.text,
            updatedAt: new Date()
          }
        }
      );
    } else if (Status === "FAILED") {
      await db.collection<Document>("documents").updateOne(
        { ocrJobId: JobId },
        {
          $set: {
            status: "failed",
            updatedAt: new Date()
          }
        }
      );
    }
  } catch (error) {
    console.error("Error handling OCR notification:", error);
    throw error;
  }
} 