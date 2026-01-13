const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
// Replace with your actual MongoDB URI if different, or use a local one.
// For this 'ready-to-use' replica, we'll try to connect to a local instance or a standard dummy string.
// Ideally, this should be configurable.
mongoose.connect('mongodb+srv://amangupta17262_db_user:yx4qMUxXsbzj2iND@himalayan.se2rgd3.mongodb.net/himalayan_collections', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
    .catch(err => console.log('MongoDB Connection Error:', err));

// Schemas
const VehicleSchema = new mongoose.Schema({
    title: String,
    brand: String,
    type: {
        type: String,
        enum: ['2-wheeler', '4-wheeler'],
        required: true
    },
    price: Number,
    mainImage: String, // Path to image
    description: String,
    specifications: {
        type: Map,
        of: String
    }
});

const InquirySchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    message: String,
    vehicleId: String,
    date: { type: Date, default: Date.now }
});

const Vehicle = mongoose.model('Vehicle', VehicleSchema);
const Inquiry = mongoose.model('Inquiry', InquirySchema);

// Admin Auth Middleware
const adminAuth = (req, res, next) => {
    const authHeader = req.headers['x-admin-auth'];
    // Simple hardcoded check
    if (authHeader === 'admin:admin123') {
        next();
    } else {
        res.status(403).json({ error: 'Unauthorized' });
    }
};

// Storage Config for Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// API Endpoints

// GET/list all vehicles
app.get('/api/vehicles', async (req, res) => {
    try {
        const { type } = req.query;
        let query = {};
        if (type && (type === '2-wheeler' || type === '4-wheeler')) {
            query.type = type;
        }
        const vehicles = await Vehicle.find(query);
        res.json(vehicles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single vehicle
app.get('/api/vehicles/:id', async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
        res.json(vehicle);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Admin Add Vehicle
app.post('/api/admin/add', adminAuth, upload.single('mainImage'), async (req, res) => {
    try {
        const { title, brand, type, price, description, specifications } = req.body;

        let parsedSpecs = {};
        if (specifications) {
            try {
                parsedSpecs = JSON.parse(specifications);
            } catch (e) {
                // If specs are sent as individual keys in a way we need to handle, 
                // but expecting JSON string for simplicity from frontend FormData
                console.error("Error parsing specs", e);
            }
        }

        const newVehicle = new Vehicle({
            title,
            brand,
            type,
            price,
            description,
            mainImage: req.file ? '/uploads/' + req.file.filename : '',
            specifications: parsedSpecs
        });

        await newVehicle.save();
        res.json({ message: 'Vehicle added successfully', vehicle: newVehicle });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Inquiry
app.post('/api/inquiry', async (req, res) => {
    try {
        const { name, email, phone, message, vehicleId } = req.body;
        const newInquiry = new Inquiry({ name, email, phone, message, vehicleId });
        await newInquiry.save();
        res.json({ message: 'Inquiry received' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/inquiries (Admin Only)
app.get('/api/inquiries', adminAuth, async (req, res) => {
    try {
        const inquiries = await Inquiry.find().sort({ date: -1 });
        res.json(inquiries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
