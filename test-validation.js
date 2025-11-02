// Test the URL validation function directly
const isValidURL = (url) => {
    try {
        // First, try to create URL object - basic validation
        const urlObj = new URL(url);
        
        // Check protocol
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            console.log('Invalid protocol:', urlObj.protocol);
            return false;
        }
        
        // Check if it has a valid hostname
        if (!urlObj.hostname || urlObj.hostname.length === 0) {
            console.log('No hostname found');
            return false;
        }
        
        // Additional security check: block localhost and private IPs in production only
        if (process.env.NODE_ENV === 'production') {
            const hostname = urlObj.hostname.toLowerCase();
            
            if (hostname === 'localhost' || 
                hostname === '127.0.0.1' || 
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                hostname.startsWith('172.16.')) {
                console.log('Blocked private IP/localhost:', hostname);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.log('URL validation error:', error.message);
        return false;
    }
};

// Test cases
console.log('\n=== Testing URL Validation ===\n');

const testURLs = [
    'https://google.com',
    'http://google.com',
    'https://www.google.com',
    'google.com',
    'http://localhost:3000',
    'https://example.com/path/to/page',
    'ftp://example.com',
    ''
];

testURLs.forEach(url => {
    console.log(`Testing: "${url}"`);
    const result = isValidURL(url);
    console.log(`Result: ${result ? '✅ VALID' : '❌ INVALID'}`);
    console.log('---');
});

console.log('\nNODE_ENV:', process.env.NODE_ENV || 'undefined (development)');
