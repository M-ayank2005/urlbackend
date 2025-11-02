const nanoid = require('nano-id');
const URLModel = require('../models/url'); // Renamed to avoid conflict with global URL
const { urlCache } = require('../services/cache');

// URL validation helper - using native URL constructor
const isValidURL = (urlString) => {
    try {
        console.log('Validating URL:', urlString);
        console.log('Type of URL:', typeof urlString);
        
        // First, try to create URL object - basic validation
        const urlObj = new URL(urlString);
        
        console.log('URL parsed successfully');
        console.log('Protocol:', urlObj.protocol);
        console.log('Hostname:', urlObj.hostname);
        
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
        
        console.log('Validation passed!');
        return true;
    } catch (error) {
        console.log('URL validation error:', error.message);
        return false;
    }
};

async function handleGenerateNewShortURL(req, res) {
    const body = req.body;
    
    // Debug logging
    console.log('Received request body:', JSON.stringify(body));
    console.log('URL received:', body.url);
    
    // Input validation
    if (!body.url) {
        console.log('Error: No URL provided');
        return res.status(400).json({ 
            error: 'URL is required',
            success: false 
        });
    }
    
    // Validate URL format
    const validationResult = isValidURL(body.url);
    console.log('Validation result for', body.url, ':', validationResult);
    
    if (!validationResult) {
        console.log('Error: URL validation failed for', body.url);
        return res.status(400).json({ 
            error: `Invalid URL format. Please provide a valid HTTP/HTTPS URL. Received: ${body.url}`,
            success: false 
        });
    }
    
    // Check if URL already exists in database to avoid duplicates
    try {
        const existingURL = await URLModel.findOne({ redirectURL: body.url });
        if (existingURL) {
            // Cache the existing URL
            urlCache.set(existingURL.shortID, existingURL.redirectURL);
            
            return res.json({ 
                id: existingURL.shortID,
                success: true,
                message: 'URL already exists'
            });
        }
    } catch (error) {
        console.error('Error checking existing URL:', error);
    }
    
    // Generate short ID with collision handling
    let shortID;
    let attempts = 0;
    const maxAttempts = 5;
    
    try {
        while (attempts < maxAttempts) {
            shortID = nanoid(8); // Increased from 6 to 8 for lower collision probability
            
            // Check if shortID already exists
            const existingID = await URLModel.findOne({ shortID });
            
            if (!existingID) {
                break; // Found unique ID
            }
            
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            return res.status(500).json({ 
                error: 'Failed to generate unique short ID. Please try again.',
                success: false 
            });
        }
        
        // Create new URL entry
        const newURL = await URLModel.create({
            shortID: shortID,
            redirectURL: body.url,
            visitHistory: []
        });
        
        // Cache the new URL for fast access
        urlCache.set(shortID, body.url);
        
        res.json({ 
            id: shortID,
            success: true 
        });
        
    } catch (error) {
        console.error('Error creating short URL:', error);
        return res.status(500).json({ 
            error: 'Internal Server Error. Please try again later.',
            success: false 
        });
    }
}

async function handleGetAnalytics(req, res) {
    const shortID = req.params.shortID;
    
    // Validation
    if (!shortID) {
        return res.status(400).json({ 
            error: 'Short ID is required',
            success: false 
        });
    }
    
    try {
        const result = await URLModel.findOne({ shortID });
        
        if (!result) {
            return res.status(404).json({ 
                error: 'Short URL not found',
                success: false 
            });
        }
        
        return res.json({
            totalClicks: result.visitHistory.length,
            createdAt: result.createdAt,
            analytics: result.visitHistory,
            success: true
        });
        
    } catch (error) {
        console.error('Error fetching analytics:', error);
        return res.status(500).json({ 
            error: 'Internal Server Error',
            success: false 
        });
    }
}

module.exports = {
    handleGenerateNewShortURL,
    handleGetAnalytics
};