'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FaUsers, FaExclamationTriangle, FaCheckCircle, FaClock, FaFolder, FaFileAlt } from 'react-icons/fa';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalCases: number;
  totalDocuments: number;
}

interface ErrorLog {
  _id: string;
  userId?: string;
  userName?: string;
  type: string;
  message: string;
  stack?: string;
  timestamp: string;
  resolved: boolean;
}

export default function SuperAdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role !== 'superadmin') {
      router.push('/dashboard');
    } else {
      fetchDashboardData();
      // Set up polling for error logs
      const interval = setInterval(fetchErrorLogs, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [session, status, router]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      // Fetch dashboard stats
      const statsResponse = await fetch('/api/stats');
      if (!statsResponse.ok) throw new Error('Failed to fetch dashboard stats');
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Initial fetch of error logs
      await fetchErrorLogs();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchErrorLogs = async () => {
    try {
      const response = await fetch('/api/logs/errors');
      if (!response.ok) throw new Error('Failed to fetch error logs');
      const data = await response.json();
      setErrorLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching error logs:', error);
    }
  };

  const markErrorResolved = async (errorId: string) => {
    try {
      const response = await fetch(`/api/logs/errors/${errorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      });

      if (!response.ok) throw new Error('Failed to update error status');
      toast.success('Error marked as resolved');
      fetchErrorLogs(); // Refresh the logs
    } catch (error) {
      console.error('Error updating error status:', error);
      toast.error('Failed to update error status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Super Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total Users</p>
              <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
            </div>
            <FaUsers className="text-3xl text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Active Users</p>
              <p className="text-2xl font-bold">{stats?.activeUsers || 0}</p>
            </div>
            <FaCheckCircle className="text-3xl text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total Cases</p>
              <p className="text-2xl font-bold">{stats?.totalCases || 0}</p>
            </div>
            <FaFolder className="text-3xl text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total Documents</p>
              <p className="text-2xl font-bold">{stats?.totalDocuments || 0}</p>
            </div>
            <FaFileAlt className="text-3xl text-purple-500" />
          </div>
        </div>
      </div>

      {/* Error Logs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <FaExclamationTriangle className="text-red-500 mr-2" />
          Recent Error Logs
        </h2>
        <div className="space-y-4">
          {errorLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent errors</p>
          ) : (
            errorLogs.map((log) => (
              <div
                key={log._id}
                className={`border rounded-lg p-4 ${
                  log.resolved ? 'bg-gray-50' : 'bg-red-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{log.type}</p>
                    <p className="text-gray-600">{log.message}</p>
                    {log.userName && (
                      <p className="text-sm text-gray-500">User: {log.userName}</p>
                    )}
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <FaClock className="mr-1" />
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {!log.resolved && (
                    <button
                      onClick={() => markErrorResolved(log._id)}
                      className="btn btn-sm btn-outline"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
                {log.stack && (
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-x-auto">
                    {log.stack}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 