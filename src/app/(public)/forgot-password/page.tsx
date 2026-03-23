'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setMessage('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      setDebugUrl(data?.debugUrl || null);

      if (response.ok) {
        setMessage('If an account with that email exists, a password reset link has been sent.');
      } else {
        setMessage(data.message || 'An error occurred');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred while sending the request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Forgot Password</h2>

        {message && (
          <div className={`mb-4 p-3 rounded text-center ${
            message.includes('sent') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 font-bold mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter your email address"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {debugUrl ? (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">Debug: Use this link to reset your password (development only):</p>
            <a href={debugUrl} className="text-blue-500 hover:text-blue-700 text-sm" target="_blank" rel="noreferrer">
              {debugUrl}
            </a>
          </div>
        ) : (
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}