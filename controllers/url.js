const nanoid = require('nano-id');
const validator = require('validator');
const URL = require('../models/url');
const { urlCache } = require('../services/cache');

// URL validation helper
const isValidURL = (url) => {
    try {
        // Check if URL is valid and uses http/https protocol
        if (!validator.isURL(url, { 
            protocols: ['http', 'https'], 
            require_protocol: true 
        })) {
            return false;
        }
        
        // Additional security check: block localhost and private IPs in production
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        // Block common malicious patterns
        if (hostname === 'localhost' || 
            hostname === '127.0.0.1' || 
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.16.')) {
            return false;
        }
        
        return true;
    } catch (error) {
        return false;
    }
};

async function handleGenerateNewShortURL(req, res) {
    const body = req.body;
    
    // Input validation
    if (!body.url) {
        return res.status(400).json({ 
            error: 'URL is required',
            success: false 
        });
    }
    
    // Validate URL format
    if (!isValidURL(body.url)) {
        return res.status(400).json({ 
            error: 'Invalid URL format. Please provide a valid HTTP/HTTPS URL.',
            success: false 
        });
    }
    
    // Check if URL already exists in database to avoid duplicates
    try {
        const existingURL = await URL.findOne({ redirectURL: body.url });
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
            const existingID = await URL.findOne({ shortID });
            
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
        const newURL = await URL.create({
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
        const result = await URL.findOne({ shortID });
        
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