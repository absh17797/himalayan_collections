// public/app.js

const API_BASE = '/api';
const DEFAULT_IMAGE = '/assets/placeholder.png';
const contentDiv = document.getElementById('main-content');
let currentVehicles = [];

// --- View Rendering ---

function showHome() {
    const template = document.getElementById('home-view-template').content.cloneNode(true);
    contentDiv.innerHTML = '';
    contentDiv.appendChild(template);
    fetchVehicles();
}

function showDetail(vehicle) {
    const template = document.getElementById('detail-view-template').content.cloneNode(true);

    template.querySelector('#detail-title').textContent = vehicle.title;
    template.querySelector('#detail-price').textContent = formatPrice(vehicle.price);
    template.querySelector('#detail-desc').textContent = vehicle.description;
    template.querySelector('#detail-image').src = vehicle.mainImage || DEFAULT_IMAGE;
    template.querySelector('#detail-image').onerror = (e) => e.target.src = DEFAULT_IMAGE;
    template.querySelector('#inq-vehicle-id').value = vehicle._id;

    // Render Dynamic Specs
    const specsTable = template.querySelector('#specs-table tbody');
    if (vehicle.specifications) {
        for (const [key, value] of Object.entries(vehicle.specifications)) {
            const row = document.createElement('tr');
            row.innerHTML = `<th scope="row" class="w-25 text-nowrap text-secondary">${key}</th><td>${value}</td>`;
            specsTable.appendChild(row);
        }
    }

    contentDiv.innerHTML = '';
    contentDiv.appendChild(template);
    window.scrollTo(0, 0);
}

function scrollToContact() {
    showHome();
    setTimeout(() => {
        const contactSection = document.getElementById('contact-section');
        if (contactSection) {
            contactSection.scrollIntoView({ behavior: 'smooth' });
        }
    }, 500); // Small delay to allow home rendering
}

// --- API Calls & Logic ---

async function fetchVehicles(type = 'all') {
    let url = `${API_BASE}/vehicles`;
    if (type !== 'all') {
        url += `?type=${type}`;
    }

    try {
        const res = await fetch(url);
        const vehicles = await res.json();
        currentVehicles = vehicles;
        renderGrid(vehicles);
    } catch (err) {
        console.error("Failed to fetch vehicles", err);
        const grid = document.getElementById('vehicle-grid');
        if (grid) grid.innerHTML = '<p class="text-center text-danger">Failed to load vehicles.</p>';
    }
}

function renderGrid(vehicles) {
    const grid = document.getElementById('vehicle-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (vehicles.length === 0) {
        grid.innerHTML = '<div class="col-12"><p class="text-center lead text-muted mt-5">No vehicles found in this category.</p></div>';
        return;
    }

    vehicles.forEach(v => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        const displayId = v._id.slice(-6).toUpperCase();
        col.innerHTML = `
            <div class="card h-100 shadow-sm border-0 vehicle-card overflow-hidden" onclick='fetchAndShowDetail("${v._id}")' style="cursor: pointer;">
                <div class="position-relative overflow-hidden">
                     <span class="position-absolute top-0 start-0 bg-dark text-white px-2 py-1 small m-2 rounded" style="z-index:10; opacity:0.8;">ID: ${displayId}</span>
                     <img src="${v.mainImage || DEFAULT_IMAGE}" class="card-img-top" alt="${v.title}" style="height: 250px; object-fit: cover;" onerror="this.src='${DEFAULT_IMAGE}'">
                </div>
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title fw-bold mb-0">${v.title}</h5>
                        <span class="badge bg-dark">${v.type === '2-wheeler' ? '2W' : '4W'}</span>
                    </div>
                    <p class="card-text text-golden fw-bold fs-5">${formatPrice(v.price)}</p>
                    <p class="card-text text-muted small text-truncate">${v.description}</p>
                </div>
            </div>
        `;
        grid.appendChild(col);
    });
}

function formatPrice(price) {
    if (!price) return 'N/A';
    const s = price.toString();
    if (s.length <= 2) return '$' + '*'.repeat(s.length);
    return '$' + '**' + s.substring(2);
}

function filterVehicles(type) {
    document.querySelectorAll('.btn-group .btn').forEach(b => b.classList.remove('active'));

    if (type === 'all') document.getElementById('filter-all').classList.add('active');
    else if (type === '2-wheeler') document.getElementById('filter-2w').classList.add('active');
    else document.getElementById('filter-4w').classList.add('active');

    fetchVehicles(type);
}

function filterVehiclesByBrand(brand) {
    if (!brand) return fetchVehicles();

    // Switch to 'All' tab visually
    document.querySelectorAll('.btn-group .btn').forEach(b => b.classList.remove('active'));
    document.getElementById('filter-all').classList.add('active');

    // Fetch all then filter
    // Note: In a real app we would call an API like /vehicles?brand=Tata
    // Here we will filter client side from current vehicles or fetch all then filter
    fetch(`${API_BASE}/vehicles`)
        .then(res => res.json())
        .then(vehicles => {
            currentVehicles = vehicles;
            const filtered = vehicles.filter(v => {
                const brandMatch = v.brand && v.brand.toLowerCase() === brand.toLowerCase();
                const titleMatch = v.title.toLowerCase().includes(brand.toLowerCase());
                return brandMatch || titleMatch;
            });
            renderGrid(filtered);

            // Scroll to grid
            const grid = document.getElementById('vehicle-grid');
            if (grid) grid.scrollIntoView({ behavior: 'smooth' });
        });
}

async function fetchAndShowDetail(id) {
    try {
        const res = await fetch(`${API_BASE}/vehicles/${id}`);
        const vehicle = await res.json();
        showDetail(vehicle);
    } catch (err) {
        alert("Error loading details");
    }
}

// --- Inquiry Logic ---

// For General Inquiry form on Home Page
async function handleGeneralInquiry(e) {
    e.preventDefault();
    const name = document.getElementById('gen-name').value;
    const email = document.getElementById('gen-email').value;
    const phone = document.getElementById('gen-phone').value;
    const message = document.getElementById('gen-message').value;

    sendInquiry({ name, email, phone, message, vehicleId: 'General Inquiry' });
}

// For Vehicle Specific Inquiry
async function handleInquiry(e) {
    e.preventDefault();
    const id = document.getElementById('inq-vehicle-id').value;
    const name = document.getElementById('inq-name').value;
    const email = document.getElementById('inq-email').value;
    const phone = document.getElementById('inq-phone').value;
    const message = document.getElementById('inq-message').value;

    sendInquiry({ name, email, phone, message, vehicleId: id });
}

async function sendInquiry(payload) {
    try {
        const res = await fetch(`${API_BASE}/inquiry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert('Inquiry Sent! We will contact you shortly.');
            // Only reload home if it was general, or detail? Reset form simpler
            // Use simple approach:
            showHome();
        } else {
            alert('Failed to send inquiry.');
        }
    } catch (err) {
        alert('Error sending inquiry.');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', showHome);
