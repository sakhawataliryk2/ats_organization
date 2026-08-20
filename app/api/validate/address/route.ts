import { NextRequest, NextResponse } from 'next/server';
import { validateAddressServer } from '@/lib/validation/addressValidation';

export async function POST(request: NextRequest) {
    try {
        const addressData = await request.json();

        const { address, city, state, zip } = addressData;

        if (!address || !city || !state) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Address, city, and state are required'
                },
                { status: 400 }
            );
        }

        const result = await validateAddressServer({
            address,
            city,
            state,
            zip: zip || ''
        });

        return NextResponse.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Address validation error:', error);
        return NextResponse.json(
            {
                success: false,
                isValid: false,
                message: 'Address validation service error'
            },
            { status: 500 }
        );
    }
}