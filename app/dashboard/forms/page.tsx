'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { FaUpload, FaFile, FaTrash, FaDownload, FaList, FaThLarge, FaEye } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface Form {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fields: any[] | null;
  description?: string;
}

export default function FormsPage() {
  const { data: session } = useSession();
  const [forms, setForms] = useState<Form[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [currentForm, setCurrentForm] = useState<{ url: string; fields: any[] | null } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [formViewMode, setFormViewMode] = useState<'image' | 'fields'>('image');
  const [isPolling, setIsPolling] = useState(false);
  const [systemForms, setSystemForms] = useState<Form[]>([]);
  const [systemFormSearch, setSystemFormSearch] = useState('');
  const [selectedSystemFormId, setSelectedSystemFormId] = useState<string | null>(null);

  const fetchForms = useCallback(async () => {
    try {
      const response = await fetch('/api/forms');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch forms');
      }
      const data = await response.json();

      const newForms = data.map((form: any) => ({
        id: form._id.toString(),
        name: form.name,
        type: form.type,
        size: form.size,
        uploadedAt: form.uploadedAt || form.createdAt,
        status: form.status || 'pending',
        fields: form.fields || null,
      }));

      setForms(newForms);
    } catch (error: any) {
      console.error('Error fetching forms:', error);
      toast.error(error.message || 'Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchForms();
    }
  }, [session, fetchForms]);

  useEffect(() => {
    const hasProcessingForms = forms.some((form) => form.status === 'processing');

    if (!hasProcessingForms) {
      if (isPolling) setIsPolling(false);
      return;
    }

    if (!isPolling) setIsPolling(true);

    const interval = setInterval(() => {
      fetchForms();
    }, 2000);

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [forms, isPolling, fetchForms]);

  useEffect(() => {
    const fetchSystemForms = async () => {
      try {
        const response = await fetch('/api/forms?system=1');
        if (!response.ok) throw new Error('Failed to fetch system forms');
        const data = await response.json();
        const sysForms = data.filter((form: any) => !form.userId || form.userId === 'superadmin');
        setSystemForms(sysForms.map((form: any) => ({
          id: form._id.toString(),
          name: form.name,
          type: form.type,
          size: form.size,
          uploadedAt: form.uploadedAt || form.createdAt,
          status: form.status || 'completed',
          fields: form.fields || null,
          description: form.description || '',
        })));
      } catch (error) {
        toast.error('Failed to load system forms');
      }
    };
    fetchSystemForms();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/forms/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      toast.success('Form uploaded successfully');
      await fetchForms();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload form');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (formId: string) => {
    setFormToDelete(formId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!formToDelete) return;

    try {
      const response = await fetch(`/api/forms?id=${formToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete form');
      }

      toast.success('Form deleted successfully');
      fetchForms();
    } catch (error) {
      console.error('Error deleting form:', error);
      toast.error('Failed to delete form');
    } finally {
      setDeleteModalOpen(false);
      setFormToDelete(null);
    }
  };

  const handleDownload = async (formId: string) => {
    try {
      window.open(`/api/forms/download?id=${formId}`, '_blank');
    } catch (error: any) {
      console.error('Error downloading form:', error);
      toast.error(error.message || 'Failed to download form');
    }
  };

  const handleView = async (formId: string) => {
    try {
      const response = await fetch(`/api/forms/view?id=${formId}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Form not found.');
          return;
        }
        throw new Error('Failed to fetch form');
      }
      const data = await response.json();
      setCurrentForm(data);
      setViewModalOpen(true);
    } catch (error: any) {
      console.error('Error viewing form:', error);
      toast.error(error.message || 'Failed to view form');
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderListView = () => (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Size</th>
            <th>Status</th>
            <th>Uploaded</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {forms.map((form) => (
            <tr key={form.id}>
              <td className="flex items-center gap-2">
                <FaFile className="text-gray-500" />
                {form.name}
              </td>
              <td>{form.type}</td>
              <td>{(form.size / 1024 / 1024).toFixed(2)} MB</td>
              <td>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(form.status)}`}>
                  {form.status}
                </span>
              </td>
              <td>{new Date(form.uploadedAt).toLocaleDateString()}</td>
              <td>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(form.id)}
                    className="btn btn-sm btn-info"
                  >
                    <FaEye className="mr-1" />
                    View
                  </button>
                  <button
                    onClick={() => handleDownload(form.id)}
                    className="btn btn-sm btn-primary"
                  >
                    <FaDownload className="mr-1" />
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(form.id)}
                    className="btn btn-sm btn-error"
                  >
                    <FaTrash className="mr-1" />
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {forms.map((form) => (
        <div key={form.id} className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center mb-4">
              <FaFile className="text-2xl mr-2" />
              <h2 className="card-title text-lg">{form.name}</h2>
            </div>
            <div className="text-sm text-gray-500 mb-4">
              <p>Type: {form.type}</p>
              <p>Size: {(form.size / 1024 / 1024).toFixed(2)} MB</p>
              <p>Uploaded: {new Date(form.uploadedAt).toLocaleDateString()}</p>
              <p>Status: {form.status}</p>
            </div>
            <div className="card-actions justify-end">
              <button
                className="btn btn-sm btn-info"
                onClick={() => handleView(form.id)}
              >
                <FaEye className="mr-1" />
                View
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => handleDownload(form.id)}
              >
                <FaDownload className="mr-1" />
                Download
              </button>
              <button
                className="btn btn-sm btn-error"
                onClick={() => handleDelete(form.id)}
              >
                <FaTrash className="mr-1" />
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const filteredSystemForms = systemForms.filter(f =>
    f.name.toLowerCase().includes(systemFormSearch.toLowerCase()) ||
    (f.description?.toLowerCase() || '').includes(systemFormSearch.toLowerCase())
  );
  const selectedSystemForm = systemForms.find(f => f.id === selectedSystemFormId) || filteredSystemForms[0];

  const handleViewSystemForm = async (formId: string) => {
    try {
      const response = await fetch(`/api/forms/view?id=${formId}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Form not found.');
          return;
        }
        throw new Error('Failed to fetch form');
      }
      const data = await response.json();
      setCurrentForm(data);
      setViewModalOpen(true);
    } catch (error: any) {
      console.error('Error viewing form:', error);
      toast.error(error.message || 'Failed to view form');
    }
  };

  const handleDownloadSystemForm = (formId: string) => {
    window.open(`/api/forms/download?id=${formId}`, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">My Forms</h1>
          <div className="btn-group">
            <button
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <FaList className="mr-1" />
              List
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <FaThLarge className="mr-1" />
              Grid
            </button>
          </div>
        </div>
        <label className="btn btn-primary">
          <FaUpload className="mr-2" />
          Upload Form
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept=".pdf,.jpg,.jpeg,.png"
          />
        </label>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">System Forms</h2>
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Search System Forms</label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Search by name..."
              value={systemFormSearch}
              onChange={e => setSystemFormSearch(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Select System Form</label>
            <select
              className="input input-bordered w-full"
              value={selectedSystemFormId || (filteredSystemForms[0]?.id || '')}
              onChange={e => setSelectedSystemFormId(e.target.value)}
            >
              {filteredSystemForms.map(form => (
                <option key={form.id} value={form.id}>{form.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <button
              className="btn btn-info"
              disabled={!selectedSystemForm}
              onClick={() => selectedSystemForm && handleViewSystemForm(selectedSystemForm.id)}
            >
              <FaEye className="mr-1" /> View
            </button>
            <button
              className="btn btn-primary"
              disabled={!selectedSystemForm}
              onClick={() => selectedSystemForm && handleDownloadSystemForm(selectedSystemForm.id)}
            >
              <FaDownload className="mr-1" /> Download
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : forms.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No forms uploaded yet.</p>
        </div>
      ) : (
        viewMode === 'grid' ? renderGridView() : renderListView()
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Delete Form</h3>
            <p className="py-4">Are you sure you want to delete this form?</p>
            <div className="modal-action">
              <button className="btn" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-error" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModalOpen && currentForm && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Form Viewer</h3>
              <div className="flex gap-2">
                {currentForm.fields && (
                  <button
                    className={`btn btn-sm ${formViewMode === 'image' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setFormViewMode('image')}
                  >
                    Image
                  </button>
                )}
                {currentForm.fields && (
                  <button
                    className={`btn btn-sm ${formViewMode === 'fields' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setFormViewMode('fields')}
                  >
                    Fields
                  </button>
                )}
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setViewModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {formViewMode === 'image' ? (
                <div className="w-full h-[500px]">
                  <iframe
                    src={currentForm.url}
                    className="w-full h-full"
                    title="Form Viewer"
                  />
                </div>
              ) : (
                <div className="w-full h-[500px] overflow-auto">
                  <div className="bg-base-200 p-4 rounded-lg h-full">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(currentForm.fields, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 