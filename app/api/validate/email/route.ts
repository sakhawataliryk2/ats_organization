import { NextRequest, NextResponse } from 'next/server';
import { validateEmailServer } from '@/lib/validation/emailValidation';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { success: false, message: 'Email is required' },
                { status: 400 }
            );
        }

        const result = await validateEmailServer(email);

        return NextResponse.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Email validation error:', error);
        return NextResponse.json(
            {
                success: false,
                isValid: false,
                message: 'Email validation service error'
            },
            { status: 500 }
        );
    }
}