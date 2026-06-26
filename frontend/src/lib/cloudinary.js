/**
 * Cloudinary URL Optimizer
 *
 * Appends Cloudinary transformation parameters to raw image URLs
 * to enable automatic quality optimisation and format selection.
 *
 * Usage:
 *   import { optimizeCloudinaryUrl } from '../../lib/cloudinary';
 *   <img src={optimizeCloudinaryUrl(listing.images[0].url, { width: 600, height: 400 })} />
 */

const CLOUDINARY_BASE = 'https://res.cloudinary.com';

/**
 * Optimise a Cloudinary image URL with transformation parameters.
 * If the URL is NOT a Cloudinary URL, it is returned unchanged.
 *
 * @param {string} url          — Raw image URL (e.g. from database)
 * @param {object} options
 * @param {number} [options.width]    — Resize width in px
 * @param {number} [options.height]   — Resize height in px
 * @param {string} [options.crop='fill']  — Crop mode: fill | crop | pad | limit | thumb
 * @param {number} [options.quality]  — Quality 1-100 (omit to let q_auto decide)
 * @param {boolean} [options.fetchFormat=true] — Auto-convert to WebP/AVIF when supported
 * @returns {string} The optimised URL
 */
export function optimizeCloudinaryUrl(url, options = {}) {
    if (!url || typeof url !== 'string') return url || '';

    // Only transform Cloudinary URLs
    if (!url.startsWith(CLOUDINARY_BASE)) return url;

    const {
        width,
        height,
        crop = 'fill',
        quality,
        fetchFormat = true,
    } = options;

    // Build transformation string
    const parts = [];

    if (fetchFormat) {
        parts.push('f_auto');    // Auto WebP/AVIF
        parts.push('q_auto');    // Auto quality
    }

    if (quality && !fetchFormat) {
        parts.push(`q_${quality}`);
    }

    if (width || height) {
        parts.push(`c_${crop}`);
        if (width) parts.push(`w_${width}`);
        if (height) parts.push(`h_${height}`);
    }

    if (parts.length === 0) return url;

    const transformation = parts.join(',');

    // Insert transformation into the Cloudinary URL
    // Format: .../image/upload/{transformation}/{public_id}
    // or:      .../image/upload/{version}/{transformation}/{public_id}
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return url;

    const before = url.substring(0, uploadIndex + 8); // '/upload/'
    const after = url.substring(uploadIndex + 8);

    // Skip if URL already has transformations (starts with 'v' followed by digits or 'c_')
    if (after.match(/^(v\d+|[a-z]_)/)) {
        // Has version or existing transform — insert before it
        const versionMatch = after.match(/^(v\d+\/)/);
        if (versionMatch) {
            return `${before}${transformation}/${after}`;
        }
        // Already has transforms — append ours (rare edge case)
        return `${before}${transformation}/${after}`;
    }

    return `${before}${transformation}/${after}`;
}

/**
 * Quick helper: get a thumbnail-optimised URL (300x200 fill).
 * Perfect for listing cards and autocomplete dropdowns.
 */
export function getThumbnailUrl(url) {
    return optimizeCloudinaryUrl(url, { width: 400, height: 300, crop: 'fill' });
}

/**
 * Quick helper: get a hero-optimised URL (1200x600 fill).
 * Perfect for listing detail page main image when you want a cropped
 * banner look. NOTE: this crops the image to fill the dimensions.
 */
export function getHeroUrl(url) {
    return optimizeCloudinaryUrl(url, { width: 1200, height: 600, crop: 'fill' });
}

/**
 * Quick helper: get a large, aspect-ratio-preserving URL (max 1400x1000).
 * Uses Cloudinary's "limit" crop mode which downsizes the image to fit
 * inside the bounding box WITHOUT cropping — the full product is always
 * visible. Ideal for the detail page main image where cropping the
 * product would hurt usability.
 */
export function getDetailUrl(url) {
    return optimizeCloudinaryUrl(url, { width: 1400, height: 1000, crop: 'limit' });
}

/**
 * Quick helper: get a gallery-optimised URL (800x800 limit).
 * Perfect for detail page gallery thumbnails.
 */
export function getGalleryUrl(url) {
    return optimizeCloudinaryUrl(url, { width: 800, height: 800, crop: 'limit' });
}