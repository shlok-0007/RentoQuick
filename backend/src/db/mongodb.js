const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/rentoquick');
        console.log(`\n✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
