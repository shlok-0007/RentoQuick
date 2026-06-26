const SavedSearch = require('../models/SavedSearch');
const { MAX_SAVED_SEARCHES_PER_USER } = require('../config/constants');

const ALLOWED_CATEGORIES = [
    'Electronics & Gadgets','Laptops & Computers','Mobile Phones & Tablets',
    'Cameras & Photography','Audio & Music Systems','Gaming Consoles & Accessories',
    'Vehicles - Cars','Vehicles - Bikes & Scooters','Vehicles - Cycles',
    'Furniture - Sofas & Seating','Furniture - Beds & Mattresses','Furniture - Tables & Desks',
    'Furniture - Storage & Shelves','Kitchen Appliances','Home Appliances',
    'Tools & Equipment','Power Tools','Sports & Fitness Equipment',
    'Outdoor & Camping Gear','Party & Event Supplies','Musical Instruments',
    'Books & Textbooks','Clothing & Fashion - Men','Clothing & Fashion - Women',
    'Clothing & Fashion - Kids','Jewelry & Accessories','Bags & Luggage',
    'Footwear','Toys & Games','Baby & Kids Equipment','Wedding & Ceremony Items',
    'Travel & Camping Gear','DJ & Sound Equipment','Projectors & Screens',
    'Drones & Accessories','Medical & Health Equipment','Garden & Outdoor Tools',
    'Art & Craft Supplies','Office & Stationery','Beauty & Grooming Equipment',
    'Pet Supplies & Accessories','Fishing & Boating Gear','Winter & Snow Gear',
    'Renovation & Construction Tools','Cleaning Equipment','Tailoring & Sewing Machines',
    'Printing & Scanning Equipment','Networking & IT Equipment',
    'Film & Photography Lighting','Other'
];

exports.saveSearch = async (req, res, next) => {
    try {
        const { name, filters } = req.body;
        const count = await SavedSearch.countDocuments({ user: req.user._id });
        if (count >= MAX_SAVED_SEARCHES_PER_USER) {
            return res.status(400).json({ success: false, message: 'Maximum 20 saved searches allowed' });
        }
        const sanitized = {
            search: typeof filters?.search === "string" ? filters.search.slice(0, 100) : undefined,
            category: ALLOWED_CATEGORIES.includes(filters?.category) ? filters.category : undefined,
            city: typeof filters?.city === "string" ? filters.city.slice(0, 100) : undefined,
            condition: ["New","Like New","Good","Fair","Poor"].includes(filters?.condition) ? filters.condition : undefined,
            minPrice: Number.isFinite(+filters?.minPrice) ? Math.max(0, +filters.minPrice) : undefined,
            maxPrice: Number.isFinite(+filters?.maxPrice) ? Math.max(0, +filters.maxPrice) : undefined,
        };
        Object.keys(sanitized).forEach(k => sanitized[k] === undefined && delete sanitized[k]);
        const search = await SavedSearch.create({ user: req.user._id, name, filters: sanitized });
        res.status(201).json({ success: true, savedSearch: search });
    } catch (err) { next(err); }
};

exports.getMySavedSearches = async (req, res, next) => {
    try {
        const searches = await SavedSearch.find({ user: req.user._id }).sort('-createdAt');
        res.json({ success: true, savedSearches: searches });
    } catch (err) { next(err); }
};

exports.deleteSavedSearch = async (req, res, next) => {
    try {
        const search = await SavedSearch.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!search) return res.status(404).json({ success: false, message: 'Saved search not found' });
        res.json({ success: true, message: 'Saved search deleted' });
    } catch (err) { next(err); }
};

exports.toggleAlert = async (req, res, next) => {
    try {
        const search = await SavedSearch.findOne({ _id: req.params.id, user: req.user._id });
        if (!search) return res.status(404).json({ success: false, message: 'Saved search not found' });
        search.alertEnabled = !search.alertEnabled;
        await search.save();
        res.json({ success: true, savedSearch: search });
    } catch (err) { next(err); }
};
