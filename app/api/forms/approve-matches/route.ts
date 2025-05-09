import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectToDatabase } from "@/libs/db";
import { ObjectId } from "mongodb";

interface VariableMatch {
  fieldKey: string;
  existingVariable?: {
    name: string;
    category: string;
  };
  proposedVariable?: {
    name: string;
    category: string;
    type: string;
    required: boolean;
    placeholder?: string;
  };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { formId, matches } = await request.json();
    if (!formId || !matches) {
      return new NextResponse("Form ID and matches are required", { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Get the form
    const form = await db.collection("forms").findOne({
      _id: new ObjectId(formId),
      userId: new ObjectId(session.user.id),
    });

    if (!form) {
      return new NextResponse("Form not found", { status: 404 });
    }

    // Process each match
    const processedFields = [];
    const newVariables = [];

    for (const match of matches) {
      if (match.existingVariable) {
        // Use existing variable
        processedFields.push({
          key: match.fieldKey,
          variableName: match.existingVariable.name,
          category: match.existingVariable.category
        });
      } else if (match.proposedVariable) {
        // Create new variable
        const newVariable = {
          name: match.proposedVariable.name,
          type: "formField",
          category: match.proposedVariable.category,
          value: {
            fieldType: match.proposedVariable.type,
            required: match.proposedVariable.required,
            placeholder: match.proposedVariable.placeholder
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Insert new variable
        const result = await db.collection("globals").insertOne(newVariable);
        
        processedFields.push({
          key: match.fieldKey,
          variableName: match.proposedVariable.name,
          category: match.proposedVariable.category,
          variableId: result.insertedId
        });

        newVariables.push({
          ...newVariable,
          _id: result.insertedId
        });
      }
    }

    // Update form with processed fields
    await db.collection("forms").updateOne(
      { _id: new ObjectId(formId) },
      {
        $set: {
          processedFields,
          status: "completed",
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      processedFields,
      newVariables
    });
  } catch (error) {
    console.error("Error approving matches:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 