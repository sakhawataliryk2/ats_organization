// lib/validation/addressValidation.ts

export interface AddressValidationResult {
    isValid: boolean;
    message: string;
    suggestions?: AddressSuggestion[];
    confidence?: number;
    standardized?: AddressSuggestion;
}

export interface AddressSuggestion {
    address: string;
    city: string;
    state: string;
    zip: string;
    formatted: string;
    confidence?: number;
}

export interface AddressInput {
    address: string;
    city: string;
    state: string;
    zip: string;
}

// US State abbreviations for validation
const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC'
];

// ZIP code regex pattern
const ZIP_REGEX = /^(\d{5})(-\d{4})?$/;

// Basic client-side validation
export const validateAddressFormat = (addressData: AddressInput): AddressValidationResult => {
    const { address, city, state, zip } = addressData;

    // Check required fields
    if (!address.trim()) {
        return {
            isValid: false,
            message: 'Street address is required'
        };
    }

    if (!city.trim()) {
        return {
            isValid: false,
            message: 'City is required'
        };
    }

    if (!state.trim()) {
        return {
            isValid: false,
            message: 'State is required'
        };
    }

    // Validate state format
    if (!US_STATES.includes(state.toUpperCase())) {
        return {
            isValid: false,
            message: 'Please enter a valid US state abbreviation (e.g., CA, NY, TX)'
        };
    }

    // Validate ZIP code format
    if (zip.trim() && !ZIP_REGEX.test(zip.trim())) {
        return {
            isValid: false,
            message: 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)'
        };
    }

    return {
        isValid: true,
        message: 'Address format is valid'
    };
};

// Main validation function - calls API route
export const validateAddress = async (addressData: AddressInput): Promise<AddressValidationResult> => {
    // First check basic format
    const formatValidation = validateAddressFormat(addressData);
    if (!formatValidation.isValid) {
        return formatValidation;
    }

    try {
        // Call the API route for server-side validation
        const response = await fetch('/api/validate/address', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(addressData)
        });

        if (!response.ok) {
            throw new Error('Address validation API error');
        }

        const data = await response.json();

        if (data.success) {
            return {
                isValid: data.isValid,
                message: data.message,
                suggestions: data.suggestions,
                confidence: data.confidence,
                standardized: data.standardized
            };
        } else {
            throw new Error(data.message || 'Address validation failed');
        }

    } catch (error) {
        console.error('Address validation service error:', error);

        return {
            isValid: formatValidation.isValid,
            message: 'Address validation service temporarily unavailable',
            confidence: 0.5
        };
    }
};

// Server-side validation function (for API route)
export const validateAddressServer = async (addressData: AddressInput): Promise<AddressValidationResult> => {
    // First check basic format
    const formatValidation = validateAddressFormat(addressData);
    if (!formatValidation.isValid) {
        return formatValidation;
    }

    try {
        // Option 1: USPS API (free but requires registration)
        if (process.env.USPS_USER_ID) {
            return await validateWithUSPS(addressData);
        }

        // Option 2: Google Maps Geocoding API
        if (process.env.GOOGLE_MAPS_API_KEY) {
            return await validateWithGoogleMaps(addressData);
        }

        // Option 3: SmartyStreets API
        if (process.env.SMARTYSTREETS_AUTH_ID && process.env.SMARTYSTREETS_AUTH_TOKEN) {
            return await validateWithSmartyStreets(addressData);
        }

        // Option 4: Abstract API
        if (process.env.ABSTRACT_API_KEY) {
            return await validateWithAbstractAPI(addressData);
        }

        // Fallback to format validation only
        return {
            isValid: true,
            message: 'Address format validated (external validation unavailable)',
            confidence: 0.7
        };

    } catch (error) {
        console.error('Address validation service error:', error);

        return {
            isValid: formatValidation.isValid,
            message: 'Address validation service temporarily unavailable',
            confidence: 0.5
        };
    }
};

// USPS Address Validation (free but limited)
const validateWithUSPS = async (addressData: AddressInput): Promise<AddressValidationResult> => {
    const { address, city, state, zip } = addressData;

    // USPS XML API endpoint
    const xmlRequest = `
        <AddressValidateRequest USERID="${process.env.USPS_USER_ID}">
            <Address ID="0">
                <Address1></Address1>
                <Address2>${encodeXML(address)}</Address2>
                <City>${encodeXML(city)}</City>
                <State>${state.toUpperCase()}</State>
                <Zip5>${zip.split('-')[0] || ''}</Zip5>
                <Zip4></Zip4>
            </Address>
        </AddressValidateRequest>
    `;

    const response = await fetch(
        `https://secure.shippingapis.com/ShippingAPI.dll?API=Verify&XML=${encodeURIComponent(xmlRequest)}`
    );

    const xmlText = await response.text();

    // Parse XML response (simplified - in production, use a proper XML parser)
    if (xmlText.includes('<Error>')) {
        return {
            isValid: false,
            message: 'Address not found in USPS database'
        };
    }

    // Extract standardized address from XML
    const addressMatch = xmlText.match(/<Address2>(.*?)<\/Address2>/);
    const cityMatch = xmlText.match(/<City>(.*?)<\/City>/);
    const stateMatch = xmlText.match(/<State>(.*?)<\/State>/);
    const zipMatch = xmlText.match(/<Zip5>(.*?)<\/Zip5>/);
    const zip4Match = xmlText.match(/<Zip4>(.*?)<\/Zip4>/);

    if (addressMatch && cityMatch && stateMatch && zipMatch) {
        const standardized: AddressSuggestion = {
            address: addressMatch[1],
            city: cityMatch[1],
            state: stateMatch[1],
            zip: zip4Match?.[1] ? `${zipMatch[1]}-${zip4Match[1]}` : zipMatch[1],
            formatted: `${addressMatch[1]}, ${cityMatch[1]}, ${stateMatch[1]} ${zipMatch[1]}${zip4Match?.[1] ? `-${zip4Match[1]}` : ''}`
        };

        return {
            isValid: true,
            message: 'Address verified by USPS',
            standardized,
            confidence: 1.0
        };
    }

    return {
        isValid: false,
        message: 'Unable to verify address with USPS'
    };
};

// Google Maps Geocoding API validation
const validateWithGoogleMaps = async (addressData: AddressInput): Promise<AddressValidationResult> => {
    const { address, city, state, zip } = addressData;
    const fullAddress = `${address}, ${city}, ${state} ${zip}`;

    const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const components = result.address_components;

        // Extract address components
        const streetNumber = components.find((c: any) => c.types.includes('street_number'))?.long_name || '';
        const streetName = components.find((c: any) => c.types.includes('route'))?.long_name || '';
        const cityName = components.find((c: any) => c.types.includes('locality'))?.long_name || '';
        const stateName = components.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name || '';
        const zipCode = components.find((c: any) => c.types.includes('postal_code'))?.long_name || '';

        const standardized: AddressSuggestion = {
            address: `${streetNumber} ${streetName}`.trim(),
            city: cityName,
            state: stateName,
            zip: zipCode,
            formatted: result.formatted_address
        };

        // Check if input matches standardized version closely
        const isExactMatch =
            standardized.city.toLowerCase() === city.toLowerCase() &&
            standardized.state.toUpperCase() === state.toUpperCase();

        return {
            isValid: true,
            message: isExactMatch ? 'Address verified' : 'Address found with corrections',
            standardized,
            suggestions: isExactMatch ? undefined : [standardized],
            confidence: result.geometry.location_type === 'ROOFTOP' ? 1.0 : 0.8
        };
    }

    return {
        isValid: false,
        message: 'Address not found'
    };
};

// SmartyStreets API validation
const validateWithSmartyStreets = async (addressData: AddressInput): Promise<AddressValidationResult> => {
    const { address, city, state, zip } = addressData;

    const response = await fetch('https://us-street.api.smartystreets.com/street-address', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${process.env.SMARTYSTREETS_AUTH_ID}:${process.env.SMARTYSTREETS_AUTH_TOKEN}`).toString('base64')}`
        },
        body: JSON.stringify([{
            street: address,
            city: city,
            state: state,
            zipcode: zip
        }])
    });

    const data = await response.json();

    if (data.length > 0) {
        const result = data[0];
        const standardized: AddressSuggestion = {
            address: result.delivery_line_1,
            city: result.components.city_name,
            state: result.components.state_abbreviation,
            zip: `${result.components.zipcode}${result.components.plus4_code ? `-${result.components.plus4_code}` : ''}`,
            formatted: `${result.delivery_line_1}, ${result.components.city_name}, ${result.components.state_abbreviation} ${result.components.zipcode}`
        };

        return {
            isValid: true,
            message: 'Address verified by SmartyStreets',
            standardized,
            confidence: 1.0
        };
    }

    return {
        isValid: false,
        message: 'Address not found in SmartyStreets database'
    };
};

// Abstract API validation
const validateWithAbstractAPI = async (addressData: AddressInput): Promise<AddressValidationResult> => {
    const { address, city, state, zip } = addressData;

    const response = await fetch(
        `https://addressvalidation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_API_KEY}&address=${encodeURIComponent(address)}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&zip_code=${encodeURIComponent(zip)}`
    );

    const data = await response.json();

    if (data.is_valid) {
        return {
            isValid: true,
            message: 'Address verified',
            confidence: 0.9
        };
    }

    return {
        isValid: false,
        message: data.validation_message || 'Address validation failed'
    };
};

// Helper function to encode XML entities
const encodeXML = (str: string): string => {
    return str.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};