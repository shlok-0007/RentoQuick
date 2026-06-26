const multer = require('multer');
const path = require('path');
const fs = require('fs');

let cloudinary, CloudinaryStorage;

// Check if cloudinary is configured
let isCloudinaryConfigured =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_KEY !== 'your_api_key' &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET !== 'your_cloudinary_api_secret';

let storage;
let avatarStorage;

const imageFileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
        return cb(null, true);
    }
    cb(new Error('Only images (jpg, jpeg, png, webp) are allowed'));
};

if (isCloudinaryConfigured) {
    try {
        cloudinary = require('cloudinary').v2;
        CloudinaryStorage = require('multer-storage-cloudinary').CloudinaryStorage;
    } catch (err) {
        console.warn('⚠️  Cloudinary packages not installed, falling back to local storage');
        isCloudinaryConfigured = false;
    }
}

if (isCloudinaryConfigured) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'rentoquick/listings',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
        },
    });

    // Dedicated storage for avatar uploads
    avatarStorage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'rentoquick/avatars',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            transformation: [{ width: 300, height: 300, crop: 'limit' }]
        },
    });

    console.log('☁️  Cloudinary storage initialized');
} else {
    // Fallback to local storage
    const uploadDir = path.join(__dirname, '../../public/uploads/listings');
    const avatarDir = path.join(__dirname, '../../public/uploads/avatars');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    if (!fs.existsSync(avatarDir)) {
        fs.mkdirSync(avatarDir, { recursive: true });
    }

    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, 'listing-' + uniqueSuffix + path.extname(file.originalname));
        }
    });

    avatarStorage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, avatarDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
        }
    });
    console.log('💾 Local storage initialized (Cloudinary not configured)');
}

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: imageFileFilter
});

const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit for avatars
    fileFilter: imageFileFilter
});

module.exports = { cloudinary, upload, avatarUpload, isCloudinaryConfigured };
