import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
    try {
        const { teamId } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Authentication required' },
                { status: 401 }
            );
        }

        const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8080'}/api/teams/${teamId}/members`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching team members:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
    try {
        const { teamId } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();

        const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8080'}/api/teams/${teamId}/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error adding team member:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}