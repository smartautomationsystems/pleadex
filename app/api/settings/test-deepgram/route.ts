import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apiKey, options } = await request.json();
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Test the connection by making a simple API call to Deepgram
    const response = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://static.deepgram.com/examples/Bueller-Life-moves-pretty-fast.wav',
        ...options
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to connect to Deepgram');
    }

    const data = await response.json();
    return NextResponse.json({ 
      success: true,
      message: 'Successfully connected to Deepgram',
      model: data.results?.channels[0]?.alternatives[0]?.model
    });
  } catch (error) {
    console.error('Error testing Deepgram connection:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect to Deepgram' },
      { status: 500 }
    );
  }
} 