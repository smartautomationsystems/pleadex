'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function MailPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(false);

  // This would be replaced with actual data from your backend
  const [emailStatus, setEmailStatus] = useState({
    enabled: false,
    emailAddress: '',
  });

  const validateUsername = (value: string) => {
    // Username validation rules
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 30) return 'Username must be less than 30 characters';
    if (!/^[a-zA-Z0-9._-]+$/.test(value)) return 'Username can only contain letters, numbers, dots, underscores, and hyphens';
    return '';
  };

  const checkUsernameAvailability = async (value: string) => {
    setIsCheckingUsername(true);
    setIsUsernameAvailable(false);
    try {
      const response = await fetch('/api/mail/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: value }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        setUsernameError(data.message || 'Error checking username');
        return false;
      }
      
      if (!data.available) {
        setUsernameError('This username is already taken');
        return false;
      }
      
      setUsernameError('');
      setIsUsernameAvailable(true);
      return true;
    } catch (error) {
      setUsernameError('Error checking username availability');
      return false;
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setUsername(value);
    setIsUsernameAvailable(false);
    
    const validationError = validateUsername(value);
    if (validationError) {
      setUsernameError(validationError);
      return;
    }
    
    if (value.length >= 3) {
      await checkUsernameAvailability(value);
    }
  };

  const handleEnableEmail = async () => {
    if (usernameError || !username) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/mail/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to enable email');
      }

      const data = await response.json();
      setEmailStatus({
        enabled: true,
        emailAddress: data.emailAddress,
      });
    } catch (error) {
      console.error('Failed to enable email:', error);
      setUsernameError(error instanceof Error ? error.message : 'Failed to enable email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Email Settings</h1>
      
      <div className="bg-base-100 p-6 rounded-lg shadow-sm">
        {emailStatus.enabled ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Email Status</h2>
                <p className="text-success">Enabled</p>
              </div>
            </div>
            <div>
              <h3 className="text-md font-medium mb-2">Your Pleadex Email Address</h3>
              <p className="text-lg font-mono bg-base-200 p-2 rounded">
                {emailStatus.emailAddress}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Email Feature</h2>
              <p className="text-base-content/80">
                Get a professional email address with your Pleadex account. This feature includes:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-base-content/80">
                <li>Custom @pleadex.com email address</li>
                <li>Professional email hosting</li>
                <li>Secure email delivery</li>
                <li>Email forwarding options</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-2">
                  Choose your email username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={handleUsernameChange}
                    className={`input input-bordered w-full ${
                      usernameError ? 'input-error' : isUsernameAvailable ? 'input-success' : ''
                    }`}
                    placeholder="username"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60">
                    @pleadex.com
                  </span>
                </div>
                {isCheckingUsername && (
                  <p className="text-sm text-base-content/60 mt-1">
                    Checking availability...
                  </p>
                )}
                {usernameError && (
                  <p className="text-sm text-error mt-1">{usernameError}</p>
                )}
                {isUsernameAvailable && !usernameError && (
                  <p className="text-sm text-success mt-1">Available</p>
                )}
              </div>
            </div>
            
            <div className="bg-base-200 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Pricing</h3>
              <p className="text-lg font-bold">$9.99/month</p>
              <p className="text-sm text-base-content/80 mt-1">
                Billed monthly. Cancel anytime.
              </p>
            </div>

            <button
              onClick={handleEnableEmail}
              disabled={isLoading || !!usernameError || !username}
              className="btn btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Enabling...
                </>
              ) : (
                'Enable Email Feature'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 