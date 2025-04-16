'use client';

import { useSession } from 'next-auth/react';

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <p>Welcome to your dashboard!</p>
        </div>
      </div>
    </div>
  );
}
