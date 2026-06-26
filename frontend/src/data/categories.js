// Single source of truth for listing categories across the app.
// The backend Listing.js enum MUST match this list exactly.
// Each category has a color used for colored dropdowns, badges, and chips.

export const CATEGORIES = [
    { name: 'Electronics & Gadgets', color: '#3b82f6', icon: 'Laptop' },
    { name: 'Laptops & Computers', color: '#0ea5e9', icon: 'Laptop' },
    { name: 'Mobile Phones & Tablets', color: '#06b6d4', icon: 'Smartphone' },
    { name: 'Cameras & Photography', color: '#ec4899', icon: 'Camera' },
    { name: 'Audio & Music Systems', color: '#8b5cf6', icon: 'Music' },
    { name: 'Gaming Consoles & Accessories', color: '#a855f7', icon: 'Gamepad2' },
    { name: 'Vehicles - Cars', color: '#f59e0b', icon: 'Car' },
    { name: 'Vehicles - Bikes & Scooters', color: '#f97316', icon: 'Bike' },
    { name: 'Vehicles - Cycles', color: '#eab308', icon: 'Bike' },
    { name: 'Furniture - Sofas & Seating', color: '#a16207', icon: 'Sofa' },
    { name: 'Furniture - Beds & Mattresses', color: '#854d0e', icon: 'Bed' },
    { name: 'Furniture - Tables & Desks', color: '#b45309', icon: 'Table' },
    { name: 'Furniture - Storage & Shelves', color: '#92400e', icon: 'Archive' },
    { name: 'Kitchen Appliances', color: '#dc2626', icon: 'CookingPot' },
    { name: 'Home Appliances', color: '#be123c', icon: 'Refrigerator' },
    { name: 'Tools & Equipment', color: '#ea580c', icon: 'Wrench' },
    { name: 'Power Tools', color: '#c2410c', icon: 'Drill' },
    { name: 'Sports & Fitness Equipment', color: '#16a34a', icon: 'Dumbbell' },
    { name: 'Outdoor & Camping Gear', color: '#15803d', icon: 'Tent' },
    { name: 'Party & Event Supplies', color: '#db2777', icon: 'PartyPopper' },
    { name: 'Musical Instruments', color: '#7c3aed', icon: 'Music' },
    { name: 'Books & Textbooks', color: '#0d9488', icon: 'BookOpen' },
    { name: 'Clothing & Fashion - Men', color: '#4f46e5', icon: 'Shirt' },
    { name: 'Clothing & Fashion - Women', color: '#c026d3', icon: 'Shirt' },
    { name: 'Clothing & Fashion - Kids', color: '#d946ef', icon: 'Shirt' },
    { name: 'Jewelry & Accessories', color: '#e11d48', icon: 'Gem' },
    { name: 'Bags & Luggage', color: '#7c2d12', icon: 'Briefcase' },
    { name: 'Footwear', color: '#9a3412', icon: 'Footprints' },
    { name: 'Toys & Games', color: '#f43f5e', icon: 'Gamepad2' },
    { name: 'Baby & Kids Equipment', color: '#fb7185', icon: 'Baby' },
    { name: 'Wedding & Ceremony Items', color: '#e11d48', icon: 'Heart' },
    { name: 'Travel & Camping Gear', color: '#059669', icon: 'Plane' },
    { name: 'DJ & Sound Equipment', color: '#6d28d9', icon: 'Music4' },
    { name: 'Projectors & Screens', color: '#2563eb', icon: 'Projector' },
    { name: 'Drones & Accessories', color: '#0891b2', icon: 'Plane' },
    { name: 'Medical & Health Equipment', color: '#0d9488', icon: 'Stethoscope' },
    { name: 'Garden & Outdoor Tools', color: '#65a30d', icon: 'Trees' },
    { name: 'Art & Craft Supplies', color: '#d946ef', icon: 'Palette' },
    { name: 'Office & Stationery', color: '#475569', icon: 'Briefcase' },
    { name: 'Beauty & Grooming Equipment', color: '#db2777', icon: 'Scissors' },
    { name: 'Pet Supplies & Accessories', color: '#b45309', icon: 'Dog' },
    { name: 'Fishing & Boating Gear', color: '#0284c7', icon: 'Anchor' },
    { name: 'Winter & Snow Gear', color: '#38bdf8', icon: 'Snowflake' },
    { name: 'Renovation & Construction Tools', color: '#9a3412', icon: 'HardHat' },
    { name: 'Cleaning Equipment', color: '#0891b2', icon: 'Sparkles' },
    { name: 'Tailoring & Sewing Machines', color: '#be185d', icon: 'Scissors' },
    { name: 'Printing & Scanning Equipment', color: '#475569', icon: 'Printer' },
    { name: 'Networking & IT Equipment', color: '#1d4ed8', icon: 'Router' },
    { name: 'Film & Photography Lighting', color: '#facc15', icon: 'Lightbulb' },
    { name: 'Other', color: '#64748b', icon: 'Sparkle' },
];

// Plain string list (for zod enums + backend parity)
export const CATEGORY_NAMES = CATEGORIES.map(c => c.name);

// Condition options with colors
export const CONDITIONS = [
    { name: 'New', color: '#16a34a', bg: 'bg-emerald-500/15', text: 'text-emerald-700', border: 'border-emerald-500/30' },
    { name: 'Like New', color: '#0d9488', bg: 'bg-teal-500/15', text: 'text-teal-700', border: 'border-teal-500/30' },
    { name: 'Good', color: '#d97706', bg: 'bg-amber-500/15', text: 'text-amber-700', border: 'border-amber-500/30' },
    { name: 'Fair', color: '#ea580c', bg: 'bg-orange-500/15', text: 'text-orange-700', border: 'border-orange-500/30' },
    { name: 'Poor', color: '#dc2626', bg: 'bg-red-500/15', text: 'text-red-700', border: 'border-red-500/30' },
];

export const CONDITION_NAMES = CONDITIONS.map(c => c.name);

// Helper to look up a category's color
export function getCategoryColor(name) {
    const cat = CATEGORIES.find(c => c.name === name);
    return cat ? cat.color : '#64748b';
}
