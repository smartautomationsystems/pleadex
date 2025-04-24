'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { FaDatabase, FaGavel, FaSignOutAlt } from 'react-icons/fa';

export default function SideMenu() {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    {
      name: 'Global Variables',
      path: '/superadmin',
      icon: <FaDatabase className="w-5 h-5" />
    },
    {
      name: 'Court Management',
      path: '/superadmin/courts',
      icon: <FaGavel className="w-5 h-5" />
    }
  ];

  return (
    <div className="w-64 min-h-screen bg-gray-800 text-white p-4 flex flex-col">
      <div className="text-xl font-bold mb-8 px-4">Super Admin</div>
      <nav className="flex-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              pathname === item.path
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            {item.icon}
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
      <button
        onClick={() => {
          signOut({
            redirect: true,
            callbackUrl: '/superadmin/login'
          });
        }}
        className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors mt-auto"
      >
        <FaSignOutAlt className="w-5 h-5" />
        <span>Sign Out</span>
      </button>
    </div>
  );
} 