'use client';

import SideMenu from './SideMenu';
import { usePathname } from 'next/navigation';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/superadmin/login';

  return (
    <div className="flex min-h-screen">
      {!isLoginPage && <SideMenu />}
      <main className={`${isLoginPage ? 'w-full' : 'flex-1'} p-8 bg-gray-50`}>
        {children}
      </main>
    </div>
  );
} 