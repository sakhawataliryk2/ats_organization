// file: app/api/organizations/[id]/route.ts - Updated implementation with better error handling
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Get the token from cookies with await
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Authentication required' },
                { status: 401 }
            );
        }

        // Make a request to your backend API
        const apiUrl = process.env.API_BASE_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/organizations/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: data.message || 'Failed to fetch organization' },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching organization:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        console.log("PUT request received for organization ID:", id);

        // Get the token from cookies with await
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            console.error("No authentication token found");
            return NextResponse.json(
                { success: false, message: 'Authentication required' },
                { status: 401 }
            );
        }

        // Extract request body
        const body = await request.json();
        console.log("Request body:", body);

        // Make a request to your backend API
        const apiUrl = process.env.API_BASE_URL || 'http://localhost:8080';
        console.log(`Making request to backend at: ${apiUrl}/api/organizations/${id}`);

        const response = await fetch(`${apiUrl}/api/organizations/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        // Log status for debugging
        console.log(`Backend response status: ${response.status} ${response.statusText}`);

        // Get the response as text first
        const responseText = await response.text();
        console.log("Raw response:", responseText);

        // Parse the response as JSON if possible
        let data;
        try {
            data = JSON.parse(responseText);
            console.log("Parsed response data:", data);
        } catch (jsonError) {
            console.error("Error parsing response JSON:", jsonError);
            data = { message: responseText || 'Failed to parse response' };
        }

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: data.message || 'Failed to update organization',
                    error: data
                },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error updating organization:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        return NextResponse.json(
            {
                success: false,
                message: 'Internal server error',
                error: errorMessage
            },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        console.log(`DELETE request received for organization ID: ${id}`);

        // Get the token from cookies
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Authentication required' },
                { status: 401 }
            );
        }

        // Make a request to your backend API
        const apiUrl = process.env.API_BASE_URL || 'http://localhost:8080';
        console.log(`Making DELETE request to backend at: ${apiUrl}/api/organizations/${id}`);

        const response = await fetch(`${apiUrl}/api/organizations/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`Backend response status: ${response.status} ${response.statusText}`);

        // Get the response text for more detailed error handling
        const responseText = await response.text();

        // Try to parse as JSON
        let data;
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            console.error("Error parsing DELETE response:", e);
            data = { message: responseText || 'Unknown error' };
        }

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: data.message || 'Failed to delete organization',
                    error: data
                },
                { status: response.status }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Organization deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting organization:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        return NextResponse.json(
            {
                success: false,
                message: 'Internal server error during deletion',
                error: errorMessage
            },
            { status: 500 }
        );
    }
}