'use client'

import { useState, useEffect } from 'react';
import { getCookie } from 'cookies-next';

export default function DebugAuth() {
    const [tokenInfo, setTokenInfo] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checkToken = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/check-token');
            const data = await response.json();

            if (response.ok) {
                setTokenInfo(data);
            } else {
                setError(data.message || 'Error checking token');
            }
        } catch (err) {
            setError('Failed to check token: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setLoading(false);
        }
    };

    const checkCookies = () => {
        const tokenCookie = getCookie('token');
        const userCookie = getCookie('user');

        return {
            token: tokenCookie ? `${tokenCookie.toString().substring(0, 20)}...` : 'Not found',
            user: userCookie ? JSON.parse(userCookie.toString()) : 'Not found'
        };
    };

    const cookies = checkCookies();

    return (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 my-4">
            <h3 className="font-bold mb-2">Auth Debugger</h3>

            <div className="mb-3">
                <h4 className="font-medium">Cookies:</h4>
                <div className="bg-white p-2 rounded border border-gray-200 text-sm">
                    <div>Token: {cookies.token}</div>
                    <div>User: {typeof cookies.user === 'object' ? JSON.stringify(cookies.user) : cookies.user}</div>
                </div>
            </div>

            <button
                onClick={checkToken}
                disabled={loading}
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
                {loading ? 'Checking...' : 'Check Token'}
            </button>

            {error && (
                <div className="mt-2 text-red-600 text-sm">
                    {error}
                </div>
            )}

            {tokenInfo && (
                <div className="mt-2">
                    <h4 className="font-medium">Token Info:</h4>
                    <pre className="bg-white p-2 rounded border border-gray-200 text-sm overflow-auto max-h-40">
                        {JSON.stringify(tokenInfo, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}