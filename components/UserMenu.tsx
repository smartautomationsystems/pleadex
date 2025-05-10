'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function UserMenu() {
  const pathname = usePathname();

  const menuItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: '📊'
    },
    {
      label: 'Mail',
      href: '/dashboard/mail',
      icon: '✉️'
    },
    {
      label: 'Cases',
      href: '/dashboard/cases',
      icon: '📁'
    },
    {
      label: 'Documents',
      href: '/dashboard/documents',
      icon: '📄'
    },
    {
      label: 'Forms',
      href: '/dashboard/forms',
      icon: '📝'
    },
    {
      label: 'Profile',
      href: '/dashboard/profile',
      icon: '👤'
    }
  ];

  return (
    <div className="w-64 bg-base-200 min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Dashboard</h1>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-300 ${
              pathname === item.href ? 'bg-base-300' : ''
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-4">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center space-x-2 p-2 rounded-lg hover:bg-base-300"
        >
          <span>🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
} 