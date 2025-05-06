'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import React, { useRef } from 'react';

interface Global {
  _id: string;
  type: 'formField' | 'court' | 'caseType' | 'template';
  key: string;
  label: string;
  category: 'fieldDefinition' | 'referenceObject';
  value: any;
  createdAt: string;
  updatedAt: string;
}

interface FieldDefinitionForm {
  fieldType: string;
  required: boolean;
  repeatable?: boolean;
  placeholder: string;
  options: string[];
}

// Add the core categories as a constant array
const CORE_CATEGORIES = [
  'Party Info',
  'Attorney Info',
  'Court Info',
  'Case Info',
  'Document Meta',
  'Motion/Argument Sections',
  'Family & Relationship Info',
  'Address & Contact Info',
  'Employment Info',
  'Health & Insurance Info',
  'Property Info',
  'Probate & Estate Info',
  'Criminal Info (optional)',
  'Discovery & Evidence Info',
  'Form-Specific Variables',
];

export default function GlobalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [globals, setGlobals] = useState<Global[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingGlobal, setEditingGlobal] = useState<Global | null>(null);
  const [formData, setFormData] = useState<{
    type: Global['type'];
    key: string;
    label: string;
    category: Global['category'];
    coreCategory: string;
    value: FieldDefinitionForm | Record<string, any>;
  }>({
    type: 'formField',
    key: '',
    label: '',
    category: 'fieldDefinition',
    coreCategory: '',
    value: {
      fieldType: 'text',
      required: true,
      placeholder: '',
      options: []
    }
  });
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkJson, setBulkJson] = useState('');
  const [importResults, setImportResults] = useState<{key: string, status: string, error?: string}[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [duplicateModal, setDuplicateModal] = useState<null | {
    duplicates: any[];
    newVars: any[];
    actions: Record<string, 'replace' | 'keep'>;
    applyToAll: '' | 'replace' | 'keep';
    onConfirm: (actions: Record<string, 'replace' | 'keep'>) => void;
  }>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role !== 'superadmin') {
      router.push('/dashboard');
    } else {
      fetchGlobals();
    }
  }, [session, status, router]);

  const fetchGlobals = async () => {
    try {
      const response = await fetch('/api/globals');
      if (!response.ok) throw new Error('Failed to fetch globals');
      const data = await response.json();
      setGlobals(data.globals || []);
    } catch (error) {
      console.error('Error fetching globals:', error);
      toast.error('Failed to load globals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/globals';
      const method = editingGlobal ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          _id: editingGlobal?._id
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save global variable');
      }

      toast.success(`Global variable ${editingGlobal ? 'updated' : 'created'} successfully`);
      setFormData({
        type: 'formField',
        key: '',
        label: '',
        category: 'fieldDefinition',
        coreCategory: '',
        value: {
          fieldType: 'text',
          required: true,
          placeholder: '',
          options: []
        }
      });
      setEditingGlobal(null);
      fetchGlobals();
    } catch (error) {
      console.error('Error saving global variable:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save global variable');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this global variable?')) return;

    try {
      const response = await fetch(`/api/globals/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete global variable');
      }

      toast.success('Global variable deleted successfully');
      fetchGlobals();
    } catch (error) {
      console.error('Error deleting global variable:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete global variable');
    }
  };

  const handleEdit = (global: Global) => {
    setEditingGlobal(global);
    setFormData({
      type: global.type,
      key: global.key,
      label: global.label,
      category: global.category,
      coreCategory: (global as any).coreCategory || '',
      value: global.value
    });
  };

  // Helper to check for duplicates by key
  const checkDuplicates = (importVars: any[], existingVars: any[]) => {
    const existingKeys = new Set(existingVars.map(v => v.key));
    const duplicates = importVars.filter(v => existingKeys.has(v.key));
    const newVars = importVars.filter(v => !existingKeys.has(v.key));
    return { duplicates, newVars };
  };

  const handleBulkImport = async () => {
    setImportResults([]);
    let parsed: any[] = [];
    try {
      parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error('JSON must be an array');
    } catch (e) {
      toast.error('Invalid JSON');
      return;
    }
    // Fetch current globals to check for duplicates
    const res = await fetch('/api/globals');
    const data = await res.json();
    const { duplicates, newVars } = checkDuplicates(parsed, data.globals || []);
    if (duplicates.length > 0) {
      setDuplicateModal({
        duplicates,
        newVars,
        actions: Object.fromEntries(duplicates.map(d => [d.key, 'replace'])),
        applyToAll: '',
        onConfirm: async (actions) => {
          setDuplicateModal(null);
          await doBulkImport(newVars, duplicates, actions);
        }
      });
      return;
    }
    await doBulkImport(newVars, [], {});
  };

  // Actually perform the import (newVars: no duplicates, duplicates: with user actions)
  const doBulkImport = async (newVars: any[], duplicates: any[], actions: Record<string, 'replace' | 'keep'>) => {
    const results: {key: string, status: string, error?: string}[] = [];
    // Import new variables
    for (const variable of newVars) {
      try {
        const response = await fetch('/api/globals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(variable),
        });
        if (!response.ok) {
          const data = await response.json();
          results.push({ key: variable.key, status: 'error', error: data.error || 'Failed' });
        } else {
          results.push({ key: variable.key, status: 'success' });
        }
      } catch (err) {
        results.push({ key: variable.key, status: 'error', error: (err as Error).message });
      }
    }
    // Handle duplicates
    for (const variable of duplicates) {
      if (actions[variable.key] === 'replace') {
        // Find the existing variable's _id
        const res = await fetch('/api/globals');
        const data = await res.json();
        const existing = (data.globals || []).find((g: any) => g.key === variable.key);
        if (existing) {
          try {
            const response = await fetch('/api/globals', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...variable, _id: existing._id }),
            });
            if (!response.ok) {
              const data = await response.json();
              results.push({ key: variable.key, status: 'error', error: data.error || 'Failed to update' });
            } else {
              results.push({ key: variable.key, status: 'replaced' });
            }
          } catch (err) {
            results.push({ key: variable.key, status: 'error', error: (err as Error).message });
          }
        } else {
          results.push({ key: variable.key, status: 'error', error: 'Existing variable not found' });
        }
      } else {
        results.push({ key: variable.key, status: 'kept' });
      }
    }
    setImportResults(results);
    setBulkJson('');
    fetchGlobals();
  };

  // Duplicate modal component
  const DuplicateModal = () => {
    const [actions, setActions] = useState(duplicateModal?.actions || {});
    const [applyToAll, setApplyToAll] = useState('');
    if (!duplicateModal) return null;
    const { duplicates, onConfirm } = duplicateModal;
    const handleActionChange = (key: string, action: 'replace' | 'keep') => {
      setActions(prev => ({ ...prev, [key]: action }));
    };
    const handleApplyToAll = (action: 'replace' | 'keep') => {
      setApplyToAll(action);
      setActions(Object.fromEntries(duplicates.map(d => [d.key, action])));
    };
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
          <h2 className="text-lg font-bold mb-4">Duplicate Variables Detected</h2>
          <p className="mb-2">The following variables already exist. Choose what to do for each:</p>
          <ul className="mb-4">
            {duplicates.map(d => (
              <li key={d.key} className="mb-2 flex items-center justify-between">
                <span className="font-mono">{d.key}</span>
                <div className="flex gap-2">
                  <button
                    className={`btn btn-xs ${actions[d.key]==='replace' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleActionChange(d.key, 'replace')}
                  >Replace</button>
                  <button
                    className={`btn btn-xs ${actions[d.key]==='keep' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleActionChange(d.key, 'keep')}
                  >Keep Existing</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 mb-4">
            <span>Apply to all:</span>
            <button className={`btn btn-xs ${applyToAll==='replace' ? 'btn-primary' : 'btn-outline'}`} onClick={()=>handleApplyToAll('replace')}>Replace All</button>
            <button className={`btn btn-xs ${applyToAll==='keep' ? 'btn-primary' : 'btn-outline'}`} onClick={()=>handleApplyToAll('keep')}>Keep All</button>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn btn-outline" onClick={()=>setDuplicateModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={()=>duplicateModal.onConfirm(actions)}>Continue Import</button>
          </div>
        </div>
      </div>
    );
  };

  // Filtered and searched globals
  const filteredGlobals = globals.filter((global) => {
    const matchesCategory = !categoryFilter || (global as any).coreCategory === categoryFilter;
    const searchLower = search.toLowerCase();
    const matchesSearch =
      global.key.toLowerCase().includes(searchLower) ||
      global.label.toLowerCase().includes(searchLower) ||
      ((global as any).coreCategory || '').toLowerCase().includes(searchLower) ||
      JSON.stringify(global.value).toLowerCase().includes(searchLower);
    return matchesCategory && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Global Variables Management</h1>
        <button
          className="btn btn-secondary mb-4"
          onClick={() => setShowBulkImport((v) => !v)}
        >
          {showBulkImport ? 'Close Bulk Import' : 'Bulk Import'}
        </button>
        {showBulkImport && (
          <div className="bg-gray-50 border rounded p-4 mb-6">
            <h2 className="text-lg font-semibold mb-2">Bulk Import Global Variables</h2>
            <textarea
              className="w-full p-2 border rounded mb-2 font-mono"
              rows={10}
              placeholder="Paste JSON array here"
              value={bulkJson}
              onChange={e => setBulkJson(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleBulkImport} type="button">Import</button>
            {importResults.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Import Results:</h3>
                <ul className="text-sm">
                  {importResults.map(r => (
                    <li key={r.key} className={r.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                      {r.key}: {r.status} {r.error ? `- ${r.error}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {/* Add/Edit Global Variable Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingGlobal ? 'Edit Global Variable' : 'Add New Global Variable'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Global['type'] }))}
                  className="w-full p-2 border rounded"
                  required
                  disabled={!!editingGlobal}
                >
                  <option value="formField">Form Field</option>
                  <option value="court">Court</option>
                  <option value="caseType">Case Type</option>
                  <option value="template">Template</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Global['category'] }))}
                  className="w-full p-2 border rounded"
                  required
                  disabled={!!editingGlobal}
                >
                  <option value="fieldDefinition">Field Definition</option>
                  <option value="referenceObject">Reference Object</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Core Global Variable Category</label>
                <select
                  value={formData.coreCategory}
                  onChange={(e) => setFormData(prev => ({ ...prev, coreCategory: e.target.value }))}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select a category</option>
                  {CORE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Key</label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                  className="w-full p-2 border rounded"
                  required
                  readOnly={!!editingGlobal}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Label</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>

            {formData.type === 'formField' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Field Type</label>
                  <select
                    value={(formData.value as FieldDefinitionForm).fieldType}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      value: { ...prev.value as FieldDefinitionForm, fieldType: e.target.value }
                    }))}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="text">Text</option>
                    <option value="textarea">Text Area</option>
                    <option value="select">Select</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="radio">Radio</option>
                    <option value="date">Date</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={(formData.value as FieldDefinitionForm).placeholder}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      value: { ...prev.value as FieldDefinitionForm, placeholder: e.target.value }
                    }))}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(formData.value as FieldDefinitionForm).required}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      value: { ...prev.value as FieldDefinitionForm, required: e.target.checked }
                    }))}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium">Required</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(formData.value as FieldDefinitionForm).repeatable || false}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      value: { ...prev.value as FieldDefinitionForm, repeatable: e.target.checked }
                    }))}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium">Repeatable (allow multiple entries)</label>
                </div>

                {(['select', 'radio'] as string[]).includes((formData.value as FieldDefinitionForm).fieldType) && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Options (one per line)</label>
                    <textarea
                      value={(formData.value as FieldDefinitionForm).options.join('\n')}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        value: {
                          ...prev.value as FieldDefinitionForm,
                          options: e.target.value.split('\n').filter(Boolean)
                        }
                      }))}
                      className="w-full p-2 border rounded"
                      rows={4}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              {editingGlobal && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingGlobal(null);
                    setFormData({
                      type: 'formField',
                      key: '',
                      label: '',
                      category: 'fieldDefinition',
                      coreCategory: '',
                      value: {
                        fieldType: 'text',
                        required: true,
                        placeholder: '',
                        options: []
                      }
                    });
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
              )}
              <button type="submit" className="btn btn-primary">
                {editingGlobal ? 'Update Global Variable' : 'Add Global Variable'}
              </button>
            </div>
          </form>
        </div>
        {/* Move search and filter controls here, just above the list */}
        <div className="flex flex-wrap gap-4 mb-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              className="p-2 border rounded w-64"
              placeholder="Search by key, label, value..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Filter by Category</label>
            <select
              className="p-2 border rounded"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {CORE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        {/* Global Variables List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Global Variables</h2>
            <div className="space-y-2">
              {filteredGlobals.length === 0 && (
                <div className="text-gray-500">No variables found.</div>
              )}
              {filteredGlobals.map((global) => {
                const isExpanded = expanded === global._id;
                return (
                  <div key={global._id} className="border rounded p-4 bg-gray-50">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpanded(isExpanded ? null : global._id)}>
                      <div>
                        <span className="font-semibold">{global.label}</span> <span className="text-xs text-gray-500">({global.key})</span>
                        <span className="ml-2 text-sm text-gray-600">{global.type} | {(global as any).coreCategory || ''}</span>
                      </div>
                      <button className="btn btn-xs btn-outline">{isExpanded ? 'Collapse' : 'Expand'}</button>
                    </div>
                    {isExpanded && (
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-gray-600 text-sm">Category: {global.category} | <span className="font-semibold">{(global as any).coreCategory || ''}</span></div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(global)}
                              className="text-blue-500 hover:text-blue-600"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDelete(global._id)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                        <pre className="text-sm text-gray-600 bg-white p-2 rounded border overflow-x-auto">
                          {JSON.stringify(global.value, null, 2)}
                        </pre>
                        <div className="text-xs text-gray-400 mt-2">Created: {new Date(global.createdAt).toLocaleString()} | Updated: {new Date(global.updatedAt).toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {duplicateModal && <DuplicateModal />}
      </div>
    </div>
  );
} 