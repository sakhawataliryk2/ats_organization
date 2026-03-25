import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Get all active users for dropdowns
export async function GET(request: NextRequest) {
    try {
        // Get the token from cookies
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Authentication required' },
                { status: 401 }
            );
        }

        // Make a request to your backend API to get active users
        const apiUrl = process.env.API_BASE_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/users/active`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: data.message || 'Failed to fetch active users' },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching active users:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}