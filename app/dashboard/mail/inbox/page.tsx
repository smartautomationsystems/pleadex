'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface Email {
  id: string;
  from: string;
  subject: string;
  preview: string;
  date: string;
  read: boolean;
  attachments: boolean;
}

type Folder = 'inbox' | 'sent' | 'drafts' | 'trash';

export default function InboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState<Folder>('inbox');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchEmails();
    }
  }, [status, router, currentFolder]);

  const fetchEmails = async () => {
    try {
      const res = await fetch(`/api/mail/${currentFolder}`);
      if (!res.ok) throw new Error('Failed to fetch emails');
      const data = await res.json();
      setEmails(data.emails);
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast.error('Failed to load emails');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailClick = async (email: Email) => {
    setSelectedEmail(email);
    if (!email.read) {
      try {
        await fetch(`/api/mail/emails/${email.id}/read`, { method: 'POST' });
        setEmails(prev => prev.map(e => 
          e.id === email.id ? { ...e, read: true } : e
        ));
      } catch (error) {
        console.error('Error marking email as read:', error);
      }
    }
  };

  const handleEmailSelect = (emailId: string) => {
    setSelectedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const handleBulkAction = async (action: 'delete' | 'read' | 'unread') => {
    if (selectedEmails.size === 0) return;

    try {
      const res = await fetch('/api/mail/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailIds: Array.from(selectedEmails),
          action,
          folder: currentFolder
        }),
      });

      if (!res.ok) throw new Error('Failed to perform bulk action');
      
      toast.success('Action completed successfully');
      setSelectedEmails(new Set());
      fetchEmails();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform action');
    }
  };

  const handleDelete = async (emailId: string) => {
    try {
      const res = await fetch(`/api/mail/emails/${emailId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete email');
      
      setEmails(prev => prev.filter(e => e.id !== emailId));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
      toast.success('Email deleted');
    } catch (error) {
      console.error('Error deleting email:', error);
      toast.error('Failed to delete email');
    }
  };

  const filteredEmails = emails.filter(email => 
    email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Mail</h1>
            <div className="flex gap-2">
              <button
                className={`btn btn-sm ${currentFolder === 'inbox' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCurrentFolder('inbox')}
              >
                Inbox
              </button>
              <button
                className={`btn btn-sm ${currentFolder === 'sent' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCurrentFolder('sent')}
              >
                Sent
              </button>
              <button
                className={`btn btn-sm ${currentFolder === 'drafts' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCurrentFolder('drafts')}
              >
                Drafts
              </button>
              <button
                className={`btn btn-sm ${currentFolder === 'trash' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCurrentFolder('trash')}
              >
                Trash
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="form-control">
              <input
                type="text"
                placeholder="Search emails..."
                className="input input-bordered w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Link href="/dashboard/mail/compose" className="btn btn-primary">
              Compose
            </Link>
            <button className="btn btn-ghost" onClick={fetchEmails}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedEmails.size > 0 && (
        <div className="bg-gray-50 border-b p-2 flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {selectedEmails.size} selected
          </span>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => handleBulkAction('read')}
          >
            Mark as Read
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => handleBulkAction('unread')}
          >
            Mark as Unread
          </button>
          <button
            className="btn btn-sm btn-ghost text-red-500"
            onClick={() => handleBulkAction('delete')}
          >
            Delete
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Email List */}
        <div className="w-1/3 border-r overflow-y-auto">
          {filteredEmails.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No emails found
            </div>
          ) : (
            <div className="divide-y">
              {filteredEmails.map(email => (
                <div
                  key={email.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedEmail?.id === email.id ? 'bg-blue-50' : ''
                  } ${!email.read ? 'font-semibold' : ''}`}
                  onClick={() => handleEmailClick(email)}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={selectedEmails.has(email.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleEmailSelect(email.id);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{email.from}</p>
                      <p className="truncate">{email.subject}</p>
                      <p className="text-sm text-gray-500 truncate">{email.preview}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <p className="text-sm text-gray-500">{email.date}</p>
                      {email.attachments && (
                        <span className="text-blue-500">📎</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email Preview */}
        <div className="flex-1 overflow-y-auto">
          {selectedEmail ? (
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">{selectedEmail.subject}</h2>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => router.push(`/dashboard/mail/compose?reply=${selectedEmail.id}`)}
                    >
                      Reply
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => router.push(`/dashboard/mail/compose?forward=${selectedEmail.id}`)}
                    >
                      Forward
                    </button>
                    <button
                      className="btn btn-sm btn-ghost text-red-500"
                      onClick={() => handleDelete(selectedEmail.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-gray-500">
                  <div>
                    <span className="font-semibold">From: </span>
                    {selectedEmail.from}
                  </div>
                  <div>{selectedEmail.date}</div>
                </div>
              </div>
              <div className="prose max-w-none">
                {selectedEmail.preview}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select an email to read
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 