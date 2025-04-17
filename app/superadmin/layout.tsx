import ClientLayout from './components/ClientLayout';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
} 