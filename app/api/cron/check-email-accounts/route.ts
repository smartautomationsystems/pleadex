import { NextResponse } from 'next/server';
import { checkAllEmailAccounts } from '@/lib/email-management';

// This endpoint should be called by a cron job daily
export async function GET(req: Request) {
  try {
    // Verify the request is from a trusted source (e.g., Vercel Cron)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check and update all email accounts
    const results = await checkAllEmailAccounts();

    return NextResponse.json({
      message: 'Email accounts checked successfully',
      results,
    });
  } catch (error) {
    console.error('Error checking email accounts:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 