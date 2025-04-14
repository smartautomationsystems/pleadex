'use client';

import { useSession, signOut } from 'next-auth/react';

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={() => signOut()}
          className="btn btn-ghost"
        >
          Sign Out
        </button>
      </div>
      
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Welcome, {session?.user?.name || 'User'}!</h2>
          <p>Select an option from the side menu to get started.</p>
        </div>
      </div>
    </div>
  );
}
