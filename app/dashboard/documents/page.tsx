'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { FaUpload, FaFile, FaTrash, FaDownload, FaList, FaThLarge, FaEye, FaSearch, FaFileAlt, FaSearchPlus, FaSearchMinus, FaExpand, FaCompress } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  content: string | null;
  searchMatch?: {
    text: string;
    context: string;
  };
}

export default function DocumentsPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<{ url: string; content: string | null } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [documentViewMode, setDocumentViewMode] = useState<'image' | 'text'>('image');
  const [isPolling, setIsPolling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'exact' | 'fuzzy' | 'ai'>('exact');
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<{ text: string; loading: boolean }>({ text: '', loading: false });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/documents');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch documents');
      }
      const data = await response.json();
      console.log('Raw documents data:', data);
      
      const newDocuments = data.map((doc: any) => ({
        id: doc._id.toString(),
        name: doc.name,
        type: doc.type,
        size: doc.size,
        uploadedAt: doc.uploadedAt || doc.createdAt,
        status: doc.status || 'pending',
        content: doc.content
      }));
      
      console.log('Mapped documents:', newDocuments.map((d: Document) => ({ id: d.id, name: d.name, status: d.status })));
      setDocuments(newDocuments);
      setFilteredDocuments(newDocuments);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error(error.message || 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search functionality
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
      return;
    }

    if (searchType === 'exact') {
      const searchResults = documents.map(doc => {
        if (!doc.content) return null;

        const searchIndex = doc.content.toLowerCase().indexOf(searchQuery.toLowerCase());
        if (searchIndex === -1) return null;

        // Get 100 characters before and after the match
        const start = Math.max(0, searchIndex - 100);
        const end = Math.min(doc.content.length, searchIndex + searchQuery.length + 100);
        const context = doc.content.slice(start, end);

        return {
          ...doc,
          searchMatch: {
            text: doc.content.slice(searchIndex, searchIndex + searchQuery.length),
            context
          }
        };
      }).filter((doc): doc is Document & { searchMatch: { text: string; context: string } } => doc !== null);

      setFilteredDocuments(searchResults);
    } else {
      try {
        const response = await fetch('/api/documents/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            documents: documents.map(doc => ({
              id: doc.id,
              content: doc.content
            })),
            searchType
          }),
        });

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const results = await response.json();
        const searchResults = documents.map(doc => {
          const match = results.find((r: any) => r.id === doc.id);
          if (!match) return null;

          return {
            ...doc,
            searchMatch: {
              text: match.text,
              context: match.context,
              relevance: match.relevance
            }
          };
        }).filter((doc): doc is Document & { searchMatch: { text: string; context: string; relevance: number } } => doc !== null);

        // Sort by relevance
        searchResults.sort((a, b) => (b.searchMatch.relevance - a.searchMatch.relevance));
        setFilteredDocuments(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        toast.error('Search failed. Falling back to exact search.');
        // Fall back to exact search
        handleSearch();
      }
    }
  }, [searchQuery, documents, searchType]);

  useEffect(() => {
    handleSearch();
  }, [searchQuery, handleSearch]);

  useEffect(() => {
    if (session?.user) {
      fetchDocuments();
    }
  }, [session, fetchDocuments]);

  // Add polling effect for processing documents
  useEffect(() => {
    const hasProcessingDocuments = documents.some(doc => doc.status === 'processing');
    console.log('Polling check:', { hasProcessingDocuments, isPolling, documentCount: documents.length });

    if (!hasProcessingDocuments) {
      if (isPolling) {
        console.log('Stopping polling - no more processing documents');
        setIsPolling(false);
      }
      return;
    }

    if (!isPolling) {
      console.log('Starting polling for processing documents');
      setIsPolling(true);
    }

    const pollInterval = setInterval(async () => {
      console.log('Polling for document updates...');
      await fetchDocuments();
    }, 2000); // Poll every 2 seconds

    return () => {
      console.log('Cleaning up polling interval');
      clearInterval(pollInterval);
      setIsPolling(false);
    };
  }, [documents, isPolling, fetchDocuments]);

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

  const handleView = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/view?id=${documentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }
      const data = await response.json();
      setCurrentDocument(data);
      setViewModalOpen(true);
    } catch (error: any) {
      console.error('Error viewing document:', error);
      toast.error(error.message || 'Failed to view document');
    }
  };

  const handleSummarize = async (documentId: string) => {
    setSummaryModalOpen(true);
    setCurrentSummary({ text: '', loading: true });

    try {
      const response = await fetch(`/api/documents/summarize?id=${documentId}`);
      if (!response.ok) {
        throw new Error('Failed to summarize document');
      }
      const data = await response.json();
      setCurrentSummary({ text: data.summary, loading: false });
    } catch (error) {
      console.error('Error summarizing document:', error);
      toast.error('Failed to summarize document');
      setCurrentSummary({ text: '', loading: false });
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

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const renderListView = () => (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr>
            <th>Name</th>
            {!searchQuery && (
              <>
                <th>Type</th>
                <th>Size</th>
                <th>Status</th>
                <th>Uploaded</th>
              </>
            )}
            {searchQuery && <th>Search Match</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredDocuments.map((doc) => (
            <tr key={doc.id}>
              <td className="flex items-center gap-2">
                <FaFile className="text-gray-500" />
                {doc.name}
              </td>
              {!searchQuery && (
                <>
                  <td>{doc.type}</td>
                  <td>{(doc.size / 1024 / 1024).toFixed(2)} MB</td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(doc.status)}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td>{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                </>
              )}
              {searchQuery && (
                <td>
                  {doc.searchMatch && (
                    <div className="max-w-md">
                      <p className="text-sm text-gray-600">
                        <span className="text-gray-400">...</span>
                        {doc.searchMatch.context}
                        <span className="text-gray-400">...</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Found: <span className="font-semibold">{doc.searchMatch.text}</span>
                      </p>
                    </div>
                  )}
                </td>
              )}
              <td>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(doc.id)}
                    className="btn btn-sm btn-info"
                    title="View Document"
                  >
                    <FaEye />
                  </button>
                  <button
                    onClick={() => handleDownload(doc.id)}
                    className="btn btn-sm btn-primary"
                    title="Download Document"
                  >
                    <FaDownload />
                  </button>
                  <button
                    onClick={() => handleSummarize(doc.id)}
                    className="btn btn-sm btn-secondary"
                    title="Summarize Document"
                  >
                    <FaFileAlt />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="btn btn-sm btn-error"
                    title="Delete Document"
                  >
                    <FaTrash />
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
      {filteredDocuments.map((document) => (
        <div key={document.id} className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center mb-4">
              <FaFile className="text-2xl mr-2" />
              <h2 className="card-title text-lg">{document.name}</h2>
            </div>
            <div className="text-sm text-gray-500 mb-4">
              {!searchQuery && (
                <>
                  <p>Type: {document.type}</p>
                  <p>Size: {(document.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p>Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}</p>
                  <p>Status: {document.status}</p>
                </>
              )}
              {searchQuery && document.searchMatch && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    <span className="text-gray-400">...</span>
                    {document.searchMatch.context}
                    <span className="text-gray-400">...</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Found: <span className="font-semibold">{document.searchMatch.text}</span>
                  </p>
                </div>
              )}
            </div>
            <div className="card-actions justify-end">
              <button
                className="btn btn-sm btn-info"
                onClick={() => handleView(document.id)}
                title="View Document"
              >
                <FaEye />
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => handleDownload(document.id)}
                title="Download Document"
              >
                <FaDownload />
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => handleSummarize(document.id)}
                title="Summarize Document"
              >
                <FaFileAlt />
              </button>
              <button
                className="btn btn-sm btn-error"
                onClick={() => handleDelete(document.id)}
                title="Delete Document"
              >
                <FaTrash />
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

      {/* Search Bar */}
      <div className="mb-8">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search documents..."
              className="input input-bordered w-full pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <select
            className="select select-bordered"
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as 'exact' | 'fuzzy' | 'ai')}
          >
            <option value="exact">Exact Match</option>
            <option value="fuzzy">Fuzzy Search</option>
            <option value="ai">AI Search</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No documents found.</p>
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

      {/* View Modal */}
      {viewModalOpen && currentDocument && (
        <div className="modal modal-open">
          <div className={`modal-box ${isFullscreen ? 'w-screen h-screen max-w-none' : 'max-w-4xl w-[8.5in] h-[11in]'} p-0 transition-all duration-300`}>
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="font-bold text-lg">Document Viewer</h3>
                <div className="flex gap-2">
                  {currentDocument.content && (
                    <button
                      className={`btn btn-sm ${documentViewMode === 'image' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setDocumentViewMode('image')}
                    >
                      Image
                    </button>
                  )}
                  {currentDocument.content && (
                    <button
                      className={`btn btn-sm ${documentViewMode === 'text' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setDocumentViewMode('text')}
                    >
                      Text
                    </button>
                  )}
                  <div className="divider divider-horizontal mx-2"></div>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={handleZoomOut}
                    title="Zoom Out"
                  >
                    <FaSearchMinus />
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={handleResetZoom}
                    title="Reset Zoom"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={handleZoomIn}
                    title="Zoom In"
                  >
                    <FaSearchPlus />
                  </button>
                  <div className="divider divider-horizontal mx-2"></div>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={handleToggleFullscreen}
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  >
                    {isFullscreen ? <FaCompress /> : <FaExpand />}
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setViewModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {documentViewMode === 'image' ? (
                  <div className="w-full h-full overflow-auto">
                    <div 
                      className="relative"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: '0 0',
                        width: `${100 / zoomLevel}%`,
                        height: `${100 / zoomLevel}%`,
                        transition: 'transform 0.2s ease-in-out'
                      }}
                    >
                      <iframe
                        src={currentDocument.url}
                        className="w-full h-full"
                        title="Document Viewer"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full overflow-auto">
                    <div 
                      className="bg-base-200 p-4 rounded-lg"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: '0 0',
                        width: `${100 / zoomLevel}%`,
                        height: `${100 / zoomLevel}%`,
                        transition: 'transform 0.2s ease-in-out'
                      }}
                    >
                      <pre className="whitespace-pre-wrap font-mono text-sm">{currentDocument.content}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {summaryModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg mb-4">Document Summary</h3>
            <div className="max-h-[60vh] overflow-y-auto">
              {currentSummary.loading ? (
                <div className="flex justify-center items-center h-32">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              ) : (
                <div className="prose max-w-none">
                  {currentSummary.text.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4">{paragraph}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setSummaryModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 