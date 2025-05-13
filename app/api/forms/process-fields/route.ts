import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectToDatabase } from "@/libs/db";
import { ObjectId } from "mongodb";
import OpenAI from "openai";
import { ensureOpenAIConfig } from '@/libs/env';

interface FormField {
  key: string;
  value: string;
  confidence: number;
  boundingBox?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

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

// Initialize OpenAI client only when needed
function getOpenAIClient(apiKey: string) {
  ensureOpenAIConfig();
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }
  return new OpenAI({ apiKey });
}

export async function POST(request: Request) {
  // Allow internal API key for backend calls
  const authHeader = request.headers.get('authorization');
  const isInternal = authHeader === `Bearer ${process.env.INTERNAL_API_KEY}`;

  let userId: string | null = null;
  if (!isInternal) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    userId = session.user.id;
  }

  const { formId } = await request.json();
  if (!formId) {
    return new NextResponse("Form ID is required", { status: 400 });
  }

  const { db } = await connectToDatabase();
  
  // Get the form
  const formQuery: any = { _id: new ObjectId(formId) };
  if (!isInternal && userId && /^[a-fA-F0-9]{24}$/.test(userId)) {
    formQuery.userId = new ObjectId(userId);
  }
  // @ts-ignore
  const form = await db.collection("forms").findOne(formQuery);

  if (!form) {
    return new NextResponse("Form not found", { status: 404 });
  }

  // Fetch OpenAI API key from settings
  // @ts-ignore
  const settings = await db.collection("settings").findOne({ _id: "system_settings" });
  const openaiApiKey = settings?.ai?.openaiConfig?.apiKey;
  if (!openaiApiKey) {
    return new NextResponse("OpenAI API key not configured", { status: 500 });
  }

  // Get all existing global variables
  const existingVariables = await db.collection("globals").find({
    type: "formField",
  }).toArray();

  // Get form fields from OCR results
  const formFields: FormField[] = form.fields || [];

  // Prepare the prompt for OpenAI
  const prompt = `
    I have a form with the following fields:
    ${JSON.stringify(formFields, null, 2)}

    And here are the existing global variables:
    ${JSON.stringify(existingVariables, null, 2)}

    For each form field, please:
    1. Try to match it with an existing global variable if it's semantically similar
    2. If no match exists, propose a new variable with:
       - A clear, descriptive name
       - The most appropriate category
       - The most suitable field type (text, number, date, select, textarea)
       - Whether it should be required
       - A helpful placeholder if applicable

    Return the results as a JSON array of matches, where each match has:
    - fieldKey: the original form field key
    - existingVariable: { name, category } if a match was found
    - proposedVariable: { name, category, type, required, placeholder } if no match was found
  `;

  // Call OpenAI to analyze the fields
  const openai = getOpenAIClient(openaiApiKey);
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: "You are a legal document analysis assistant. Your task is to match form fields with existing variables or propose new ones."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: { type: "json_object" }
  });

  const matches: VariableMatch[] = JSON.parse(completion.choices[0].message.content).matches;

  // Update the form with the matches
  await db.collection("forms").updateOne(
    { _id: new ObjectId(formId) },
    {
      $set: {
        fieldMatches: matches,
        status: "analyzed",
        updatedAt: new Date()
      }
    }
  );

  return NextResponse.json({
    success: true,
    matches
  });
} 