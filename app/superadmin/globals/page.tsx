'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

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
  placeholder: string;
  options: string[];
}

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
    value: FieldDefinitionForm | Record<string, any>;
  }>({
    type: 'formField',
    key: '',
    label: '',
    category: 'fieldDefinition',
    value: {
      fieldType: 'text',
      required: true,
      placeholder: '',
      options: []
    }
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/superadmin/login');
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
      const url = editingGlobal ? `/api/globals/${editingGlobal._id}` : '/api/globals';
      const method = editingGlobal ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
      value: global.value
    });
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
                >
                  <option value="fieldDefinition">Field Definition</option>
                  <option value="referenceObject">Reference Object</option>
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

        {/* Global Variables List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Global Variables</h2>
            <div className="space-y-4">
              {globals.map((global) => (
                <div key={global._id} className="border rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-medium">{global.label}</h3>
                      <p className="text-gray-600">
                        {global.type} | {global.category} | Key: {global.key}
                      </p>
                    </div>
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
                  <pre className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {JSON.stringify(global.value, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 