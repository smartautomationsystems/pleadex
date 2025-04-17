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
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated' || session?.user?.role !== 'superadmin') {
    router.push('/superadmin/login');
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <main className="flex-1 p-8 bg-gray-50">{children}</main>
    </div>
  );
} 