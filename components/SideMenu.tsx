'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaFolder, FaFileAlt, FaClipboardList, FaUsers, FaSignOutAlt } from 'react-icons/fa';
import Image from 'next/image';
import { signOut } from 'next-auth/react';

const menuItems = [
  { name: 'Cases', href: '/dashboard/cases', icon: FaFolder },
  { name: 'Documents', href: '/dashboard/documents', icon: FaFileAlt },
  { name: 'Forms', href: '/dashboard/forms', icon: FaClipboardList },
  { name: 'Users', href: '/dashboard/users', icon: FaUsers },
];

export default function SideMenu() {
  const pathname = usePathname();

  return (
    <div className="w-64 min-h-screen bg-base-200 p-4 flex flex-col">
      <div className="mb-8">
        <Link href="/dashboard" className="flex items-center justify-center">
          <Image
            src="/images/Pleadex-Logo.svg"
            alt="Pleadex Logo"
            width={150}
            height={50}
            className="object-contain"
            priority
          />
        </Link>
      </div>
      <div className="flex flex-col space-y-2 flex-grow">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-primary-content'
                  : 'hover:bg-base-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
      <button
        onClick={() => signOut()}
        className="flex items-center space-x-2 p-3 rounded-lg transition-colors hover:bg-base-300 mt-auto"
      >
        <FaSignOutAlt className="w-5 h-5" />
        <span>Sign Out</span>
      </button>
    </div>
  );
} 