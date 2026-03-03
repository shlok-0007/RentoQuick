require('dotenv').config();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Initialize empty db first
const DB_DIR = path.join(__dirname, '../../db');
const DB_FILE = path.join(DB_DIR, 'data.json');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

// Clear existing data
fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], listings: [], bookings: [] }, null, 2));
console.log('🗑️  Cleared existing data');

const { Users, Listings, generateId } = require('../db/fileDB');

async function seed() {
    console.log('🌱 Seeding RentoQuick file database...\n');

    // ── Users ─────────────────────────────────────────────────────────────────
    const password = await bcrypt.hash('password123', 10);

    const u1 = Users.create({
        name: 'Arjun Sharma', email: 'arjun@example.com', password,
        phone: '9876543210', bio: 'Hobbyist photographer & tech enthusiast.',
        location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
        isVerified: true, rating: { average: 4.8, count: 12 },
    });
    const u2 = Users.create({
        name: 'Priya Patel', email: 'priya@example.com', password,
        phone: '9876501234', bio: 'Outdoor adventure lover & fitness coach.',
        location: { city: 'Bangalore', state: 'Karnataka', country: 'India' },
        isVerified: true, rating: { average: 4.9, count: 8 },
    });
    const u3 = Users.create({
        name: 'Rahul Gupta', email: 'rahul@example.com', password,
        phone: '9811234567', bio: 'DIY enthusiast and tools collector.',
        location: { city: 'Delhi', state: 'Delhi', country: 'India' },
        isVerified: true, rating: { average: 4.7, count: 15 },
    });

    console.log(`✅ Created ${3} users`);

    // ── Listings ──────────────────────────────────────────────────────────────
    const listingData = [
        {
            title: 'Sony A7 III Mirrorless Camera',
            description: 'Professional full-frame mirrorless camera, perfect for photography & videography. Includes 28-70mm kit lens, 2 batteries, charger, and carrying case.',
            category: 'Cameras & Photography', condition: 'Like New',
            pricePerDay: 1200, pricePerWeek: 7000, pricePerMonth: 24000, securityDeposit: 5000,
            images: [{ url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600', alt: 'Sony A7 III' }],
            owner: u1._id, location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
            features: ['Full-frame sensor', '24.2MP', '4K Video', 'Image stabilization', 'Kit lens included'],
            tags: ['sony', 'camera', 'mirrorless', 'photography', 'video'],
            isFeatured: true, rating: { average: 4.9, count: 7 },
        },
        {
            title: 'DJI Mini 3 Pro Drone',
            description: 'Lightweight drone (249g) with 4K/60fps camera and 3-axis gimbal stabilization. No drone license needed! Perfect for travel, events, and aerial photography.',
            category: 'Cameras & Photography', condition: 'Good',
            pricePerDay: 1500, pricePerWeek: 8500, securityDeposit: 8000,
            images: [{ url: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600', alt: 'DJI Drone' }],
            owner: u1._id, location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
            features: ['4K/60fps', '3-axis gimbal', '34 min flight time', '2 batteries included'],
            tags: ['dji', 'drone', 'aerial', 'photography'],
            isFeatured: true, rating: { average: 4.8, count: 5 },
        },
        {
            title: 'Trek Domane AL3 Road Bike',
            description: 'Lightweight aluminum road bike, perfect for city rides and casual racing. Professionally serviced and ready to ride.',
            category: 'Sports & Outdoors', condition: 'Good',
            pricePerDay: 350, pricePerWeek: 2000, securityDeposit: 2000,
            images: [{ url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600', alt: 'Road Bike' }],
            owner: u2._id, location: { city: 'Bangalore', state: 'Karnataka', country: 'India' },
            features: ['21-speed', 'Alloy frame', 'Helmet included', 'Lock included'],
            tags: ['bike', 'cycling', 'road bike', 'trek'],
            isFeatured: true, rating: { average: 4.7, count: 3 },
        },
        {
            title: 'Festool Cordless Drill Set',
            description: 'Professional grade cordless drill set with 2 batteries. Perfect for home improvement and construction projects.',
            category: 'Tools & Equipment', condition: 'Good',
            pricePerDay: 400, pricePerWeek: 2200, securityDeposit: 1500,
            images: [{ url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600', alt: 'Power Drill' }],
            owner: u3._id, location: { city: 'Delhi', state: 'Delhi', country: 'India' },
            features: ['18V Li-ion', '2 batteries', 'Carry case', '25 drill bits'],
            tags: ['drill', 'power tools', 'festool', 'cordless'],
            rating: { average: 4.6, count: 4 },
        },
        {
            title: 'Yamaha FZ-S Motorcycle',
            description: 'Fuel-injected street commuter motorcycle. Excellent city fuel economy. Valid license required. Includes helmet.',
            category: 'Vehicles', condition: 'Good',
            pricePerDay: 600, pricePerWeek: 3500, pricePerMonth: 12000, securityDeposit: 3000,
            images: [{ url: 'https://images.unsplash.com/photo-1558618047-3c8c69c01cc7?w=600', alt: 'Motorcycle' }],
            owner: u2._id, location: { city: 'Bangalore', state: 'Karnataka', country: 'India' },
            features: ['Fuel injection', '149cc', 'License required', 'Helmet included', 'Full tank'],
            tags: ['motorcycle', 'yamaha', 'bike', 'two-wheeler'],
            isFeatured: true, rating: { average: 4.5, count: 6 },
        },
        {
            title: 'Bose QuietComfort 45 Headphones',
            description: 'Premium ANC headphones with 24-hour battery, carrying case, and charging cable. Perfect for work, travel, and WFH setups.',
            category: 'Electronics', condition: 'Like New',
            pricePerDay: 300, pricePerWeek: 1600, securityDeposit: 2000,
            images: [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', alt: 'Headphones' }],
            owner: u1._id, location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
            features: ['Active Noise Cancellation', '24hr battery', 'Foldable', 'USB-C charging'],
            tags: ['bose', 'headphones', 'anc', 'audio'],
            rating: { average: 4.8, count: 9 },
        },
        {
            title: 'Camping Tent — 4-Person Waterproof',
            description: 'Double-wall, waterproof 4-person tent with UV protection. Includes rain fly, tent poles, stakes, and carry bag.',
            category: 'Sports & Outdoors', condition: 'Good',
            pricePerDay: 450, pricePerWeek: 2500, securityDeposit: 1000,
            images: [{ url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600', alt: 'Camping Tent' }],
            owner: u3._id, location: { city: 'Delhi', state: 'Delhi', country: 'India' },
            features: ['4-person capacity', '3000mm waterproof', 'UV protection', 'Easy setup (10 min)'],
            tags: ['tent', 'camping', 'outdoor', 'trekking', 'adventure'],
            isFeatured: true, rating: { average: 4.4, count: 6 },
        },
        {
            title: 'Apple MacBook Pro M2 14"',
            description: 'High-performance laptop with Apple M2 chip, 16GB RAM, 512GB SSD. Ideal for video editing, coding, and creative work. Charger included.',
            category: 'Electronics', condition: 'Like New',
            pricePerDay: 2000, pricePerWeek: 11000, pricePerMonth: 38000, securityDeposit: 10000,
            images: [{ url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600', alt: 'MacBook Pro' }],
            owner: u2._id, location: { city: 'Bangalore', state: 'Karnataka', country: 'India' },
            features: ['M2 chip', '16GB RAM', '512GB SSD', '18hr battery', 'Charger included'],
            tags: ['macbook', 'laptop', 'apple', 'm2', 'computer'],
            isFeatured: true, rating: { average: 5.0, count: 3 },
        },
    ];

    let listingCount = 0;
    for (const data of listingData) {
        Listings.create(data);
        listingCount++;
    }
    console.log(`✅ Created ${listingCount} listings`);

    const allListings = Listings.find({ isActive: true });
    const totalUsers = Users.find().length;
    console.log(`\n🎉 Seeding complete!\n`);
    console.log(`   Users:    ${totalUsers}`);
    console.log(`   Listings: ${allListings.length}`);
    console.log(`\n📧 Demo credentials:`);
    console.log(`   arjun@example.com / password123`);
    console.log(`   priya@example.com / password123`);
    console.log(`   rahul@example.com / password123\n`);
}

seed().catch(console.error);
