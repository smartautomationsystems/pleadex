'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SuperAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  if (session.user.role !== 'superadmin') {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen">
      <main className="p-8">
        {children}
      </main>
    </div>
  );
} 