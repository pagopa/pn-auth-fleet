const LOLLIPOP_HEADERS_PREFIX = 'x-pagopa-lollipop-';
const SIGNATURE_HEADERS = ['signature', 'signature-input'];
const REQUIRED_HEADERS = [
    'x-pagopa-lollipop-user-id',
    'x-pagopa-lollipop-auth-jwt',
    'signature',
    'signature-input'
];
const SENSITIVE_KEYS = [
   // 'x-pagopa-lollipop-auth-jwt',
   // 'x-pagopa-lollipop-public-key',
   // 'x-pagopa-lollipop-assertion-ref',
   // 'signature',
    'test-sensitive-header'
];

function extractLollipopHeaders(headers) {
    const lollipopHeaders = {};
    for (const [key, value] of Object.entries(headers || {})) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.startsWith(LOLLIPOP_HEADERS_PREFIX) || SIGNATURE_HEADERS.includes(lowerKey)) {
            lollipopHeaders[key] = value;
        }
    }

    return lollipopHeaders;
}

function validateLollipopHeaders(lollipopHeaders) {
    const missing = [];
    for (const required of REQUIRED_HEADERS) {
        const found = Object.keys(lollipopHeaders).some(key => key.toLowerCase() === required);
        if (!found) {
            missing.push(required);
        }
    }

    return {
        valid: missing.length === 0,
        missing: missing
    };
}

function maskSensitiveHeaders(lollipopHeaders) {
    const masked = { ...lollipopHeaders };

    for (const key of Object.keys(masked)) {
        const lowerKey = key.toLowerCase();

        const isSensitive = SENSITIVE_KEYS.some(sensitive => {
            const lowerSensitive = sensitive.toLowerCase();
            if (lowerSensitive === 'signature') {
                return lowerKey === 'signature';
            }
            return lowerKey.includes(lowerSensitive);
        });
        if (isSensitive) {
            const value = masked[key];
            if (typeof value === 'string' && value.length > 20) {
                masked[key] = value.substring(0, 10) + '...[MASKED]...' + value.substring(value.length - 10);
            } else if (typeof value === 'string') {
                masked[key] = '[MASKED]';
            }
        }
    }
    return masked;
}

function extractLollipopInfo(lollipopHeaders) {
    const info = {};
    for (const [key, value] of Object.entries(lollipopHeaders)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'x-pagopa-lollipop-user-id') {
            info.userId = value;
        } else if (lowerKey === 'x-pagopa-lollipop-original-method') {
            info.originalMethod = value;
        } else if (lowerKey === 'x-pagopa-lollipop-assertion-type') {
            info.assertionType = value;
        } else if (lowerKey === 'x-pagopa-lollipop-original-url') {
            info.originalUrl = value;
        }
    }
    return info;
}

module.exports={
    extractLollipopInfo,
    extractLollipopHeaders,
    validateLollipopHeaders,
    maskSensitiveHeaders,
}