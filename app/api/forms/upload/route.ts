import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectToDatabase } from "@/libs/mongo";
import { Form } from "@/models/form";
import { ObjectId } from "mongodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF, JPEG, and PNG are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `forms/${session.user.id}/${Date.now()}-${file.name}`;

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    // Insert form into database
    const { db } = await connectToDatabase();
    const result = await db.collection<Form>("forms").insertOne({
      userId: new ObjectId(session.user.id),
      name: file.name,
      type: file.type,
      size: file.size,
      s3Key: key,
      status: "pending",
      fields: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update status to processing immediately
    await db.collection<Form>("forms").updateOne(
      { _id: result.insertedId },
      { $set: { status: "processing" } }
    );
    console.log('Form status updated to processing:', {
      formId: result.insertedId.toString(),
      timestamp: new Date().toISOString()
    });

    const baseUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : process.env.NEXT_PUBLIC_BASE_URL;

    // Trigger OCR process asynchronously
    fetch(`${baseUrl}/api/forms/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
      body: JSON.stringify({
        formId: result.insertedId.toString(),
        userId: session.user.id
      }),
    }).catch(err => console.error('OCR trigger failed silently:', err));

    return NextResponse.json({
      success: true,
      formId: result.insertedId.toString(),
    });
  } catch (error) {
    console.error("Error uploading form:", error);
    return NextResponse.json(
      { error: "Failed to upload form" },
      { status: 500 }
    );
  }
} 