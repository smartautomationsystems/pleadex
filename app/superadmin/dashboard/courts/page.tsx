'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

interface Court {
  _id: string;
  courtName: string;
  jurisdiction: 'state' | 'federal';
  courtState: string;
  courtCounty: string;
  branchName?: string;
  caseTypes: string[];
  address: string;
  mailingAddress?: string;
  departments: Department[];
  judges: Judge[];
  createdAt: string;
  updatedAt: string;
}

interface Department {
  number: string;
  name: string;
}

interface Judge {
  name: string;
  title: string;
  department: string;
}

export default function CourtManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [courts, setCourts] = useState<Court[]>([]);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [courtFormData, setCourtFormData] = useState<Partial<Court>>({
    courtName: '',
    jurisdiction: 'state',
    courtState: '',
    courtCounty: '',
    caseTypes: [],
    address: '',
    departments: [],
    judges: []
  });
  const [newDepartment, setNewDepartment] = useState<Department>({ number: '', name: '' });
  const [newJudge, setNewJudge] = useState<Judge>({ name: '', title: '', department: '' });

  useEffect(() => {
    if (status === 'unauthenticated' || session?.user?.role !== 'superadmin') {
      router.push('/superadmin/login');
    } else {
      fetchCourts();
    }
  }, [session, status, router]);

  const fetchCourts = async () => {
    try {
      const response = await fetch('/api/courts');
      if (!response.ok) throw new Error('Failed to fetch courts');
      const data = await response.json();
      setCourts(data);
    } catch (error) {
      console.error('Error fetching courts:', error);
      toast.error('Failed to load courts');
    }
  };

  const handleCourtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCourt ? '/api/courts' : '/api/courts';
      const method = editingCourt ? 'PUT' : 'POST';
      const body = editingCourt
        ? { ...courtFormData, _id: editingCourt._id }
        : courtFormData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to save court');

      toast.success(`Court ${editingCourt ? 'updated' : 'created'} successfully`);
      setCourtFormData({
        courtName: '',
        jurisdiction: 'state',
        courtState: '',
        courtCounty: '',
        caseTypes: [],
        address: '',
        departments: [],
        judges: []
      });
      setEditingCourt(null);
      fetchCourts();
    } catch (error) {
      console.error('Error saving court:', error);
      toast.error('Failed to save court');
    }
  };

  const handleAddDepartment = () => {
    if (!newDepartment.number || !newDepartment.name) return;
    setCourtFormData(prev => ({
      ...prev,
      departments: [...(prev.departments || []), newDepartment]
    }));
    setNewDepartment({ number: '', name: '' });
  };

  const handleAddJudge = () => {
    if (!newJudge.name || !newJudge.title || !newJudge.department) return;
    setCourtFormData(prev => ({
      ...prev,
      judges: [...(prev.judges || []), newJudge]
    }));
    setNewJudge({ name: '', title: '', department: '' });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Court Management</h1>
      
      {/* Import Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Import Courts</h2>
        <div className="flex items-center gap-4">
          <p className="text-gray-600">Import courts from a CSV file</p>
          <button
            type="button"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv';
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  try {
                    const formData = new FormData();
                    formData.append('file', file);
                    const response = await fetch('/api/courts/import', {
                      method: 'POST',
                      body: formData,
                      headers: {
                        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`
                      }
                    });
                    if (!response.ok) throw new Error('Failed to import courts');
                    toast.success('Courts imported successfully');
                    fetchCourts();
                  } catch (error) {
                    console.error('Error importing courts:', error);
                    toast.error('Failed to import courts');
                  }
                }
              };
              input.click();
            }}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
          >
            <FaPlus /> Import CSV
          </button>
        </div>
      </div>
      
      {/* Court Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {editingCourt ? 'Edit Court' : 'Add New Court'}
          </h2>
        </div>
        <form onSubmit={handleCourtSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Court Name</label>
              <input
                type="text"
                value={courtFormData.courtName}
                onChange={(e) => setCourtFormData(prev => ({ ...prev, courtName: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Jurisdiction</label>
              <select
                value={courtFormData.jurisdiction}
                onChange={(e) => setCourtFormData(prev => ({ ...prev, jurisdiction: e.target.value as 'state' | 'federal' }))}
                className="w-full p-2 border rounded"
                required
              >
                <option value="state">State</option>
                <option value="federal">Federal</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">State</label>
              <input
                type="text"
                value={courtFormData.courtState}
                onChange={(e) => setCourtFormData(prev => ({ ...prev, courtState: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">County</label>
              <input
                type="text"
                value={courtFormData.courtCounty}
                onChange={(e) => setCourtFormData(prev => ({ ...prev, courtCounty: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              type="text"
              value={courtFormData.address}
              onChange={(e) => setCourtFormData(prev => ({ ...prev, address: e.target.value }))}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Case Types (comma-separated)</label>
            <input
              type="text"
              value={courtFormData.caseTypes?.join(', ')}
              onChange={(e) => setCourtFormData(prev => ({ ...prev, caseTypes: e.target.value.split(',').map(t => t.trim()) }))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Departments</h3>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Department Number"
                value={newDepartment.number}
                onChange={(e) => setNewDepartment(prev => ({ ...prev, number: e.target.value }))}
                className="flex-1 p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Department Name"
                value={newDepartment.name}
                onChange={(e) => setNewDepartment(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1 p-2 border rounded"
              />
              <button
                type="button"
                onClick={handleAddDepartment}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add
              </button>
            </div>
            <div className="space-y-2">
              {courtFormData.departments?.map((dept, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span>{dept.number} - {dept.name}</span>
                  <button
                    type="button"
                    onClick={() => setCourtFormData(prev => ({
                      ...prev,
                      departments: prev.departments?.filter((_, i) => i !== index)
                    }))}
                    className="text-red-500 hover:text-red-600"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Judges</h3>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Judge Name"
                value={newJudge.name}
                onChange={(e) => setNewJudge(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1 p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Title"
                value={newJudge.title}
                onChange={(e) => setNewJudge(prev => ({ ...prev, title: e.target.value }))}
                className="flex-1 p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Department"
                value={newJudge.department}
                onChange={(e) => setNewJudge(prev => ({ ...prev, department: e.target.value }))}
                className="flex-1 p-2 border rounded"
              />
              <button
                type="button"
                onClick={handleAddJudge}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add
              </button>
            </div>
            <div className="space-y-2">
              {courtFormData.judges?.map((judge, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span>{judge.name} - {judge.title} ({judge.department})</span>
                  <button
                    type="button"
                    onClick={() => setCourtFormData(prev => ({
                      ...prev,
                      judges: prev.judges?.filter((_, i) => i !== index)
                    }))}
                    className="text-red-500 hover:text-red-600"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {editingCourt && (
              <button
                type="button"
                onClick={() => {
                  setEditingCourt(null);
                  setCourtFormData({
                    courtName: '',
                    jurisdiction: 'state',
                    courtState: '',
                    courtCounty: '',
                    caseTypes: [],
                    address: '',
                    departments: [],
                    judges: []
                  });
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {editingCourt ? 'Update Court' : 'Add Court'}
            </button>
          </div>
        </form>
      </div>

      {/* Courts List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Courts</h2>
          <div className="space-y-4">
            {courts.map((court) => (
              <div key={court._id} className="border rounded p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-medium">{court.courtName}</h3>
                    <p className="text-gray-600">
                      {court.jurisdiction} | {court.courtState}, {court.courtCounty}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingCourt(court);
                        setCourtFormData(court);
                      }}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm('Are you sure you want to delete this court?')) return;
                        try {
                          const response = await fetch(`/api/courts?id=${court._id}`, {
                            method: 'DELETE',
                          });
                          if (!response.ok) throw new Error('Failed to delete court');
                          toast.success('Court deleted successfully');
                          fetchCourts();
                        } catch (error) {
                          console.error('Error deleting court:', error);
                          toast.error('Failed to delete court');
                        }
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{court.address}</p>
                {court.caseTypes?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Case Types:</p>
                    <p className="text-sm text-gray-600">{court.caseTypes.join(', ')}</p>
                  </div>
                )}
                {court.departments?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Departments:</p>
                    <p className="text-sm text-gray-600">
                      {court.departments.map(d => `${d.number} - ${d.name}`).join(', ')}
                    </p>
                  </div>
                )}
                {court.judges?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Judges:</p>
                    <p className="text-sm text-gray-600">
                      {court.judges.map(j => `${j.name} (${j.department})`).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 