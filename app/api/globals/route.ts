import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectToDatabase } from '@/libs/db';
import { Global } from "@/models/global";
import { ObjectId } from "mongodb";

const PARTY_TYPES = [
  { id: 'plaintiff', label: 'Plaintiff', description: 'The party who initiates the lawsuit' },
  { id: 'defendant', label: 'Defendant', description: 'The party against whom the lawsuit is filed' },
  { id: 'third_party_plaintiff', label: 'Third-Party Plaintiff', description: 'A defendant who files a claim against a third party' },
  { id: 'third_party_defendant', label: 'Third-Party Defendant', description: 'A party brought into the lawsuit by a third-party plaintiff' },
  { id: 'cross_plaintiff', label: 'Cross-Plaintiff', description: 'A defendant who files a claim against a co-defendant' },
  { id: 'cross_defendant', label: 'Cross-Defendant', description: 'A defendant against whom a cross-claim is filed' },
  { id: 'intervenor', label: 'Intervenor', description: 'A party who joins the lawsuit voluntarily' },
  { id: 'amicus_curiae', label: 'Amicus Curiae', description: 'A friend of the court who provides expertise' },
  { id: 'guardian_ad_litem', label: 'Guardian Ad Litem', description: 'A person appointed to represent a minor or incompetent person' },
  { id: 'next_friend', label: 'Next Friend', description: 'A person who represents someone unable to represent themselves' }
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const globals = await db
      .collection<Global>("globals")
      .find()
      .sort({ type: 1, label: 1 })
      .toArray();

    // Always return party types for authenticated users
    return NextResponse.json({
      globals,
      partyTypes: PARTY_TYPES
    });
  } catch (error) {
    console.error("Error fetching globals:", error);
    return NextResponse.json(
      { error: "Failed to fetch globals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { type, key, label, value, coreCategory } = await request.json();

    if (!type || !key || !label) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Check if key already exists
    const existing = await db
      .collection<Global>("globals")
      .findOne({ key });

    if (existing) {
      return NextResponse.json(
        { error: "Key already exists" },
        { status: 400 }
      );
    }

    const now = new Date();
    const result = await db.collection<Global>("globals").insertOne({
      type,
      key,
      label,
      value,
      coreCategory,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      global: {
        _id: result.insertedId,
        type,
        key,
        label,
        value,
        coreCategory,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error) {
    console.error("Error creating global:", error);
    return NextResponse.json(
      { error: "Failed to create global" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { _id, type, key, label, value, coreCategory } = await request.json();

    if (!_id || !type || !key || !label) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Check if key already exists for a different document
    const existing = await db
      .collection<Global>("globals")
      .findOne({ key, _id: { $ne: new ObjectId(_id) } });

    if (existing) {
      return NextResponse.json(
        { error: "Key already exists" },
        { status: 400 }
      );
    }

    const now = new Date();
    await db.collection<Global>("globals").updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          type,
          key,
          label,
          value,
          coreCategory,
          updatedAt: now,
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating global:", error);
    return NextResponse.json(
      { error: "Failed to update global" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing ID" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    await db.collection<Global>("globals").deleteOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting global:", error);
    return NextResponse.json(
      { error: "Failed to delete global" },
      { status: 500 }
    );
  }
} 