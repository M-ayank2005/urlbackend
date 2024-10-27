const nanoid=require('nano-id');
const URL = require('../models/url');
async function handleGenerateNewShortURL(req,res) {
    const body = req.body;
    if (!body.url) {
        return res.status(400).json({ error: 'URL is required' });
    } 
    const shortID = nanoid(6);
    try {
        await URL.create({
            shortID: shortID,
            redirectURL: body.url,
            visitHistory: []
        });
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.json({ id: shortID }); 
}
 async function handleGetAnalytics(req,res) {
    const shortID = req.params.shortID;
    const result = await URL.findOne({ shortID});
    return res.json({totalClicks: result.visitHistory.length});
 }
module.exports={
    handleGenerateNewShortURL,
    handleGetAnalytics
}