import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Valid model names for each provider
const VALID_MODELS = {
  openai: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
};

export async function POST(request: Request) {
  try {
    const { provider, apiKey, model } = await request.json();

    if (!provider || !apiKey || !model) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate the model name for the selected provider
    if (!VALID_MODELS[provider as keyof typeof VALID_MODELS]?.includes(model)) {
      return NextResponse.json(
        { error: `Invalid model "${model}" for provider "${provider}". Please select a valid model.` },
        { status: 400 }
      );
    }

    if (provider === 'openai') {
      const openai = new OpenAI({
        apiKey: apiKey,
      });

      // Test the connection by making a simple completion request
      await openai.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      });

      return NextResponse.json({ success: true });
    } else if (provider === 'anthropic') {
      const anthropic = new Anthropic({
        apiKey: apiKey,
      });

      // Test the connection by making a simple message request
      await anthropic.messages.create({
        model: model,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Hello' }],
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error testing AI connection:', error);
    if (error instanceof Error) {
      // Check if it's a model not found error
      if (error.message.includes('model:') && error.message.includes('not found')) {
        const { model } = await request.json();
        return NextResponse.json(
          { error: `Model ${model} is not available. Please select a different model.` },
          { status: 400 }
        );
      }
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect to AI provider' },
      { status: 500 }
    );
  }
} 