import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // Create a response object
        const response = NextResponse.json({
            success: true,
            message: 'Logout successful'
        });

        // Delete cookies correctly - NextResponse cookies.delete only takes a name
        response.cookies.delete('token');
        response.cookies.delete('user');

        return response;
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { success: false, message: 'Error during logout' },
            { status: 500 }
        );
    }
}