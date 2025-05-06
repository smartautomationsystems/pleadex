import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const { apiKey, modelId } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API key' },
        { status: 400 }
      );
    }

    // Test the connection by fetching available voices
    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey
      }
    });

    if (response.status !== 200) {
      throw new Error('Failed to connect to ElevenLabs');
    }

    // Verify we got a valid response with voices
    if (!response.data || !Array.isArray(response.data.voices)) {
      throw new Error('Invalid response from ElevenLabs API');
    }

    // If we have voices, the API key is valid
    return NextResponse.json({ 
      success: true,
      message: 'Successfully connected to ElevenLabs',
      voices: response.data.voices.length
    });

  } catch (error) {
    console.error('Error testing TTS connection:', error);
    
    // Handle specific axios errors
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      if (error.response?.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `ElevenLabs API error: ${error.message}` },
        { status: error.response?.status || 500 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect to ElevenLabs' },
      { status: 500 }
    );
  }
} 