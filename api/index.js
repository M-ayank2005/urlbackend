const express = require('express');
const cors = require('cors');

const app = express();
const urlRouter = require('./url');
const { connect } = require('./connect');
const URL = require('../models/url');

app.use(express.json());
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'], 
    allowedHeaders: ['Content-Type', 'Authorization'], 
}));
connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.error('Error connecting to MongoDB', err);
    });

// Route for handling the shortened URL
app.get('/:shortID', async (req, res) => {
    const shortID = req.params.shortID;
    try {
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
            res.redirect(result.redirectURL);
        } else {
            res.status(404).send('Short URL not found');
        }
    } catch (error) {
        console.error('Error fetching the short URL:', error);
        res.status(500).send('Internal Server Error'); 
    }
});

app.use("/api/url", urlRouter);
// app.listen(3000, () => console.log('Server running on port 3000'));
module.exports = app;
