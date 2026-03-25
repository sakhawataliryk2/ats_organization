import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, password, userType } = body;

        if (!name || !email || !password || !userType) {
            return NextResponse.json(
                { success: false, message: 'All fields are required' },
                { status: 400 }
            );
        }

        // Make a request to your backend API
        const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:8080'}/api/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password, userType }),
        });
        console.log("Base url is  " + process.env.API_BASE_URL)
        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: data.message || 'Registration failed' },
                { status: response.status }
            );
        }

        // Return successful response
        return NextResponse.json({
            success: true,
            message: 'Registration successful',
            user: data.user
        });
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}