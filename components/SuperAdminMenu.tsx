'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { FaUsers, FaGlobe, FaCog, FaGavel, FaFileAlt, FaList } from 'react-icons/fa';
import clsx from 'clsx';

interface SubMenuItem {
  label: string;
  href: string;
  icon: any;
}

interface MenuItem {
  label: string;
  href: string;
  icon: any;
  submenu?: SubMenuItem[];
}

export default function SuperAdminMenu() {
  const pathname = usePathname();

  const menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      href: '/superadmin/dashboard',
      icon: FaGavel
    },
    {
      label: 'Users',
      href: '/superadmin/users',
      icon: FaUsers
    },
    {
      label: 'Variables',
      href: '/superadmin/globals',
      icon: FaGlobe,
      submenu: [
        {
          label: 'Categories',
          href: '/superadmin/globals/categories',
          icon: FaList
        }
      ]
    },
    {
      label: 'Courts',
      href: '/superadmin/courts',
      icon: FaGavel
    },
    {
      label: 'Settings',
      href: '/superadmin/settings',
      icon: FaCog
    },
    {
      label: 'Forms',
      href: '/superadmin/forms',
      icon: FaFileAlt,
      submenu: [
        {
          label: 'Categories',
          href: '/superadmin/forms/categories',
          icon: FaList
        }
      ]
    }
  ];

  // Helper to check if any submenu is active
  const isSubmenuActive = (submenu: SubMenuItem[] | undefined): boolean =>
    !!submenu && submenu.some((sub: SubMenuItem) => pathname === sub.href);

  return (
    <div className="w-64 bg-base-200 min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Super Admin</h1>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const parentActive = pathname === item.href || isSubmenuActive(item.submenu);
          return (
            <div key={item.href} className="group">
              <Link
                href={item.href}
                className={clsx(
                  'flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  parentActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                {typeof item.icon === 'string' ? (
                  <span className="mr-3">{item.icon}</span>
                ) : (
                  <item.icon className="mr-3 h-5 w-5" />
                )}
                {item.label}
              </Link>
              {item.submenu && (
                <div
                  className={
                    'ml-6 mt-1 space-y-1 hidden group-hover:block' +
                    (isSubmenuActive(item.submenu) ? ' block' : '')
                  }
                >
                  {item.submenu.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={clsx(
                        'flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
                        pathname === subItem.href
                          ? 'bg-gray-200 text-gray-900 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      {typeof subItem.icon === 'string' ? (
                        <span className="mr-3">{subItem.icon}</span>
                      ) : (
                        <subItem.icon className="mr-3 h-5 w-5" />
                      )}
                      {subItem.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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

// Add this style to the global CSS if needed for smooth submenu transitions:
// .group:hover .group-hover\:block { display: block; } 