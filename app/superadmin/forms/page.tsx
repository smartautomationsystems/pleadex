'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaUpload, FaFile, FaDownload, FaList, FaThLarge, FaEye, FaTrash, FaEdit } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface Form {
  _id: string;
  name: string;
  description: string;
  category: string;
  fileUrl: string;
  type: string;
  size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fields: any[] | null;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

type FormViewMode = 'image' | 'fields' | 'mapping';

interface FieldMapping {
  fieldLabel: string;
  variableKey: string;
  aiSuggested: string;
  isNew: boolean;
  newVariableData: {
    key: string;
    label: string;
    type: string;
    coreCategory: string;
    options?: string[];
    required?: boolean;
  } | null;
}

interface FormField {
  id: string;
  label: string;
  type: string;
  boundingBox: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  value?: string;
  mappedVariable?: string;
}

export default function FormsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    state: 'Federal',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [currentForm, setCurrentForm] = useState<{ url: string; fields: any[] | null } | null>(null);
  const [formViewMode, setFormViewMode] = useState<FormViewMode>('image');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    description: string;
    category: string;
    file: File | null;
  }>({ name: '', description: '', category: '', file: null });
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [globals, setGlobals] = useState<any[]>([]);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [variableSearch, setVariableSearch] = useState('');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.role !== 'superadmin') {
      router.push('/');
    } else {
      fetchForms();
      fetchCategories();
    }
  }, [session, status, router]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/forms/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
      if (data.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: data[0].name }));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchForms = useCallback(async () => {
    try {
      const response = await fetch('/api/forms');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch forms');
      }
      const data = await response.json();
      setForms(data);
    } catch (error: any) {
      console.error('Error fetching forms:', error);
      toast.error(error.message || 'Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setIsUploading(true);
    const formDataToSend = new FormData();
    formDataToSend.append('file', selectedFile);
    formDataToSend.append('name', formData.name);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('category', formData.category);
    formDataToSend.append('state', formData.state);

    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) throw new Error('Upload failed');

      toast.success('Form uploaded successfully');
      await fetchForms();
      setFormData({
        name: '',
        description: '',
        category: '',
        state: 'Federal',
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload form');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (formId: string) => {
    try {
      window.open(`/api/forms/${formId}/download`, '_blank');
    } catch (error: any) {
      console.error('Error downloading form:', error);
      toast.error(error.message || 'Failed to download form');
    }
  };

  const handleView = async (formId: string) => {
    try {
      const response = await fetch(`/api/forms/view?id=${formId}`);
      if (!response.ok) {
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

  const handleDelete = async (form: Form) => {
    setFormToDelete(form);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!formToDelete) return;

    try {
      const response = await fetch(`/api/forms?id=${formToDelete._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete form');
      }

      toast.success('Form deleted successfully');
      await fetchForms();
    } catch (error) {
      console.error('Error deleting form:', error);
      toast.error('Failed to delete form');
    } finally {
      setDeleteModalOpen(false);
      setFormToDelete(null);
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

  const handleEditForm = (form: Form) => {
    setEditingFormId(form._id);
    setEditFormData({
      name: form.name,
      description: form.description,
      category: form.category,
      file: null,
    });
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEditFormData(prev => ({ ...prev, file }));
  };

  const handleSaveEdit = async (formId: string) => {
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', editFormData.name);
      formDataToSend.append('description', editFormData.description);
      formDataToSend.append('category', editFormData.category);
      if (editFormData.file) {
        formDataToSend.append('file', editFormData.file);
      }
      const response = await fetch(`/api/forms?id=${formId}`, {
        method: 'PUT',
        body: formDataToSend,
      });
      if (!response.ok) throw new Error('Failed to update form');
      toast.success('Form updated successfully');
      setEditingFormId(null);
      setEditFormData({ name: '', description: '', category: '', file: null });
      await fetchForms();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update form');
    }
  };

  const handleCancelEdit = () => {
    setEditingFormId(null);
    setEditFormData({ name: '', description: '', category: '', file: null });
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const renderListView = () => (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Description</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {forms.map((form) => (
            <tr key={form._id}>
              {editingFormId === form._id ? (
                <>
                  <td className="flex items-center gap-2">
                    <FaFile className="text-gray-500" />
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={e => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="input input-sm input-bordered w-full"
                    />
                  </td>
                  <td>
                    <select
                      value={editFormData.category}
                      onChange={e => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="input input-sm input-bordered w-full"
                    >
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={editFormData.description}
                      onChange={e => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="input input-sm input-bordered w-full"
                    />
                  </td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(form.status)}`}>{form.status}</span>
                  </td>
                  <td>{new Date(form.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-2 items-center">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleEditFileSelect}
                        ref={editFileInputRef}
                        className="input input-sm"
                      />
                      <button className="btn btn-xs btn-success" onClick={() => handleSaveEdit(form._id)}>Save</button>
                      <button className="btn btn-xs btn-ghost" onClick={handleCancelEdit}>Cancel</button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="flex items-center gap-2">
                    <FaFile className="text-gray-500" />
                    {form.name}
                  </td>
                  <td className="capitalize">{form.category}</td>
                  <td>{form.description}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(form.status)}`}>{form.status}</span>
                  </td>
                  <td>{new Date(form.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(form._id)}
                        className="btn btn-sm btn-info"
                      >
                        <FaEye className="mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => handleDownload(form._id)}
                        className="btn btn-sm btn-primary"
                      >
                        <FaDownload className="mr-1" />
                        Download
                      </button>
                      <button
                        onClick={() => handleEditForm(form)}
                        className="btn btn-sm btn-warning"
                      >
                        <FaEdit className="mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(form)}
                        className="btn btn-sm btn-error"
                      >
                        <FaTrash className="mr-1" />
                        Delete
                      </button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {forms.map((form) => (
        <div key={form._id} className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center mb-4">
              <FaFile className="text-2xl mr-2" />
              <h2 className="card-title text-lg">{form.name}</h2>
            </div>
            <div className="text-sm text-gray-500 mb-4">
              <p>Category: {form.category}</p>
              <p>Description: {form.description}</p>
              <p>Created: {new Date(form.createdAt).toLocaleDateString()}</p>
              <p>Status: {form.status}</p>
            </div>
            <div className="card-actions justify-end">
              <button
                className="btn btn-sm btn-info"
                onClick={() => handleView(form._id)}
              >
                <FaEye className="mr-1" />
                View
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => handleDownload(form._id)}
              >
                <FaDownload className="mr-1" />
                Download
              </button>
              <button
                className="btn btn-sm btn-error"
                onClick={() => handleDelete(form)}
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

  useEffect(() => {
    const fetchGlobals = async () => {
      try {
        const response = await fetch('/api/globals');
        if (!response.ok) throw new Error('Failed to fetch globals');
        const data = await response.json();
        setGlobals(data.globals || []);
      } catch (err) {
        // ignore for now
      }
    };
    fetchGlobals();
  }, []);

  useEffect(() => {
    if (formViewMode === 'mapping' && currentForm?.fields) {
      // Convert OCR fields to FormField format
      const fields = currentForm.fields.map((f: any, idx: number) => ({
        id: `field-${idx}`,
        label: f.label || f.key || '',
        type: f.type || 'text',
        boundingBox: f.boundingBox || { left: 0, top: 0, width: 100, height: 30 },
        value: f.value || '',
        mappedVariable: ''
      }));
      setFormFields(fields);
    }
  }, [formViewMode, currentForm]);

  const handleFieldClick = (field: FormField) => {
    setSelectedField(field);
    setMappingModalOpen(true);
  };

  const handleVariableSelect = (variableKey: string) => {
    if (selectedField) {
      setFormFields(prev => prev.map(f => 
        f.id === selectedField.id 
          ? { ...f, mappedVariable: variableKey }
          : f
      ));
      setMappingModalOpen(false);
      setSelectedField(null);
    }
  };

  const filteredVariables = globals.filter(g => 
    g.key.toLowerCase().includes(variableSearch.toLowerCase()) ||
    g.label.toLowerCase().includes(variableSearch.toLowerCase())
  );

  const handleSaveMapping = () => {
    // TODO: Save mapping to backend
    toast.success('Mapping saved (stub)');
  };

  if (isLoading) return <div className="flex justify-center p-4"><span className="loading loading-spinner loading-lg"></span></div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Forms Management</h1>
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
        <button
          onClick={() => router.push('/superadmin/forms/categories')}
          className="btn btn-primary"
        >
          Manage Categories
        </button>
      </div>

      {/* Upload Form */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Upload New Form</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            >
              {categories.map((category) => (
                <option key={category._id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">State</label>
            <select
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            >
              <option value="Federal">Federal</option>
              <option value="AL">Alabama</option>
              <option value="AK">Alaska</option>
              <option value="AZ">Arizona</option>
              <option value="AR">Arkansas</option>
              <option value="CA">California</option>
              <option value="CO">Colorado</option>
              <option value="CT">Connecticut</option>
              <option value="DE">Delaware</option>
              <option value="FL">Florida</option>
              <option value="GA">Georgia</option>
              <option value="HI">Hawaii</option>
              <option value="ID">Idaho</option>
              <option value="IL">Illinois</option>
              <option value="IN">Indiana</option>
              <option value="IA">Iowa</option>
              <option value="KS">Kansas</option>
              <option value="KY">Kentucky</option>
              <option value="LA">Louisiana</option>
              <option value="ME">Maine</option>
              <option value="MD">Maryland</option>
              <option value="MA">Massachusetts</option>
              <option value="MI">Michigan</option>
              <option value="MN">Minnesota</option>
              <option value="MS">Mississippi</option>
              <option value="MO">Missouri</option>
              <option value="MT">Montana</option>
              <option value="NE">Nebraska</option>
              <option value="NV">Nevada</option>
              <option value="NH">New Hampshire</option>
              <option value="NJ">New Jersey</option>
              <option value="NM">New Mexico</option>
              <option value="NY">New York</option>
              <option value="NC">North Carolina</option>
              <option value="ND">North Dakota</option>
              <option value="OH">Ohio</option>
              <option value="OK">Oklahoma</option>
              <option value="OR">Oregon</option>
              <option value="PA">Pennsylvania</option>
              <option value="RI">Rhode Island</option>
              <option value="SC">South Carolina</option>
              <option value="SD">South Dakota</option>
              <option value="TN">Tennessee</option>
              <option value="TX">Texas</option>
              <option value="UT">Utah</option>
              <option value="VT">Vermont</option>
              <option value="VA">Virginia</option>
              <option value="WA">Washington</option>
              <option value="WV">West Virginia</option>
              <option value="WI">Wisconsin</option>
              <option value="WY">Wyoming</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">File</label>
            <input
              type="file"
              onChange={handleFileSelect}
              className="mt-1 block w-full"
              accept=".pdf,.jpg,.jpeg,.png"
              required
              ref={fileInputRef}
            />
            {selectedFile && (
              <p className="mt-1 text-sm text-gray-500">
                Selected file: {selectedFile.name}
              </p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isUploading || !selectedFile}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaUpload className="mr-2" />
            {isUploading ? 'Uploading...' : 'Upload Form'}
          </button>
        </form>
      </div>

      {/* Forms List/Grid */}
      {forms.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No forms uploaded yet.</p>
        </div>
      ) : (
        viewMode === 'grid' ? renderGridView() : renderListView()
      )}

      {/* Delete Confirmation Modal */}
      <dialog id="delete_modal" className={`modal ${deleteModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">Delete Form</h3>
          <p className="py-4">Are you sure you want to delete "{formToDelete?.name}"? This action cannot be undone.</p>
          <div className="modal-action">
            <button className="btn" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
            <button className="btn btn-error" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setDeleteModalOpen(false)}>close</button>
        </form>
      </dialog>

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
                {currentForm.fields && (
                  <button
                    className={`btn btn-sm ${formViewMode === 'mapping' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setFormViewMode('mapping')}
                  >
                    Mapping
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
            {formViewMode === 'image' ? (
              <div className="w-full h-[500px]">
                <iframe
                  src={currentForm.url}
                  className="w-full h-full"
                  title="Form Viewer"
                />
              </div>
            ) : formViewMode === 'fields' ? (
              <div className="w-full h-[500px] overflow-auto">
                <div className="bg-base-200 p-4 rounded-lg h-full">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(currentForm.fields, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div className="w-full h-[500px] overflow-auto flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-lg font-bold">Field Mapping</div>
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        setFormFields(prev => prev.map(f => ({ ...f, mappedVariable: '' })));
                      }}
                    >
                      Reset All
                    </button>
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={handleSaveMapping}
                    >
                      Save Mapping
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 h-full">
                  {/* Form Preview */}
                  <div className="flex-1 relative bg-white rounded-lg shadow-sm overflow-auto">
                    {currentForm?.url && (
                      <div className="relative">
                        <iframe
                          src={currentForm.url}
                          className="w-full h-[500px]"
                          title="Form Preview"
                        />
                        {/* Overlay for clickable fields */}
                        <div className="absolute inset-0 pointer-events-none">
                          {formFields.map((field) => (
                            <div
                              key={field.id}
                              className="absolute border-2 border-blue-500 bg-blue-500/10 hover:bg-blue-500/20 cursor-pointer pointer-events-auto transition-colors"
                              style={{
                                left: `${field.boundingBox.left}%`,
                                top: `${field.boundingBox.top}%`,
                                width: `${field.boundingBox.width}%`,
                                height: `${field.boundingBox.height}%`,
                                borderColor: field.mappedVariable ? 'green' : 'blue'
                              }}
                              onClick={() => handleFieldClick(field)}
                            >
                              {field.mappedVariable && (
                                <div className="absolute -top-6 left-0 bg-green-500 text-white text-xs px-2 py-1 rounded">
                                  {field.mappedVariable}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mapping List */}
                  <div className="w-80 bg-base-100 rounded-lg shadow-sm p-4 overflow-auto">
                    <h3 className="font-semibold mb-4">Mapped Fields</h3>
                    <div className="space-y-2">
                      {formFields.map((field) => (
                        <div
                          key={field.id}
                          className={`p-2 rounded cursor-pointer ${
                            field.mappedVariable ? 'bg-green-100' : 'bg-gray-100'
                          }`}
                          onClick={() => handleFieldClick(field)}
                        >
                          <div className="font-medium">{field.label}</div>
                          {field.mappedVariable && (
                            <div className="text-sm text-green-600">
                              → {field.mappedVariable}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Variable Selection Modal */}
                <dialog id="mapping_modal" className={`modal ${mappingModalOpen ? 'modal-open' : ''}`}>
                  <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">
                      Map Field: {selectedField?.label}
                    </h3>
                    
                    <div className="form-control mb-4">
                      <input
                        type="text"
                        placeholder="Search variables..."
                        className="input input-bordered"
                        value={variableSearch}
                        onChange={(e) => setVariableSearch(e.target.value)}
                      />
                    </div>

                    <div className="max-h-96 overflow-auto">
                      <div className="space-y-2">
                        {filteredVariables.map((variable) => (
                          <button
                            key={variable.key}
                            className="w-full text-left p-2 hover:bg-base-200 rounded"
                            onClick={() => handleVariableSelect(variable.key)}
                          >
                            <div className="font-medium">{variable.label}</div>
                            <div className="text-sm text-gray-500">{variable.key}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="modal-action">
                      <button
                        className="btn"
                        onClick={() => {
                          setMappingModalOpen(false);
                          setSelectedField(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <form method="dialog" className="modal-backdrop">
                    <button onClick={() => setMappingModalOpen(false)}>close</button>
                  </form>
                </dialog>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 