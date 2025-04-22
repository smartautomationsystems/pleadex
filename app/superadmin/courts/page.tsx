'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { US_STATES } from '@/libs/states';
import { getCountiesForState } from '@/libs/counties';

interface Court {
  _id: string;
  name: string;
  jurisdiction: 'state' | 'federal';
  state?: string;
  county?: string;
  address: string;
  phone: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CourtsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [formData, setFormData] = useState<Partial<Court>>({
    name: '',
    jurisdiction: 'state',
    state: '',
    county: '',
    address: '',
    phone: '',
    website: ''
  });
  const [filters, setFilters] = useState({
    jurisdiction: '',
    state: '',
    county: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/superadmin/login');
    } else if (session?.user?.role !== 'superadmin') {
      router.push('/dashboard');
    } else {
      fetchCourts();
    }
  }, [session, status, router]);

  const fetchCourts = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.jurisdiction) queryParams.append('jurisdiction', filters.jurisdiction);
      if (filters.state) queryParams.append('state', filters.state);
      if (filters.county) queryParams.append('county', filters.county);

      const response = await fetch(`/api/courts?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch courts');
      const data = await response.json();
      setCourts(data);
    } catch (error) {
      console.error('Error fetching courts:', error);
      toast.error('Failed to load courts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCourt ? '/api/courts' : '/api/courts';
      const method = editingCourt ? 'PUT' : 'POST';
      const body = editingCourt
        ? { ...formData, _id: editingCourt._id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to save court');

      toast.success(`Court ${editingCourt ? 'updated' : 'created'} successfully`);
      setFormData({
        name: '',
        jurisdiction: 'state',
        state: '',
        county: '',
        address: '',
        phone: '',
        website: ''
      });
      setEditingCourt(null);
      fetchCourts();
    } catch (error) {
      console.error('Error saving court:', error);
      toast.error('Failed to save court');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this court?')) return;

    try {
      const response = await fetch(`/api/courts?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete court');

      toast.success('Court deleted successfully');
      fetchCourts();
    } catch (error) {
      console.error('Error deleting court:', error);
      toast.error('Failed to delete court');
    }
  };

  const handleEdit = (court: Court) => {
    setEditingCourt(court);
    setFormData(court);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    fetchCourts();
  }, [filters]);

  // Get counties for the selected state
  const availableCounties = filters.state ? getCountiesForState(filters.state) : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Court Management</h1>
      
      {/* Import Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center">
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
            <a
              href="/templates/court_import_template.csv"
              download
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Download Template
            </a>
          </div>
        </div>
      </div>
      
      {/* Court Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {editingCourt ? 'Edit Court' : 'Add New Court'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Jurisdiction</label>
              <select
                value={formData.jurisdiction}
                onChange={(e) => setFormData(prev => ({ ...prev, jurisdiction: e.target.value as 'state' | 'federal' }))}
                className="w-full p-2 border rounded"
                required
              >
                <option value="state">State</option>
                <option value="federal">Federal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">State</label>
              <select
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                className="w-full p-2 border rounded"
                required={formData.jurisdiction === 'state'}
                disabled={formData.jurisdiction === 'federal'}
              >
                <option value="">Select State</option>
                {US_STATES.map(state => (
                  <option key={state.abbreviation} value={state.abbreviation}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">County</label>
              <select
                value={formData.county}
                onChange={(e) => setFormData(prev => ({ ...prev, county: e.target.value }))}
                className="w-full p-2 border rounded"
                required={formData.jurisdiction === 'state'}
                disabled={formData.jurisdiction === 'federal' || !formData.state}
              >
                <option value="">Select County</option>
                {formData.state && getCountiesForState(formData.state).map(county => (
                  <option key={county} value={county}>{county}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {editingCourt ? 'Update' : 'Create'} Court
            </button>
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>
        <div className="flex flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Jurisdiction</label>
            <select
              name="jurisdiction"
              value={filters.jurisdiction}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            >
              <option value="">All</option>
              <option value="state">State</option>
              <option value="federal">Federal</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">State</label>
            <select
              name="state"
              value={filters.state}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            >
              <option value="">All</option>
              {US_STATES.map(state => (
                <option key={state.abbreviation} value={state.abbreviation}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">County</label>
            <select
              name="county"
              value={filters.county}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
              disabled={!filters.state}
            >
              <option value="">All</option>
              {availableCounties.map(county => (
                <option key={county} value={county}>{county}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Courts List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Existing Courts</h2>
          {isLoading ? (
            <div>Loading...</div>
          ) : courts.length === 0 ? (
            <div>No courts found</div>
          ) : (
            <div className="space-y-4">
              {courts.map((court) => (
                <div
                  key={court._id}
                  className="border rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{court.name}</div>
                      <div className="text-sm text-gray-500">
                        {court.jurisdiction === 'federal' ? 'Federal Court' : `${court.county} County, ${court.state}`}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(court)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(court._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div>{court.address}</div>
                    <div>{court.phone}</div>
                    {court.website && (
                      <a
                        href={court.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {court.website}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 