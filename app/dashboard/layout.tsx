'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import UserMenu from '@/components/UserMenu';
import { useEffect } from 'react';

// This is a server-side component to ensure the user is logged in.
// If not, it will redirect to the login page.
// It's applied to all subpages of /dashboard in /app/dashboard/*** pages
// You can also add custom static UI elements like a Navbar, Sidebar, Footer, etc..
// See https://shipfa.st/docs/tutorials/private-page
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (session.user.role === 'superadmin') {
      router.push('/superadmin/dashboard');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!session || session.user.role === 'superadmin') {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <UserMenu />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
