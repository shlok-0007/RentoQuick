const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    name: {
        type: String,
        required: [true, 'Please name this search'],
        maxlength: 100,
    },
    filters: {
        type: {
            search: String,
            category: String,
            city: String,
            condition: String,
            minPrice: Number,
            maxPrice: Number,
        },
        validate: {
            validator: function(v) {
                // Ensure the value exists before checking
                if (!v) return true; 
                // Check if any key starts with '$'
                const stringified = JSON.stringify(v);
                return !stringified.match(/"\$\w+"/);
            },
            message: 'Operator keys are not allowed in filters'
        }
    },
    alertEnabled: {
        type: Boolean,
        default: true,
    },
    lastNotified: Date,
}, {
    timestamps: true,
});

// Indexing for performance
savedSearchSchema.index({ user: 1, createdAt: -1 });

// Ensure strict mode is set
savedSearchSchema.set('strict', true);

module.exports = mongoose.model('SavedSearch', savedSearchSchema);