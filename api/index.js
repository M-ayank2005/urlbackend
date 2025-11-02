const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const urlRouter = require('./url');
const { connect } = require('./connect');
const URL = require('../models/url');
const { urlCache, getCacheStats } = require('../services/cache');

// Body parser middleware - BEFORE other middleware
app.use(express.json({ limit: '10kb' })); // Limit payload size

// CORS configuration - CRITICAL: Must be before helmet and other middleware
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://url-short-beryl.vercel.app', // Fixed: removed trailing slash
    'https://urlbackend-3bwm.onrender.com' // Add your backend URL too
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, curl, etc.)
        if (!origin) return callback(null, true);
        
        // Check if origin is in whitelist
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // For debugging - log blocked origins
            console.log('Blocked origin:', origin);
            callback(null, true); // TEMP: Allow all for now, change to false in strict production
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization'], 
    credentials: true,
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

// Security middleware - Configure helmet to not interfere with CORS
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
}));

const createLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10, 
    message: {
        error: 'Too many URLs created from this IP, please try again after 15 minutes.',
        success: false
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting for URL redirection - prevents DDoS
const redirectLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 30 redirects per minute
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Database connection
connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.error('Error connecting to MongoDB', err);
    });

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        cache: getCacheStats()
    });
});

// Apply rate limiter to URL creation routes
app.use("/api/url", createLimiter, urlRouter);

// Route for handling the shortened URL with caching
app.get('/:shortID', redirectLimiter, async (req, res) => {
    const shortID = req.params.shortID;
    
    // Input validation
    if (!shortID || shortID.length < 6 || shortID.length > 10) {
        return res.status(400).send('Invalid short URL format');
    }
    
    try {
        // Check cache first
        const cachedURL = urlCache.get(shortID);
        
        if (cachedURL) {
            // Cache hit - update visit history in background (don't wait)
            URL.findOneAndUpdate(
                { shortID },
                {
                    $push: {
                        visitHistory: {
                            timeStamp: Date.now()
                        }
                    }
                }
            ).catch(err => console.error('Error updating visit history:', err));
            
            // Immediate redirect from cache
            return res.redirect(cachedURL);
        }
        
        // Cache miss - fetch from database
        const result = await URL.findOneAndUpdate(
            { shortID },
            {
                $push: {
                    visitHistory: {
                        timeStamp: Date.now()
                    }
                }
            },
            { new: true }
        );

        if (result) {
            // Store in cache for future requests
            urlCache.set(shortID, result.redirectURL);
            res.redirect(result.redirectURL);
        } else {
            res.status(404).send('Short URL not found');
        }
    } catch (error) {
        console.error('Error fetching the short URL:', error);
        res.status(500).send('Internal Server Error'); 
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = app;
