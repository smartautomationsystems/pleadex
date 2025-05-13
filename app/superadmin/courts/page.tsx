'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { US_STATES } from '@/libs/states';
import { getCountiesForState } from '@/libs/counties';
import React from 'react';

interface Court {
  _id: string;
  name: string;
  jurisdiction: 'state' | 'federal';
  state?: string;
  county?: string;
  address: string;
  phone: string;
  website?: string;
  departments: Array<{
    number: string;
    name: string;
    phone?: string;
  }>;
  judges: Array<{
    name: string;
    title: string;
    department: string;
    phone?: string;
  }>;
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
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportJson, setBulkImportJson] = useState('');
  const [bulkImportError, setBulkImportError] = useState('');
  const [expandedCourts, setExpandedCourts] = useState<Set<string>>(new Set());
  const [editingDepartment, setEditingDepartment] = useState<{ index: number; data: Court['departments'][0] } | null>(null);
  const [editingJudge, setEditingJudge] = useState<{ index: number; data: Court['judges'][0] } | null>(null);
  const [newDepartment, setNewDepartment] = useState<Court['departments'][0]>({ number: '', name: '', phone: '' });
  const [newJudge, setNewJudge] = useState<Court['judges'][0]>({ name: '', title: '', department: '', phone: '' });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courts?${queryParams.toString()}`);
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

  const handleBulkImport = async () => {
    setBulkImportError('');
    if (!editingCourt) return;
    let data;
    try {
      data = JSON.parse(bulkImportJson);
      if (!Array.isArray(data.departments)) throw new Error('JSON must have a departments array');
    } catch (e: any) {
      setBulkImportError(e.message);
      return;
    }
    // Use the correct endpoint for bulk import
    try {
      const response = await fetch('/api/courts/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId: editingCourt._id, departments: data.departments }),
      });
      if (!response.ok) throw new Error('Bulk import failed');
      toast.success('Departments imported successfully');
      setShowBulkImport(false);
      setBulkImportJson('');
      setEditingCourt(null);
      fetchCourts();
    } catch (e: any) {
      setBulkImportError(e.message);
    }
  };

  const toggleCourtExpansion = (courtId: string) => {
    setExpandedCourts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courtId)) {
        newSet.delete(courtId);
      } else {
        newSet.add(courtId);
      }
      return newSet;
    });
  };

  const handleAddDepartment = () => {
    if (!editingCourt) return;
    const updatedCourt = {
      ...editingCourt,
      departments: [...(editingCourt.departments || []), newDepartment]
    };
    setEditingCourt(updatedCourt);
    setNewDepartment({ number: '', name: '', phone: '' });
  };

  const handleAddJudge = () => {
    if (!editingCourt) return;
    const updatedCourt = {
      ...editingCourt,
      judges: [...(editingCourt.judges || []), newJudge]
    };
    setEditingCourt(updatedCourt);
    setNewJudge({ name: '', title: '', department: '', phone: '' });
  };

  const handleUpdateDepartment = (index: number) => {
    if (!editingCourt || !editingDepartment) return;
    const updatedDepartments = [...editingCourt.departments];
    updatedDepartments[index] = editingDepartment.data;
    setEditingCourt({
      ...editingCourt,
      departments: updatedDepartments
    });
    setEditingDepartment(null);
  };

  const handleUpdateJudge = (index: number) => {
    if (!editingCourt || !editingJudge) return;
    const updatedJudges = [...editingCourt.judges];
    updatedJudges[index] = editingJudge.data;
    setEditingCourt({
      ...editingCourt,
      judges: updatedJudges
    });
    setEditingJudge(null);
  };

  const handleRemoveDepartment = (index: number) => {
    if (!editingCourt) return;
    const updatedDepartments = editingCourt.departments.filter((_, i) => i !== index);
    setEditingCourt({
      ...editingCourt,
      departments: updatedDepartments
    });
  };

  const handleRemoveJudge = (index: number) => {
    if (!editingCourt) return;
    const updatedJudges = editingCourt.judges.filter((_, i) => i !== index);
    setEditingCourt({
      ...editingCourt,
      judges: updatedJudges
    });
  };

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
                        headers: {
                          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_INTERNAL_API_KEY}`
                        },
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
        {editingCourt && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Court ID</label>
            <input
              type="text"
              value={editingCourt._id}
              readOnly
              className="w-full p-2 border rounded bg-gray-100 text-xs text-gray-700 cursor-pointer select-all"
              onFocus={e => e.target.select()}
            />
          </div>
        )}
        {showBulkImport ? (
          <div>
            <label className="block text-sm font-medium mb-1">Bulk Import Departments/ Judges (JSON)</label>
            <textarea
              className="w-full p-2 border rounded h-64 font-mono"
              value={bulkImportJson}
              onChange={e => setBulkImportJson(e.target.value)}
              placeholder='{"departments": [{"number": "1", "name": "Dept 1", "judges": [{"name": "Judge 1", "title": "Judge", "department": "1"}]}]}'
            />
            {bulkImportError && <div className="text-red-600 mt-2">{bulkImportError}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                onClick={() => { setShowBulkImport(false); setBulkImportJson(''); setBulkImportError(''); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={handleBulkImport}
              >
                Import
              </button>
            </div>
          </div>
        ) : (
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

          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Departments and Judges</h3>
            
            {/* Departments Section */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Departments</h4>
              <div className="grid grid-cols-1 gap-4">
                {editingCourt?.departments?.map((dept, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded border">
                    {editingDepartment?.index === index ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingDepartment.data.number}
                          onChange={(e) => setEditingDepartment(prev => ({ ...prev!, data: { ...prev!.data, number: e.target.value } }))}
                          placeholder="Department Number"
                          className="w-full p-2 border rounded"
                        />
                        <input
                          type="text"
                          value={editingDepartment.data.name}
                          onChange={(e) => setEditingDepartment(prev => ({ ...prev!, data: { ...prev!.data, name: e.target.value } }))}
                          placeholder="Department Name"
                          className="w-full p-2 border rounded"
                        />
                        <input
                          type="text"
                          value={editingDepartment.data.phone || ''}
                          onChange={(e) => setEditingDepartment(prev => ({ ...prev!, data: { ...prev!.data, phone: e.target.value } }))}
                          placeholder="Phone (optional)"
                          className="w-full p-2 border rounded"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingDepartment(null)}
                            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateDepartment(index)}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{dept.number} - {dept.name}</div>
                          {dept.phone && <div className="text-sm text-gray-600">Phone: {dept.phone}</div>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingDepartment({ index, data: { ...dept } })}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FaEdit />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDepartment(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Add New Department Form */}
                <div className="p-3 bg-gray-50 rounded border">
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newDepartment.number}
                      onChange={(e) => setNewDepartment(prev => ({ ...prev, number: e.target.value }))}
                      placeholder="Department Number"
                      className="w-full p-2 border rounded"
                    />
                    <input
                      type="text"
                      value={newDepartment.name}
                      onChange={(e) => setNewDepartment(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Department Name"
                      className="w-full p-2 border rounded"
                    />
                    <input
                      type="text"
                      value={newDepartment.phone || ''}
                      onChange={(e) => setNewDepartment(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone (optional)"
                      className="w-full p-2 border rounded"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddDepartment}
                        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Add Department
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Judges Section */}
            <div>
              <h4 className="font-medium mb-2">Judges</h4>
              <div className="grid grid-cols-1 gap-4">
                {editingCourt?.judges?.map((judge, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded border">
                    {editingJudge?.index === index ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingJudge.data.name}
                          onChange={(e) => setEditingJudge(prev => ({ ...prev!, data: { ...prev!.data, name: e.target.value } }))}
                          placeholder="Judge Name"
                          className="w-full p-2 border rounded"
                        />
                        <input
                          type="text"
                          value={editingJudge.data.title}
                          onChange={(e) => setEditingJudge(prev => ({ ...prev!, data: { ...prev!.data, title: e.target.value } }))}
                          placeholder="Title"
                          className="w-full p-2 border rounded"
                        />
                        <select
                          value={editingJudge.data.department}
                          onChange={(e) => setEditingJudge(prev => ({ ...prev!, data: { ...prev!.data, department: e.target.value } }))}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">Select Department</option>
                          {editingCourt.departments?.map((dept, i) => (
                            <option key={i} value={dept.number}>{dept.number} - {dept.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editingJudge.data.phone || ''}
                          onChange={(e) => setEditingJudge(prev => ({ ...prev!, data: { ...prev!.data, phone: e.target.value } }))}
                          placeholder="Phone (optional)"
                          className="w-full p-2 border rounded"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingJudge(null)}
                            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateJudge(index)}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{judge.name}</div>
                          <div className="text-sm text-gray-600">
                            {judge.title} • Department {judge.department}
                            {judge.phone && <span> • Phone: {judge.phone}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingJudge({ index, data: { ...judge } })}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FaEdit />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveJudge(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Add New Judge Form */}
                <div className="p-3 bg-gray-50 rounded border">
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newJudge.name}
                      onChange={(e) => setNewJudge(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Judge Name"
                      className="w-full p-2 border rounded"
                    />
                    <input
                      type="text"
                      value={newJudge.title}
                      onChange={(e) => setNewJudge(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Title"
                      className="w-full p-2 border rounded"
                    />
                    <select
                      value={newJudge.department}
                      onChange={(e) => setNewJudge(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select Department</option>
                      {editingCourt?.departments?.map((dept, i) => (
                        <option key={i} value={dept.number}>{dept.number} - {dept.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newJudge.phone || ''}
                      onChange={(e) => setNewJudge(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone (optional)"
                      className="w-full p-2 border rounded"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddJudge}
                        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Add Judge
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {editingCourt && (
              <button
                type="button"
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                onClick={() => setShowBulkImport(true)}
              >
                Bulk Import Departments
              </button>
            )}
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {editingCourt ? 'Update' : 'Create'} Court
            </button>
          </div>
        </form>
        )}
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
                        onClick={() => toggleCourtExpansion(court._id)}
                        className="text-gray-600 hover:text-gray-800"
                        title={expandedCourts.has(court._id) ? "Hide details" : "Show details"}
                      >
                        {expandedCourts.has(court._id) ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
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
                  {expandedCourts.has(court._id) && (
                    <div className="mt-4 pt-4 border-t">
                      {court.judges?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Judges</h4>
                          <div className="grid grid-cols-1 gap-2">
                            {court.judges.map((judge, index) => (
                              <div key={index} className="p-2 bg-gray-50 rounded">
                                <div className="font-medium">{judge.name}</div>
                                <div className="text-sm text-gray-600">
                                  {judge.title} • Department {judge.department}
                                  {judge.phone && <span> • Phone: {judge.phone}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 