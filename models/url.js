const mongoose=require('mongoose');

const urlSchema = new mongoose.Schema({
    shortID:{
        type: String,
        required: true,
        unique: true,
    },
    redirectURL: {
        type: String,
        required: true
    },
    visitHistory:[
        {
            timeStamp:{
                type :Number,
                required: true
            }
        }
    ]
},
{
    timestamps: true
});

// Add index for faster lookups on shortID
urlSchema.index({ shortID: 1 });

const URL = mongoose.model('url', urlSchema);
module.exports = URL;