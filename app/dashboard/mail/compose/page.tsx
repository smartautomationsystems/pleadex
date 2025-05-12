'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Import TinyMCE editor dynamically to avoid SSR issues
const Editor = dynamic(() => import('@tinymce/tinymce-react').then(mod => mod.Editor), {
  ssr: false,
  loading: () => <p>Loading editor...</p>
});

interface Attachment {
  file: File;
  id: string;
}

export default function ComposePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachmentAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments = Array.from(files).map(file => ({
      file,
      id: Math.random().toString(36).substring(7)
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleAttachmentRemove = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleSend = async () => {
    if (!to) {
      toast.error('Please enter a recipient');
      return;
    }

    setIsSending(true);
    const formData = new FormData();
    formData.append('to', to);
    formData.append('cc', cc);
    formData.append('bcc', bcc);
    formData.append('subject', subject);
    formData.append('content', content);

    attachments.forEach(attachment => {
      formData.append('attachments', attachment.file);
    });

    try {
      const res = await fetch('/api/mail/send', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to send email');
      
      toast.success('Email sent successfully');
      router.push('/dashboard/mail/inbox');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Compose Email</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">To</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="recipient@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cc</label>
            <input
              type="email"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="cc@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bcc</label>
            <input
              type="email"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="bcc@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter subject"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <Editor
              apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
              init={{
                height: 400,
                menubar: false,
                plugins: [
                  'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                  'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                  'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                ],
                toolbar: 'undo redo | blocks | ' +
                  'bold italic forecolor | alignleft aligncenter ' +
                  'alignright alignjustify | bullist numlist outdent indent | ' +
                  'removeformat | help',
                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
              }}
              onEditorChange={(content) => setContent(content)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Attachments</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAttachmentAdd}
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-outline"
              >
                Add Files
              </button>
            </div>
            {attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {attachments.map(attachment => (
                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{attachment.file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleAttachmentRemove(attachment.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => router.push('/dashboard/mail/inbox')}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSend}
              disabled={isSending}
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 