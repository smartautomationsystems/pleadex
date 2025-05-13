'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import React, { useRef } from 'react';
import AddressAutocomplete, { Address } from '@/components/AddressAutocomplete';

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
  optionsType?: 'custom' | keyof typeof PREDEFINED_OPTIONS;
}

// Add predefined options
const PREDEFINED_OPTIONS = {
  'Party Type': ['Plaintiff', 'Defendant', 'Cross-Defendant', 'Cross-Plaintiff', 'Third-Party Defendant', 'Third-Party Plaintiff', 'Intervenor', 'Amicus Curiae'],
  'Gender': ['Male', 'Female', 'Other', 'Prefer not to say'],
  'Marital Status': ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'],
  'Employment Status': ['Employed', 'Unemployed', 'Self-Employed', 'Retired', 'Student'],
  'Education Level': ['High School', 'Associate Degree', 'Bachelor Degree', 'Master Degree', 'Doctorate', 'Other']
} as const;

interface Subfield {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  optionsType: 'custom' | keyof typeof PREDEFINED_OPTIONS;
  placeholder?: string;
  repeatable?: boolean;
  address?: Address;
}

// 1. Address subfields structure
const ADDRESS_SUBFIELDS = [
  { name: 'address1', label: 'Address 1', type: 'text', required: true },
  { name: 'address2', label: 'Address 2', type: 'text', required: false },
  { name: 'city', label: 'City', type: 'text', required: true },
  { name: 'state', label: 'State', type: 'text', required: true },
  { name: 'zip', label: 'Zip', type: 'text', required: true },
];

// 2. Validation regex
const PHONE_REGEX = /^\+?[0-9 .\-()]{7,20}$/;
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface CaseEventType {
  id: string;
  label: string;
  description: string;
}

export default function GlobalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [globals, setGlobals] = useState<Global[]>([]);
  const [categories, setCategories] = useState<{ _id: string; name: string; description: string }[]>([]);
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
      options: [],
      optionsType: 'custom'
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
  const [showRepeaterModal, setShowRepeaterModal] = useState(false);
  const [repeaterForm, setRepeaterForm] = useState({
    key: '',
    label: '',
    coreCategory: '',
    subfields: [
      { name: '', label: '', type: 'text', required: false, options: [], optionsType: 'custom' as const, placeholder: '', repeatable: false, address: undefined }
    ] as Subfield[]
  });
  const [isSubmittingRepeater, setIsSubmittingRepeater] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [jsonEdit, setJsonEdit] = useState<{ [id: string]: string }>({});
  const [jsonEditError, setJsonEditError] = useState<{ [id: string]: string }>({});
  const [jsonEditSaving, setJsonEditSaving] = useState<{ [id: string]: boolean }>({});
  const [editRepeaterModal, setEditRepeaterModal] = useState<null | { global: Global, form: typeof repeaterForm }> (null);
  const [caseEvents, setCaseEvents] = useState<CaseEventType[]>([]);
  const [newEventType, setNewEventType] = useState<CaseEventType>({
    id: '',
    label: '',
    description: ''
  });
  const [showEventTypeModal, setShowEventTypeModal] = useState(false);
  const [editingEventType, setEditingEventType] = useState<CaseEventType | null>(null);
  const [eventTypeForm, setEventTypeForm] = useState<CaseEventType>({
    id: '',
    label: '',
    description: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role !== 'superadmin') {
      router.push('/dashboard');
    } else {
      fetchGlobals();
      fetchCategories();
      fetchCaseEvents();
    }
  }, [session, status, router]);

  const fetchGlobals = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/globals`);
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

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/globals/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchCaseEvents = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/globals`);
      if (!response.ok) throw new Error('Failed to fetch case events');
      const data = await response.json();
      setCaseEvents(data.caseEvents || []);
    } catch (error) {
      console.error('Error fetching case events:', error);
      toast.error('Failed to load case events');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/globals`;
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
          options: [],
          optionsType: 'custom'
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
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/globals/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete global variable');
        } else {
          throw new Error('Failed to delete global variable (unexpected response)');
        }
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
    // Add new categories if needed
    const existingCategoryNames = new Set(categories.map(c => c.name));
    const newCategories = Array.from(new Set(parsed
      .map(v => v.coreCategory)
      .filter(cat => cat && !existingCategoryNames.has(cat))));
    for (const cat of newCategories) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/globals/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: cat, description: '' })
        });
      } catch (err) {
        // Ignore errors for now
      }
    }
    if (newCategories.length > 0) {
      await fetchCategories();
    }
    // Fetch current globals to check for duplicates
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/globals`);
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
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/globals`, {
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/globals`);
        const data = await res.json();
        const existing = (data.globals || []).find((g: any) => g.key === variable.key);
        if (existing) {
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/globals`, {
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

  const handleRepeaterSubfieldChange = (idx: number, field: string, value: string | boolean | string[]) => {
    setRepeaterForm(prev => ({
      ...prev,
      subfields: prev.subfields.map((subfield, i) => {
        if (i === idx) {
          if (field === 'optionsType' && typeof value === 'string') {
            const options = value === 'custom' ? [] : [...PREDEFINED_OPTIONS[value as keyof typeof PREDEFINED_OPTIONS]];
            return { ...subfield, [field]: value as keyof typeof PREDEFINED_OPTIONS | 'custom', options };
          }
          return { ...subfield, [field]: value };
        }
        return subfield;
      })
    }));
  };
  const addRepeaterSubfield = () => {
    setRepeaterForm(prev => ({ ...prev, subfields: [...prev.subfields, { name: '', label: '', type: 'text', required: false, options: [], optionsType: 'custom' as const, placeholder: '', repeatable: false, address: undefined }] }));
  };
  const removeRepeaterSubfield = (idx: number) => {
    setRepeaterForm(prev => ({ ...prev, subfields: prev.subfields.filter((_, i) => i !== idx) }));
  };
  const resetRepeaterForm = () => {
    setRepeaterForm({ 
      key: '', 
      label: '', 
      coreCategory: '', 
      subfields: [{ 
        name: '', 
        label: '', 
        type: 'text', 
        required: false, 
        options: [], 
        optionsType: 'custom' as const, 
        placeholder: '', 
        repeatable: false, 
        address: undefined
      }] 
    });
  };
  const handleRepeaterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRepeater(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/globals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'formField',
          key: repeaterForm.key,
          label: repeaterForm.label,
          category: 'fieldDefinition',
          coreCategory: repeaterForm.coreCategory,
          value: {
            fieldType: 'repeater',
            subfields: repeaterForm.subfields
          }
        })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create repeater variable');
      }
      toast.success('Repeater variable created');
      setShowRepeaterModal(false);
      resetRepeaterForm();
      fetchGlobals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create repeater variable');
    } finally {
      setIsSubmittingRepeater(false);
    }
  };

  // Handler for saving JSON edit
  const handleSaveJsonEdit = async (global: Global) => {
    setJsonEditSaving(prev => ({ ...prev, [global._id]: true }));
    setJsonEditError(prev => ({ ...prev, [global._id]: '' }));
    try {
      let newValue;
      try {
        newValue = JSON.parse(jsonEdit[global._id] || '');
      } catch (e: any) {
        setJsonEditError(prev => ({ ...prev, [global._id]: 'Invalid JSON: ' + e.message }));
        setJsonEditSaving(prev => ({ ...prev, [global._id]: false }));
        return;
      }
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/globals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...global,
          value: newValue,
          _id: global._id,
        }),
      });
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update variable');
        } else {
          throw new Error('Failed to update variable (unexpected response)');
        }
      }
      toast.success('Variable updated');
      setJsonEditSaving(prev => ({ ...prev, [global._id]: false }));
      setJsonEditError(prev => ({ ...prev, [global._id]: '' }));
      fetchGlobals();
    } catch (error: any) {
      setJsonEditError(prev => ({ ...prev, [global._id]: error.message || 'Failed to update variable' }));
      setJsonEditSaving(prev => ({ ...prev, [global._id]: false }));
    }
  };

  // Helper to open repeater edit modal
  const openEditRepeaterModal = (global: Global) => {
    setEditRepeaterModal({
      global,
      form: {
        key: global.key,
        label: global.label,
        coreCategory: (global as any).coreCategory || '',
        subfields: global.value.subfields || []
      }
    });
  };

  // Handler for saving repeater edits
  const handleSaveEditRepeater = async () => {
    if (!editRepeaterModal) return;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/globals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editRepeaterModal.global,
          key: editRepeaterModal.form.key,
          label: editRepeaterModal.form.label,
          coreCategory: editRepeaterModal.form.coreCategory,
          value: {
            fieldType: 'repeater',
            subfields: editRepeaterModal.form.subfields
          },
          _id: editRepeaterModal.global._id,
        }),
      });
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update variable');
        } else {
          throw new Error('Failed to update variable (unexpected response)');
        }
      }
      toast.success('Repeater variable updated');
      setEditRepeaterModal(null);
      fetchGlobals();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update variable');
    }
  };

  const handleAddEventType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/globals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'caseEvent',
          key: newEventType.id,
          label: newEventType.label,
          value: {
            description: newEventType.description
          },
          category: 'referenceObject'
        }),
      });

      if (!response.ok) throw new Error('Failed to add event type');

      toast.success('Event type added successfully');
      setNewEventType({ id: '', label: '', description: '' });
      fetchGlobals();
    } catch (error) {
      console.error('Error adding event type:', error);
      toast.error('Failed to add event type');
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Global Variables Management</h1>
        <div className="flex gap-2 mb-4">
          <button
            className="btn btn-secondary"
            onClick={() => setShowBulkImport((v) => !v)}
          >
            {showBulkImport ? 'Close Bulk Import' : 'Bulk Import'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowRepeaterModal(true)}
          >
            <FaPlus className="inline mr-1" /> Create Repeater Variable
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingEventType(null);
              setEventTypeForm({ id: '', label: '', description: '' });
              setShowEventTypeModal(true);
            }}
          >
            <FaPlus className="inline mr-1" /> Add Case Event Type
          </button>
        </div>
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
        {showRepeaterModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
            style={{ resize: 'both', overflow: 'auto', minWidth: 400, minHeight: 400 }}
          >
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl w-full relative">
              <button className="absolute top-2 right-2 btn btn-xs btn-circle btn-ghost" onClick={() => { setShowRepeaterModal(false); resetRepeaterForm(); }}>✕</button>
              <h2 className="text-lg font-bold mb-4">Create Repeater Variable</h2>
              <form onSubmit={handleRepeaterSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Key (array variable name)</label>
                  <input type="text" className="w-full p-2 border rounded" value={repeaterForm.key} onChange={e => setRepeaterForm(prev => ({ ...prev, key: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Label</label>
                  <input type="text" className="w-full p-2 border rounded" value={repeaterForm.label} onChange={e => setRepeaterForm(prev => ({ ...prev, label: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Core Global Variable Category</label>
                  <select className="w-full p-2 border rounded" value={repeaterForm.coreCategory} onChange={e => setRepeaterForm(prev => ({ ...prev, coreCategory: e.target.value }))} required>
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subfields</label>
                  <div className="space-y-2">
                    {repeaterForm.subfields.map((sf, idx) => (
                      <div key={idx} className="flex flex-col gap-2 p-2 border rounded">
                        <div className="flex gap-2 items-end">
                          <input type="text" placeholder="Name" className="p-2 border rounded w-1/4" value={sf.name} onChange={e => handleRepeaterSubfieldChange(idx, 'name', e.target.value)} required />
                          <input type="text" placeholder="Label" className="p-2 border rounded w-1/4" value={sf.label} onChange={e => handleRepeaterSubfieldChange(idx, 'label', e.target.value)} required />
                          <select className="p-2 border rounded w-1/4" value={sf.type} onChange={e => handleRepeaterSubfieldChange(idx, 'type', e.target.value)}>
                            <option value="text">Text</option>
                            <option value="textarea">Text Area</option>
                            <option value="select">Select</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="radio">Radio</option>
                            <option value="date">Date</option>
                            <option value="phone">Phone Number</option>
                            <option value="email">Email</option>
                            <option value="address">Address</option>
                          </select>
                          <label className="flex items-center gap-1 text-xs">
                            <input type="checkbox" checked={sf.required} onChange={e => handleRepeaterSubfieldChange(idx, 'required', e.target.checked)} /> Required
                          </label>
                          {!['checkbox', 'select', 'phone', 'email', 'address'].includes(sf.type) && (
                            <input type="text" placeholder="Placeholder" className="p-2 border rounded w-1/4" value={sf.placeholder || ''} onChange={e => handleRepeaterSubfieldChange(idx, 'placeholder', e.target.value)} />
                          )}
                          <label className="flex items-center gap-1 text-xs">
                            <input type="checkbox" checked={sf.repeatable || false} onChange={e => handleRepeaterSubfieldChange(idx, 'repeatable', e.target.checked)} /> Repeatable
                          </label>
                          {repeaterForm.subfields.length > 1 && (
                            <button type="button" className="btn btn-xs btn-error" onClick={() => removeRepeaterSubfield(idx)}>Remove</button>
                          )}
                        </div>
                        {sf.type === 'select' && (
                          <div className="mt-2">
                            <label className="block text-sm font-medium mb-1">Options Source</label>
                            <select 
                              className="select select-bordered w-full" 
                              value={sf.optionsType}
                              onChange={e => handleRepeaterSubfieldChange(idx, 'optionsType', e.target.value)}
                            >
                              <option value="custom">Custom Options</option>
                              {Object.keys(PREDEFINED_OPTIONS).map((key) => (
                                <option key={key} value={key}>{key}</option>
                              ))}
                            </select>
                            {sf.optionsType === 'custom' && (
                              <div className="mt-2">
                                <label className="block text-sm font-medium mb-1">Custom Options (one per line)</label>
                                <textarea
                                  className="w-full p-2 border rounded"
                                  rows={4}
                                  value={sf.options.join('\n')}
                                  onChange={e => handleRepeaterSubfieldChange(idx, 'options', e.target.value.split('\n').filter(Boolean))}
                                  placeholder="Enter options, one per line"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    <button type="button" className="btn btn-xs btn-outline mt-2" onClick={addRepeaterSubfield}>+ Add Subfield</button>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn btn-outline" onClick={() => { setShowRepeaterModal(false); resetRepeaterForm(); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmittingRepeater}>{isSubmittingRepeater ? 'Saving...' : 'Create Repeater Variable'}</button>
                </div>
              </form>
            </div>
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
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.name}>{cat.name}</option>
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
                    <option value="phone">Phone Number</option>
                    <option value="email">Email</option>
                    <option value="address">Address</option>
                  </select>
                </div>

                {!['checkbox', 'select', 'phone', 'email', 'address'].includes((formData.value as FieldDefinitionForm).fieldType) && (
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
                )}

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
                    <label className="block text-sm font-medium mb-1">Options Source</label>
                    <select
                      className="w-full p-2 border rounded mb-2"
                      value={(formData.value as FieldDefinitionForm).optionsType || 'custom'}
                      onChange={e => {
                        const value = e.target.value as 'custom' | keyof typeof PREDEFINED_OPTIONS;
                        setFormData(prev => {
                          let options: string[] = [];
                          if (value === 'custom') {
                            options = (prev.value as FieldDefinitionForm).options || [];
                          } else {
                            options = [...PREDEFINED_OPTIONS[value]];
                          }
                          return {
                            ...prev,
                            value: {
                              ...(prev.value as FieldDefinitionForm),
                              optionsType: value,
                              options,
                            }
                          };
                        });
                      }}
                    >
                      <option value="custom">Custom Options</option>
                      {Object.keys(PREDEFINED_OPTIONS).map((key) => (
                        <option key={key} value={key}>{key}</option>
                      ))}
                    </select>
                    {((formData.value as FieldDefinitionForm).optionsType || 'custom') === 'custom' && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium mb-1">Custom Options (one per line)</label>
                        <textarea
                          value={(formData.value as FieldDefinitionForm).options.join('\n')}
                          onChange={e => setFormData(prev => ({
                            ...prev,
                            value: {
                              ...(prev.value as FieldDefinitionForm),
                              options: e.target.value.split('\n').filter(Boolean)
                            }
                          }))}
                          className="w-full p-2 border rounded"
                          rows={4}
                          placeholder="Enter options, one per line"
                        />
                      </div>
                    )}
                  </div>
                )}

                {// 3. In the main variable form, if fieldType is 'address', show address subfields (read-only)
                (formData.value as FieldDefinitionForm).fieldType === 'address' && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <AddressAutocomplete
                      value={{
                        street: (formData.value as any).street || '',
                        city: (formData.value as any).city || '',
                        state: (formData.value as any).state || '',
                        zip: (formData.value as any).zip || '',
                      }}
                      onChange={(address: Address) => setFormData(prev => ({
                        ...prev,
                        value: {
                          ...(prev.value as FieldDefinitionForm),
                          street: address.street,
                          city: address.city,
                          state: address.state,
                          zip: address.zip,
                        }
                      }))}
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
                        options: [],
                        optionsType: 'custom'
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
              {categories.map(cat => (
                <option key={cat._id} value={cat.name}>{cat.name}</option>
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
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => {
                      if (global.value && global.value.fieldType === 'repeater') {
                        openEditRepeaterModal(global);
                      } else {
                        setExpanded(isExpanded ? null : global._id);
                      }
                    }}>
                      <div>
                        <span className="font-semibold">{global.label}</span> <span className="text-xs text-gray-500">({global.key})</span>
                        <span className="ml-2 text-sm text-gray-600">{global.type} | {(global as any).coreCategory || ''}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); handleEdit(global); }}
                          className="text-blue-500 hover:text-blue-600"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setPendingDeleteId(global._id); }}
                          className="text-red-500 hover:text-red-600"
                        >
                          <FaTrash />
                        </button>
                        <button className="btn btn-xs btn-outline">{isExpanded ? 'Collapse' : 'Expand'}</button>
                      </div>
                    </div>
                    {isExpanded && global.value && global.value.fieldType !== 'repeater' && (
                      <div className="mt-4">
                        <div className="text-gray-600 text-sm">Category: {global.category} | <span className="font-semibold">{(global as any).coreCategory || ''}</span></div>
                        <label className="block text-xs font-semibold mb-1 mt-2">Edit JSON Value</label>
                        <textarea
                          className="w-full font-mono p-2 border rounded bg-white text-xs"
                          rows={8}
                          value={jsonEdit[global._id] ?? JSON.stringify(global.value, null, 2)}
                          onChange={e => setJsonEdit(prev => ({ ...prev, [global._id]: e.target.value }))}
                          spellCheck={false}
                        />
                        {jsonEditError[global._id] && <div className="text-red-500 text-xs mt-1">{jsonEditError[global._id]}</div>}
                        <button
                          className="btn btn-xs btn-primary mt-2"
                          disabled={jsonEditSaving[global._id]}
                          onClick={() => handleSaveJsonEdit(global)}
                        >
                          {jsonEditSaving[global._id] ? 'Saving...' : 'Save'}
                        </button>
                        <pre className="text-sm text-gray-600 bg-white p-2 rounded border overflow-x-auto mt-2">
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
        {pendingDeleteId && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
              <h2 className="text-lg font-bold mb-4">Delete Variable</h2>
              <p className="mb-4">Are you sure you want to delete this global variable? This action cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <button className="btn btn-outline" onClick={() => setPendingDeleteId(null)}>Cancel</button>
                <button className="btn btn-error" onClick={() => { handleDelete(pendingDeleteId); setPendingDeleteId(null); }}>Delete</button>
              </div>
            </div>
          </div>
        )}
        {editRepeaterModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
            style={{ resize: 'both', overflow: 'auto', minWidth: 400, minHeight: 400 }}
          >
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-3xl w-full relative">
              <button className="absolute top-2 right-2 btn btn-xs btn-circle btn-ghost" onClick={() => setEditRepeaterModal(null)}>✕</button>
              <h2 className="text-lg font-bold mb-4">Edit Repeater Variable</h2>
              <form onSubmit={e => { e.preventDefault(); handleSaveEditRepeater(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Key (array variable name)</label>
                  <input type="text" className="w-full p-2 border rounded" value={editRepeaterModal.form.key} onChange={e => setEditRepeaterModal(modal => modal && { ...modal, form: { ...modal.form, key: e.target.value } })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Label</label>
                  <input type="text" className="w-full p-2 border rounded" value={editRepeaterModal.form.label} onChange={e => setEditRepeaterModal(modal => modal && { ...modal, form: { ...modal.form, label: e.target.value } })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Core Global Variable Category</label>
                  <select className="w-full p-2 border rounded" value={editRepeaterModal.form.coreCategory} onChange={e => setEditRepeaterModal(modal => modal && { ...modal, form: { ...modal.form, coreCategory: e.target.value } })} required>
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subfields</label>
                  <div className="space-y-2">
                    {editRepeaterModal.form.subfields.map((sf, idx) => (
                      <div key={idx} className="flex flex-col gap-2 p-2 border rounded">
                        <div className="flex gap-2 items-end">
                          <input type="text" placeholder="Name" className="p-2 border rounded w-1/4" value={sf.name} onChange={e => setEditRepeaterModal(modal => modal && { ...modal, form: { ...modal.form, subfields: modal.form.subfields.map((s, i) => i === idx ? { ...s, name: e.target.value } : s) } })} required />
                          <input type="text" placeholder="Label" className="p-2 border rounded w-1/4" value={sf.label} onChange={e => setEditRepeaterModal(modal => modal && { ...modal, form: { ...modal.form, subfields: modal.form.subfields.map((s, i) => i === idx ? { ...s, label: e.target.value } : s) } })} required />
                          <select className="p-2 border rounded w-1/4" value={sf.type} onChange={e => setEditRepeaterModal(modal => modal && { ...modal, form: { ...modal.form, subfields: modal.form.subfields.map((s, i) => i === idx ? { ...s, type: e.target.value } : s) } })}>
                            <option value="text">Text</option>
                            <option value="textarea">Text Area</option>
                            <option value="select">Select</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="radio">Radio</option>
                            <option value="date">Date</option>
                            <option value="phone">Phone Number</option>
                            <option value="email">Email</option>
                            <option value="address">Address</option>
                          </select>
                          <label className="flex items-center gap-1 text-xs">
                            <input type="checkbox" checked={sf.required} onChange={e => setEditRepeaterModal(modal => modal && { ...modal, form: { ...modal.form, subfields: modal.form.subfields.map((s, i) => i === idx ? { ...s, required: e.target.checked } : s) } })} /> Required
                          </label>
                          {!['checkbox', 'select', 'phone', 'email', 'address'].includes(sf.type) && (
                            <input type="text" placeholder="Placeholder" className="p-2 border rounded w-1/4" value={sf.placeholder || ''} onChange={e => setEditRepeaterModal(modal => modal && { ...modal, form: { ...modal.form, subfields: modal.form.subfields.map((s, i) => i === idx ? { ...s, placeholder: e.target.value } : s) } })} />
                          )}
                          <label className="flex items-center gap-1 text-xs">
                            <input type="checkbox" checked={sf.repeatable || false} onChange={e => setEditRepeaterModal(modal => modal && { ...modal, form: { ...modal.form, subfields: modal.form.subfields.map((s, i) => i === idx ? { ...s, repeatable: e.target.checked } : s) } })} /> Repeatable
                          </label>
                          {editRepeaterModal.form.subfields.length > 1 && (
                            <button type="button" className="btn btn-xs btn-error" onClick={() => setEditRepeaterModal(modal => modal && { ...modal, form: { ...modal.form, subfields: modal.form.subfields.filter((_, i) => i !== idx) } })}>Remove</button>
                          )}
                        </div>
                        {sf.type === 'address' && (
                          <div className="mt-2">
                            <label className="block text-sm font-medium mb-1">Address</label>
                            <AddressAutocomplete
                              value={sf.address || { street: '', city: '', state: '', zip: '' }}
                              onChange={(address: Address) => setEditRepeaterModal(modal => modal && {
                                ...modal,
                                form: {
                                  ...modal.form,
                                  subfields: modal.form.subfields.map((s, i) => i === idx ? {
                                    ...s,
                                    address,
                                  } : s)
                                }
                              })}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    <button type="button" className="btn btn-xs btn-outline mt-2" onClick={() => setEditRepeaterModal(modal => modal && { ...modal, form: { ...modal.form, subfields: [...modal.form.subfields, { name: '', label: '', type: 'text', required: false, options: [], optionsType: 'custom', placeholder: '', repeatable: false, address: undefined }] } })}>+ Add Subfield</button>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn btn-outline" onClick={() => setEditRepeaterModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Case Event Types Modal */}
        {showEventTypeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
              <h2 className="text-xl font-semibold mb-4">
                {editingEventType ? 'Edit Case Event Type' : 'Add Case Event Type'}
              </h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/globals`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'caseEvent',
                      key: eventTypeForm.id,
                      label: eventTypeForm.label,
                      value: {
                        description: eventTypeForm.description
                      },
                      category: 'referenceObject'
                    }),
                  });

                  if (!response.ok) throw new Error('Failed to save event type');
                  
                  toast.success('Event type saved successfully');
                  setShowEventTypeModal(false);
                  fetchGlobals();
                } catch (error) {
                  console.error('Error saving event type:', error);
                  toast.error('Failed to save event type');
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ID</label>
                  <input
                    type="text"
                    value={eventTypeForm.id}
                    onChange={(e) => setEventTypeForm(prev => ({ ...prev, id: e.target.value }))}
                    className="w-full p-2 border rounded"
                    placeholder="e.g., court_hearing"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Label</label>
                  <input
                    type="text"
                    value={eventTypeForm.label}
                    onChange={(e) => setEventTypeForm(prev => ({ ...prev, label: e.target.value }))}
                    className="w-full p-2 border rounded"
                    placeholder="e.g., Court Hearing"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={eventTypeForm.description}
                    onChange={(e) => setEventTypeForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2 border rounded"
                    placeholder="e.g., A scheduled court appearance or hearing"
                    rows={3}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEventTypeModal(false)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingEventType ? 'Update' : 'Add'} Event Type
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Case Event Types Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Case Event Types</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Label</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {globals.filter(g => g.type === 'caseEvent').map((eventType) => (
                  <tr key={eventType._id?.toString()}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{eventType.key}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{eventType.label}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{eventType.value?.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => {
                          setEditingEventType({
                            id: eventType.key,
                            label: eventType.label,
                            description: eventType.value?.description
                          });
                          setEventTypeForm({
                            id: eventType.key,
                            label: eventType.label,
                            description: eventType.value?.description
                          });
                          setShowEventTypeModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(eventType._id?.toString() || '')}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 