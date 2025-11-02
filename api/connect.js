const mongoose = require("mongoose");

async function connect(uri) {
    try {
        await mongoose.connect(uri); // Removed deprecated options
        console.log("Connected to MongoDB");
    } catch (err) {
        console.error("MongoDB connection error:", err);
    }
}

module.exports = { connect };
