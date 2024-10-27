const express = require('express');
const cors = require('cors');

const app = express();
const urlRouter = require('./routes/url');
const {connect}=require('./connect');
const URL = require('../models/url');
app.use(express.json()); 
app.use(cors());


connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.error('Error connecting to MongoDB', err);
    });

app.use("/url", urlRouter);

app.get('/:shortID', async (req, res) => {
    const shortID = req.params.shortID;
    const result= await URL.findOneAndUpdate({ 
        shortID },
        {
            $push: {
                visitHistory: {
                    timeStamp: Date.now()
                }
            }
        });
      res.redirect(result.redirectURL);

    }
);

module.exports = app;