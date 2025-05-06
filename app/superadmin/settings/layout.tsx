import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | Super Admin',
  description: 'System settings and configuration',
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 