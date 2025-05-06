'use client';

import SuperAdminMenu from '@/components/SuperAdminMenu';
import { usePathname } from 'next/navigation';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <div className="flex min-h-screen">
      {!isLoginPage && <SuperAdminMenu />}
      <main className={`${isLoginPage ? 'w-full' : 'flex-1'} p-8 bg-gray-50`}>
        {children}
      </main>
    </div>
  );
} 