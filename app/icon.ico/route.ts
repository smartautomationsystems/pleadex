import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const image = await fetch(new URL('/images/Pleadex Logo.png', req.url)).then(
      (res) => res.arrayBuffer()
    );

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            background: 'white',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={image as any}
            alt="Pleadex Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        </div>
      ),
      {
        width: 32,
        height: 32,
      }
    );
  } catch (e) {
    console.error('Failed to generate favicon:', e);
    return new Response('Failed to generate favicon', { status: 500 });
  }
} 