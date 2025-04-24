'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FaPlus, FaSearch, FaFilter } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import CaseCreationWizard from '@/components/CaseCreationWizard';

interface Case {
  id: string;
  title: string;
  status: 'active' | 'closed' | 'pending';
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export default function CasesPage() {
  const { data: session } = useSession();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const response = await fetch('/api/cases');
      if (!response.ok) {
        throw new Error('Failed to fetch cases');
      }
      const data = await response.json();
      setCases(data);
    } catch (error) {
      console.error('Error fetching cases:', error);
      toast.error('Failed to load cases');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCases = cases.filter(case_ => {
    const matchesSearch = case_.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         case_.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || case_.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cases</h1>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="btn btn-primary"
        >
          <FaPlus className="mr-2" />
          Add Case
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input input-bordered w-full pl-10"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FaFilter className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="select select-bordered"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((case_) => (
                <tr key={case_.id} className="hover:bg-gray-50">
                  <td className="font-medium">{case_.title}</td>
                  <td>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusClass(case_.status)}`}>
                      {case_.status}
                    </span>
                  </td>
                  <td>{new Date(case_.createdAt).toLocaleDateString()}</td>
                  <td>{new Date(case_.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {/* TODO: Implement view case */}}
                        className="btn btn-sm btn-ghost"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {/* TODO: Implement edit case */}}
                        className="btn btn-sm btn-ghost"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CaseCreationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCaseCreated={fetchCases}
      />
    </div>
  );
} 