'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface EmailSettings {
  email: string;
  displayName: string;
  role: string;
  country: string;
  language: string;
  timeZone: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  caseUpdates: boolean;
  documentAlerts: boolean;
  notificationEmail?: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: false,
    caseUpdates: false,
    documentAlerts: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchEmailSettings();
      fetchNotificationSettings();
    }
  }, [status, router]);

  const fetchEmailSettings = async () => {
    try {
      const res = await fetch('/api/mail/email-settings');
      if (!res.ok) return;
      const data = await res.json();
      if (data.emailSettings) setEmailSettings(data.emailSettings);
    } catch (error) {
      console.error('Error fetching email settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotificationSettings = async () => {
    try {
      const res = await fetch('/api/notifications/settings');
      if (!res.ok) return;
      const data = await res.json();
      setNotificationSettings(data.settings);
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  };

  const handleEmailSettingsChange = (field: string, value: string) => {
    setEmailSettings(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const handleNotificationChange = async (field: keyof NotificationSettings, value: boolean | string) => {
    const newSettings = { ...notificationSettings, [field]: value };
    setNotificationSettings(newSettings);
    
    // Only make API call for checkbox changes
    if (typeof value === 'boolean') {
      try {
        const res = await fetch('/api/notifications/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSettings),
        });
        if (!res.ok) throw new Error('Failed to update notification settings');
        toast.success('Notification settings updated');
      } catch (err) {
        toast.error('Failed to update notification settings');
        // Revert the change on error
        setNotificationSettings(notificationSettings);
      }
    }
  };

  const handleNotificationEmailBlur = async () => {
    try {
      const res = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationSettings),
      });
      if (!res.ok) throw new Error('Failed to update notification settings');
      toast.success('Notification settings updated');
    } catch (err) {
      toast.error('Failed to update notification settings');
    }
  };

  const handleSaveEmailSettings = async () => {
    if (!emailSettings) return;
    try {
      const res = await fetch('/api/mail/email-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailSettings),
      });
      if (!res.ok) throw new Error('Failed to update email settings');
      toast.success('Email settings updated');
      fetchEmailSettings();
    } catch (err) {
      toast.error('Failed to update email settings');
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
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      {/* Email Settings Section */}
      {emailSettings && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Email Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <input 
                type="text" 
                value={emailSettings.email} 
                readOnly 
                className="w-full p-2 border rounded bg-gray-100" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Display Name</label>
              <input 
                type="text" 
                value={emailSettings.displayName} 
                onChange={e => handleEmailSettingsChange('displayName', e.target.value)} 
                className="w-full p-2 border rounded" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select 
                value={emailSettings.role} 
                onChange={e => handleEmailSettingsChange('role', e.target.value)} 
                className="w-full p-2 border rounded"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input 
                type="text" 
                value={emailSettings.country} 
                onChange={e => handleEmailSettingsChange('country', e.target.value)} 
                className="w-full p-2 border rounded" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <input 
                type="text" 
                value={emailSettings.language} 
                onChange={e => handleEmailSettingsChange('language', e.target.value)} 
                className="w-full p-2 border rounded" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time Zone</label>
              <select 
                value={emailSettings.timeZone} 
                onChange={e => handleEmailSettingsChange('timeZone', e.target.value)} 
                className="w-full p-2 border rounded"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/Anchorage">Alaska Time (AKT)</option>
                <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Europe/Paris">Central European Time (CET)</option>
                <option value="Europe/Moscow">Moscow Time (MSK)</option>
                <option value="Asia/Dubai">Gulf Standard Time (GST)</option>
                <option value="Asia/Singapore">Singapore Time (SGT)</option>
                <option value="Asia/Tokyo">Japan Time (JST)</option>
                <option value="Australia/Sydney">Australian Eastern Time (AET)</option>
                <option value="Pacific/Auckland">New Zealand Time (NZT)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleSaveEmailSettings}
            >
              Save Email Settings
            </button>
          </div>
        </div>
      )}

      {/* Notification Settings Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Email Notifications</h3>
              <p className="text-sm text-gray-500">
                Receive notifications at your external email address
              </p>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-primary"
              checked={notificationSettings.emailNotifications}
              onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
            />
          </div>

          {notificationSettings.emailNotifications && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Notification Email Address</label>
              <input 
                type="email" 
                value={notificationSettings.notificationEmail || ''}
                onChange={(e) => handleNotificationChange('notificationEmail', e.target.value)}
                onBlur={handleNotificationEmailBlur}
                className="w-full p-2 border rounded"
                placeholder="Enter your email address"
              />
              <p className="text-sm text-gray-500 mt-1">
                {emailSettings 
                  ? `Your Pleadex email (${emailSettings.email}) is only accessible within the application. Notifications will be sent to your external email address.`
                  : 'Notifications will be sent to this email address.'}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Case Updates</h3>
              <p className="text-sm text-gray-500">Get notified about case status changes</p>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-primary"
              checked={notificationSettings.caseUpdates}
              onChange={(e) => handleNotificationChange('caseUpdates', e.target.checked)}
              disabled={!notificationSettings.emailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Document Alerts</h3>
              <p className="text-sm text-gray-500">Receive alerts for new documents</p>
            </div>
            <input 
              type="checkbox" 
              className="toggle toggle-primary"
              checked={notificationSettings.documentAlerts}
              onChange={(e) => handleNotificationChange('documentAlerts', e.target.checked)}
              disabled={!notificationSettings.emailNotifications}
            />
          </div>
        </div>
      </div>

      {/* Privacy Settings Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Privacy Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Profile Visibility</h3>
              <p className="text-sm text-gray-500">Control who can see your profile</p>
            </div>
            <select className="select select-bordered">
              <option>Public</option>
              <option>Private</option>
              <option>Contacts Only</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Activity Status</h3>
              <p className="text-sm text-gray-500">Show when you're active</p>
            </div>
            <input type="checkbox" className="toggle toggle-primary" />
          </div>
        </div>
      </div>
    </div>
  );
} 