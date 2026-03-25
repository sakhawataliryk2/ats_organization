// lib/validation/emailValidation.ts

export interface EmailValidationResult {
    isValid: boolean;
    message: string;
    suggestion?: string;
    deliverable?: boolean;
    riskLevel?: 'low' | 'medium' | 'high';
}

// Basic email regex for client-side validation
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Common disposable email domains to flag
const disposableDomains = [
    '10minutemail.com',
    'tempmail.org',
    'guerrillamail.com',
    'mailinator.com',
    'yopmail.com',
    '0-mail.com',
    'trashmail.com'
];

// Basic domain validation - could be expanded
const validateDomain = (domain: string): boolean => {
    // Check for disposable email domains
    if (disposableDomains.includes(domain.toLowerCase())) {
        return false;
    }

    // Basic domain format check
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,})$/;
    return domainRegex.test(domain);
};

// Client-side validation (always runs first)
export const validateEmailFormat = (email: string): EmailValidationResult => {
    if (!email.trim()) {
        return {
            isValid: false,
            message: 'Email address is required'
        };
    }

    if (!emailRegex.test(email)) {
        return {
            isValid: false,
            message: 'Please enter a valid email format'
        };
    }

    const [localPart, domain] = email.split('@');

    if (localPart.length > 64) {
        return {
            isValid: false,
            message: 'Email address is too long'
        };
    }

    if (!validateDomain(domain)) {
        return {
            isValid: false,
            message: 'Please use a business email address'
        };
    }

    return {
        isValid: true,
        message: 'Email format is valid'
    };
};

// Client-side validation that calls the API route
export const validateEmail = async (email: string): Promise<EmailValidationResult> => {
    // First check basic format
    const formatValidation = validateEmailFormat(email);
    if (!formatValidation.isValid) {
        return formatValidation;
    }

    try {
        // Call the API route for server-side validation
        const response = await fetch('/api/validate/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            throw new Error('Email validation API error');
        }

        const data = await response.json();

        if (data.success) {
            return {
                isValid: data.isValid,
                message: data.message,
                suggestion: data.suggestion,
                deliverable: data.deliverable,
                riskLevel: data.riskLevel
            };
        } else {
            throw new Error(data.message || 'Email validation failed');
        }

    } catch (error) {
        console.error('Email validation service error:', error);

        // Return format validation result if service fails
        return {
            isValid: formatValidation.isValid,
            message: 'Email validation service temporarily unavailable',
            riskLevel: 'medium'
        };
    }
};

// Server-side validation using Never bounce or similar service (for API route)
export const validateEmailServer = async (email: string): Promise<EmailValidationResult> => {
    // First check basic format
    const formatValidation = validateEmailFormat(email);
    if (!formatValidation.isValid) {
        return formatValidation;
    }

    try {
        // Option 1: Never bounce API
        if (process.env.NEVER_BOUNCE_API_KEY) {
            return await validateWithNeverBounce(email);
        }

        // Option 2: Mailgun API
        if (process.env.MAILGUN_API_KEY) {
            return await validateWithMailgun(email);
        }

        // Option 3: Abstract API (free tier available)
        if (process.env.ABSTRACT_API_KEY) {
            return await validateWithAbstractAPI(email);
        }

        // Fallback to format validation only
        return {
            isValid: true,
            message: 'Email format validated (external validation unavailable)',
            riskLevel: 'medium'
        };

    } catch (error) {
        console.error('Email validation service error:', error);

        // Return format validation result if service fails
        return {
            isValid: formatValidation.isValid,
            message: 'Email validation service temporarily unavailable',
            riskLevel: 'medium'
        };
    }
};

// Never bounce integration
const validateWithNeverBounce = async (email: string): Promise<EmailValidationResult> => {
    const response = await fetch(`https://api.neverbounce.com/v4/single/check`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            key: process.env.NEVER_BOUNCE_API_KEY,
            email: email,
            timeout: 30
        })
    });

    if (!response.ok) {
        throw new Error('Never bounce API error');
    }

    const data = await response.json();

    switch (data.result) {
        case 'valid':
            return {
                isValid: true,
                message: 'Email address is valid and deliverable',
                deliverable: true,
                riskLevel: 'low'
            };
        case 'invalid':
            return {
                isValid: false,
                message: 'Email address is invalid',
                deliverable: false,
                riskLevel: 'high'
            };
        case 'disposable':
            return {
                isValid: false,
                message: 'Please use a business email address (disposable email detected)',
                deliverable: false,
                riskLevel: 'high'
            };
        case 'catchall':
            return {
                isValid: true,
                message: 'Email domain accepts all emails (moderate risk)',
                deliverable: true,
                riskLevel: 'medium'
            };
        case 'unknown':
            return {
                isValid: true,
                message: 'Email deliverability cannot be determined',
                deliverable: false,
                riskLevel: 'medium'
            };
        default:
            return {
                isValid: false,
                message: 'Email validation failed',
                riskLevel: 'high'
            };
    }
};

// Mailgun integration
const validateWithMailgun = async (email: string): Promise<EmailValidationResult> => {
    const response = await fetch(`https://api.mailgun.net/v4/address/validate`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ address: email })
    });

    if (!response.ok) {
        throw new Error('Mailgun API error');
    }

    const data = await response.json();

    if (data.is_valid) {
        return {
            isValid: true,
            message: data.is_disposable_address ?
                'Valid but disposable email detected' :
                'Email address is valid',
            deliverable: true,
            riskLevel: data.is_disposable_address ? 'medium' : 'low',
            suggestion: data.did_you_mean || undefined
        };
    } else {
        return {
            isValid: false,
            message: data.reason || 'Email address is invalid',
            riskLevel: 'high',
            suggestion: data.did_you_mean || undefined
        };
    }
};

// Abstract API integration (has free tier)
const validateWithAbstractAPI = async (email: string): Promise<EmailValidationResult> => {
    const response = await fetch(
        `https://emailvalidation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_API_KEY}&email=${encodeURIComponent(email)}`
    );

    if (!response.ok) {
        throw new Error('Abstract API error');
    }

    const data = await response.json();

    const isValid = data.is_valid_format?.value &&
        data.is_mx_found?.value &&
        !data.is_disposable_email?.value;

    return {
        isValid,
        message: isValid ?
            'Email address is valid' :
            `Email issue: ${data.is_disposable_email?.value ? 'disposable email' : 'invalid format or domain'}`,
        deliverable: data.is_mx_found?.value || false,
        riskLevel: data.is_disposable_email?.value ? 'high' :
            data.quality_score > 0.7 ? 'low' : 'medium'
    };
};