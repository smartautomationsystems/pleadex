import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectToDatabase } from '@/libs/db';
import { Form } from "@/models/form";
import { ObjectId } from "mongodb";
import { getSignedUrlForDocument } from "@/libs/storage";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const formId = searchParams.get("id");

    if (!formId) {
      return NextResponse.json(
        { error: "Form ID is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    let form;
    if (session.user.role === 'superadmin') {
      form = await db.collection<Form>("forms").findOne({ _id: new ObjectId(formId) });
    } else {
      form = await db.collection<Form>("forms").findOne({
        _id: new ObjectId(formId),
        $or: [
          { userId: new ObjectId(session.user.id) },
          { userId: session.user.id },
          { userId: { $exists: false } },
          { userId: 'superadmin' }
        ]
      });
    }

    if (!form) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    // Get signed URL for the form
    const url = await getSignedUrlForDocument(form.s3Key);

    return NextResponse.json({
      url,
      fields: form.fields || []
    });
  } catch (error) {
    console.error("Error viewing form:", error);
    return NextResponse.json(
      { error: "Failed to view form" },
      { status: 500 }
    );
  }
} 