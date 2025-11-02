const NodeCache = require('node-cache');

// Create cache with TTL of 1 hour (3600 seconds)
// checkperiod: 120 seconds - automatically delete expired keys
const urlCache = new NodeCache({ 
    stdTTL: 3600, 
    checkperiod: 120,
    useClones: false // Better performance, don't clone objects
});

// Cache statistics for monitoring
const getCacheStats = () => {
    return {
        keys: urlCache.keys().length,
        hits: urlCache.getStats().hits,
        misses: urlCache.getStats().misses,
        ksize: urlCache.getStats().ksize,
        vsize: urlCache.getStats().vsize
    };
};

module.exports = {
    urlCache,
    getCacheStats
};
