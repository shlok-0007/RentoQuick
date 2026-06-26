import {
    Laptop, Car, Wrench, Tent, Camera, Music, Shirt, Sofa, BookOpen, Sparkles,
    Search, Zap, Shield, Package, Users, MapPin, TrendingUp,
    ShieldCheck, Wallet, Clock, Headphones, BadgeCheck, MapPinned,
} from 'lucide-react';

export const categories = [
    { name: 'Electronics & Gadgets', icon: Laptop, gradient: 'from-primary-500 to-primary-300', count: 1240 },
    { name: 'Vehicles - Cars', icon: Car, gradient: 'from-amber-500 to-primary-300', count: 856 },
    { name: 'Tools & Equipment', icon: Wrench, gradient: 'from-orange-500 to-primary-500', count: 432 },
    { name: 'Sports & Fitness Equipment', icon: Tent, gradient: 'from-emerald-500 to-primary-300', count: 678 },
    { name: 'Cameras & Photography', icon: Camera, gradient: 'from-rose-500 to-primary-300', count: 512 },
    { name: 'Musical Instruments', icon: Music, gradient: 'from-violet-500 to-primary-300', count: 324 },
    { name: 'Clothing & Fashion - Men', icon: Shirt, gradient: 'from-pink-500 to-primary-300', count: 289 },
    { name: 'Furniture - Sofas & Seating', icon: Sofa, gradient: 'from-amber-400 to-primary-300', count: 198 },
    { name: 'Books & Textbooks', icon: BookOpen, gradient: 'from-teal-500 to-primary-300', count: 156 },
    { name: 'Other', icon: Sparkles, gradient: 'from-primary-300 to-amber-300', count: 87 },
];

// Fallback featured listings used when the backend isn't running.
// Real data from listingsAPI.getFeatured() takes priority in HomePage.
export const fallbackListings = [
    {
        _id: 'fb1', slug: 'canon-eos-r5',
        title: 'Canon EOS R5 Mirrorless Camera with 24-105mm Lens',
        category: 'Cameras & Photography',
        location: { city: 'Mumbai', state: 'Maharashtra' },
        pricePerDay: 3500, securityDeposit: 15000,
        rating: { average: 4.9, count: 128 },
        images: [{ url: '/images/camera.png' }],
        isFeatured: true, availability: { isAvailable: true },
    },
    {
        _id: 'fb2', slug: 'dji-mavic-3-pro',
        title: 'DJI Mavic 3 Pro Drone with Fly More Combo',
        category: 'Drones & Accessories',
        location: { city: 'Bengaluru', state: 'Karnataka' },
        pricePerDay: 4500, securityDeposit: 25000,
        rating: { average: 4.8, count: 96 },
        images: [{ url: '/images/drone.png' }],
        isFeatured: true, availability: { isAvailable: true },
    },
    {
        _id: 'fb3', slug: 'royal-enfield-himalayan',
        title: 'Royal Enfield Himalayan — Adventure Ready',
        category: 'Vehicles - Bikes & Scooters',
        location: { city: 'Delhi', state: 'Delhi' },
        pricePerDay: 1800, securityDeposit: 10000,
        rating: { average: 4.7, count: 215 },
        images: [{ url: '/images/bike.png' }],
        isFeatured: true, availability: { isAvailable: true },
    },
    {
        _id: 'fb4', slug: 'macbook-pro-16',
        title: 'MacBook Pro 16" M3 Max — 32GB / 1TB',
        category: 'Laptops & Computers',
        location: { city: 'Pune', state: 'Maharashtra' },
        pricePerDay: 2500, securityDeposit: 30000,
        rating: { average: 5.0, count: 64 },
        images: [{ url: '/images/macbook.png' }],
        isFeatured: true, availability: { isAvailable: false },
    },
];

export const howItWorks = [
    { step: '01', title: 'Find What You Need', desc: 'Search from thousands of items across India. Filter by location, price, category and availability — all in one click.', icon: Search },
    { step: '02', title: 'Book Instantly', desc: 'Request to book the item for your dates. Get confirmed in minutes by the owner with secure in-app messaging.', icon: Zap },
    { step: '03', title: 'Rent & Return', desc: 'Pick up or get delivery. Use it worry-free with our damage protection, then return it — stress free.', icon: Shield },
];

export const stats = [
    { value: '25K+', label: 'Active Listings', icon: Package },
    { value: '50K+', label: 'Happy Renters', icon: Users },
    { value: '120+', label: 'Cities Covered', icon: MapPin },
    { value: '₹4.2Cr+', label: 'Rentals Processed', icon: TrendingUp },
];

export const features = [
    { icon: ShieldCheck, title: 'Damage Protection', desc: 'Every booking is covered up to ₹50,000. Rent worry-free with our comprehensive protection plan.', color: 'from-emerald-500 to-teal-400' },
    { icon: Wallet, title: 'Best Prices, Guaranteed', desc: 'Rent directly from owners and save up to 70% vs buying. No middlemen, no markup.', color: 'from-primary-500 to-primary-300' },
    { icon: Clock, title: 'Instant Booking', desc: 'Get confirmed in minutes. Real-time availability means no waiting, no back-and-forth.', color: 'from-amber-500 to-orange-400' },
    { icon: Headphones, title: '24/7 Support', desc: 'Our resolution center and support team are available round-the-clock for any issues.', color: 'from-violet-500 to-purple-400' },
    { icon: BadgeCheck, title: 'Verified Owners', desc: 'Every host is ID-verified and rated by real renters. Trust is built into every transaction.', color: 'from-rose-500 to-pink-400' },
    { icon: MapPinned, title: 'Doorstep Delivery', desc: 'Many hosts offer delivery to your location. Filter by delivery availability and save time.', color: 'from-sky-500 to-cyan-400' },
];

export const testimonials = [
    { id: '1', name: 'Riya Kapoor', role: 'Travel Photographer', avatar: '/images/avatar1.png', rating: 5, text: "RentoQuick saved my Goa trip! Rented a DJI drone for a fraction of the buying cost. The owner was super responsive and the gear was in pristine condition.", location: 'Mumbai' },
    { id: '2', name: 'Aditya Verma', role: 'Weekend Wanderer', avatar: '/images/avatar2.png', rating: 5, text: "Rented a Royal Enfield for my Ladakh trip. Seamless booking, transparent pricing, and the bike was adventure-ready. RentoQuick is my go-to for every trip now.", location: 'Delhi' },
    { id: '3', name: 'Sneha Reddy', role: 'Startup Founder', avatar: '/images/avatar3.png', rating: 5, text: "As a host, I've earned over ₹80,000 in 4 months renting out my camera gear. The platform is secure, payouts are fast, and support is excellent.", location: 'Bengaluru' },
    { id: '4', name: 'Rohan Gupta', role: 'Content Creator', avatar: '/images/avatar4.png', rating: 4, text: "Booked a MacBook Pro for a 3-day editing sprint. Pickup was smooth and the deposit was refunded instantly on return. Highly recommend!", location: 'Pune' },
];

export const faqs = [
    { question: 'How does RentoQuick keep my booking secure?', answer: 'Every booking is covered by our damage protection plan up to ₹50,000. Payments are held in escrow until the rental is complete, and our resolution center handles disputes fairly.' },
    { question: 'How do payouts work for hosts?', answer: 'Hosts receive payouts directly to their bank account within 24-48 hours after the rental period ends. A small platform fee of 8% applies to each completed booking.' },
    { question: 'Can I list my item for free?', answer: 'Yes! Listing on RentoQuick is completely free. You only pay a small commission when your item is successfully rented out.' },
    { question: 'What if the item gets damaged during my rental?', answer: 'Report any damage within 24 hours through the app. Our team will assess and our protection plan covers verified damages beyond the security deposit.' },
    { question: 'Is delivery available for rented items?', answer: 'Many hosts offer doorstep delivery for an additional fee. You can filter listings by delivery availability during your search.' },
];

export const popularSearches = ['Camera', 'Drone', 'Royal Enfield', 'MacBook', 'Tent', 'Guitar'];
