import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ teamId: string, userId: string }> }
) {
    try {
        const { teamId, userId } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Authentication required' },
                { status: 401 }
            );
        }

        const response = await fetch(
            `${process.env.API_BASE_URL || 'http://localhost:8080'}/api/teams/${teamId}/members/${userId}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error removing team member:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}