const express=require('express');
const router=express.Router();

// Note: URL model is imported in controller, not needed here
const {handleGenerateNewShortURL,handleGetAnalytics}=require('../controllers/url');

router.post('/',handleGenerateNewShortURL);
router.get('/analytics/:shortID',handleGetAnalytics);

module.exports=router;