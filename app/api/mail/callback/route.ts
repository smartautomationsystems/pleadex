import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const searchParams = new URL(req.url).searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/mail?error=${encodeURIComponent(error)}`, req.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/mail?error=No authorization code received', req.url)
      );
    }

    // Exchange the code for access token
    const tokenResponse = await fetch(`${process.env.ZOHO_API_URL}/oauth/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        redirect_uri: process.env.NODE_ENV === 'production'
          ? 'https://pleadex.com/api/mail/callback'
          : 'http://localhost:3000/api/mail/callback',
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      return NextResponse.redirect(
        new URL(`/dashboard/mail?error=${encodeURIComponent(error.message)}`, req.url)
      );
    }

    const tokenData = await tokenResponse.json();

    // Store the tokens in the database
    await prisma.userEmail.update({
      where: {
        userId: session.user.id,
      },
      data: {
        providerAccessToken: tokenData.access_token,
        providerRefreshToken: tokenData.refresh_token,
        providerTokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
    });

    return NextResponse.redirect(new URL('/dashboard/mail?success=true', req.url));
  } catch (error) {
    console.error('Error in mail callback:', error);
    return NextResponse.redirect(
      new URL('/dashboard/mail?error=An unexpected error occurred', req.url)
    );
  }
} 