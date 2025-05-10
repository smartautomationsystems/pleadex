import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { updateSubscriptionStatus } from '@/lib/email-management';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { status, expiresAt } = await req.json();

    if (!status || !expiresAt) {
      return NextResponse.json(
        { message: 'Status and expiration date are required' },
        { status: 400 }
      );
    }

    if (!['active', 'inactive'].includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status. Must be either "active" or "inactive"' },
        { status: 400 }
      );
    }

    const email = await prisma.userEmail.findFirst({
      where: {
        userId: session.user.id,
      },
    });

    if (!email) {
      return NextResponse.json(
        { message: 'No email account found' },
        { status: 404 }
      );
    }

    // Update subscription status
    await updateSubscriptionStatus(email.id, status, new Date(expiresAt));

    return NextResponse.json({
      message: 'Subscription status updated successfully',
      status,
      expiresAt,
    });
  } catch (error) {
    console.error('Error updating subscription status:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 