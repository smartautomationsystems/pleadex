'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FaUpload, FaFile, FaTrash, FaDownload, FaList, FaThLarge } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  content: string | null;
}

export default function DocumentsPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    if (session?.user) {
      fetchDocuments();
    }
  }, [session]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch documents');
      }
      const data = await response.json();
      setDocuments(data.map((doc: any) => ({
        id: doc._id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        uploadedAt: doc.uploadedAt,
        status: doc.status || 'pending',
        content: doc.content
      })));
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error(error.message || 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      toast.success('Document uploaded successfully');
      // Fetch updated documents list
      await fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    setDocumentToDelete(documentId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;

    try {
      const response = await fetch('/api/documents', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId: documentToDelete }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      toast.success('Document deleted successfully');
      // Refresh the documents list
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    } finally {
      setDeleteModalOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      // Open the download URL in a new tab
      window.open(`/api/documents/download?id=${documentId}`, '_blank');
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast.error(error.message || 'Failed to download document');
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
          {documents.map((doc) => (
            <tr key={doc.id}>
              <td className="flex items-center gap-2">
                <FaFile className="text-gray-500" />
                {doc.name}
              </td>
              <td>{doc.type}</td>
              <td>{(doc.size / 1024 / 1024).toFixed(2)} MB</td>
              <td>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(doc.status)}`}>
                  {doc.status}
                </span>
              </td>
              <td>{new Date(doc.uploadedAt).toLocaleDateString()}</td>
              <td>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(doc.id)}
                    className="btn btn-sm btn-primary"
                  >
                    <FaDownload className="mr-1" />
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
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
      {documents.map((document) => (
        <div key={document.id} className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center mb-4">
              <FaFile className="text-2xl mr-2" />
              <h2 className="card-title text-lg">{document.name}</h2>
            </div>
            <div className="text-sm text-gray-500 mb-4">
              <p>Type: {document.type}</p>
              <p>Size: {(document.size / 1024 / 1024).toFixed(2)} MB</p>
              <p>Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}</p>
              <p>Status: {document.status}</p>
            </div>
            <div className="card-actions justify-end">
              <button
                className="btn btn-sm btn-primary"
                onClick={() => handleDownload(document.id)}
              >
                <FaDownload className="mr-1" />
                Download
              </button>
              <button
                className="btn btn-sm btn-error"
                onClick={() => handleDelete(document.id)}
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">My Documents</h1>
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
          Upload Document
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept=".pdf,.jpg,.jpeg,.png"
          />
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No documents uploaded yet.</p>
        </div>
      ) : (
        viewMode === 'grid' ? renderGridView() : renderListView()
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Delete Document</h3>
            <p className="py-4">Are you sure you want to delete this document?</p>
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
    </div>
  );
} 