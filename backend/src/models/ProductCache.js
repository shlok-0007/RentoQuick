const mongoose = require('mongoose');

const productCacheSchema = new mongoose.Schema({
  // Normalised lowercase title used as the cache key
  titleKey: {
    type: String,
    required: true,
    trim: true,
  },
  // The AI-generated suggestion payload
  data: {
    category: String,
    description: String,
    suggestedPrice: Number,
    tags: [String],
    categoryMatched: Boolean,
    originalCategory: String,
  },
  // How many times this cache entry was hit
  hitCount: {
    type: Number,
    default: 1,
  },
  // Auto-expire documents after 7 days (TTL index)
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7 * 24 * 60 * 60, // 7 days
  },
});

// Compound unique index so the same titleKey is never duplicated
productCacheSchema.index({ titleKey: 1 }, { unique: true });
// TTL index for automatic cleanup
// productCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model('ProductCache', productCacheSchema);