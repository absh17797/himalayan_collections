// public/admin.js

const API_BASE = '/api';
const DEFAULT_IMAGE = '/assets/placeholder.png';
const app = document.getElementById('app');

function init() {
    const key = localStorage.getItem('adminKey');
    if (validKey(key)) {
        renderDashboard();
    } else {
        renderLogin();
    }
}

function validKey(key) {
    return key === 'admin:admin123';
}

function renderLogin() {
    const tpl = document.getElementById('login-template').content.cloneNode(true);
    app.innerHTML = '';
    app.appendChild(tpl);
}

function handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('user').value;
    const p = document.getElementById('pass').value;
    if (u === 'admin' && p === 'admin123') {
        localStorage.setItem('adminKey', 'admin:admin123');
        renderDashboard();
    } else {
        alert('Invalid credentials');
    }
}

function logout() {
    localStorage.removeItem('adminKey');
    renderLogin();
}

function renderDashboard() {
    const tpl = document.getElementById('dashboard-template').content.cloneNode(true);
    app.innerHTML = '';
    app.appendChild(tpl);
}

function switchTab(tabId, el) {
    // Hide all
    document.getElementById('tab-add-vehicle').style.display = 'none';
    document.getElementById('tab-manage-vehicles').style.display = 'none';
    document.getElementById('tab-inquiries').style.display = 'none';

    // Show target
    document.getElementById('tab-' + tabId).style.display = 'block';

    // Update Nav
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    el.classList.add('active');

    if (tabId === 'inquiries') {
        fetchInquiries();
    } else if (tabId === 'manage-vehicles') {
        fetchAdminVehicles();
    }
}

// Vehicle CRUD Logic
function addSpecInput(key = '', val = '') {
    const container = document.getElementById('specs-container');
    const div = document.createElement('div');
    div.className = 'input-group mb-2';
    div.innerHTML = `
        <span class="input-group-text">Key</span>
        <input type="text" class="form-control spec-key" placeholder="e.g. Range" value="${key}">
        <span class="input-group-text">Value</span>
        <input type="text" class="form-control spec-val" placeholder="e.g. 400 Miles" value="${val}">
        <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(div);
}

async function handleVehicleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const id = formData.get('id');

    const specs = {};
    const keys = document.querySelectorAll('.spec-key');
    const vals = document.querySelectorAll('.spec-val');
    keys.forEach((k, i) => {
        if (k.value.trim() && vals[i].value.trim()) {
            specs[k.value.trim()] = vals[i].value.trim();
        }
    });
    formData.append('specifications', JSON.stringify(specs));

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/admin/vehicles/${id}` : `${API_BASE}/admin/add`;

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'x-admin-auth': localStorage.getItem('adminKey') },
            body: formData
        });
        if (res.ok) {
            alert(id ? 'Vehicle Updated Successfully' : 'Vehicle Published Successfully');
            resetForm();
            if (id) switchTab('manage-vehicles', document.querySelector('[onclick*="manage-vehicles"]'));
        } else {
            const d = await res.json();
            alert('Error: ' + d.error);
        }
    } catch (err) {
        alert('Request failed');
    }
}

function resetForm() {
    const form = document.getElementById('vehicle-form');
    form.reset();
    document.getElementById('vehicle-id').value = '';
    document.getElementById('specs-container').innerHTML = '';
    document.getElementById('form-title').textContent = 'Add New Vehicle';
    document.getElementById('submit-btn').textContent = 'Publish Vehicle';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    document.getElementById('current-image-preview').style.display = 'none';
}

async function fetchAdminVehicles() {
    const tbody = document.querySelector('#vehicles-table tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    try {
        const res = await fetch(`${API_BASE}/vehicles`);
        const data = await res.json();

        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No vehicles found.</td></tr>';
            return;
        }

        data.forEach(v => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${v.mainImage || DEFAULT_IMAGE}" height="40" class="rounded border" onerror="this.src='${DEFAULT_IMAGE}'"></td>
                <td>${v.title}</td>
                <td>${v.brand || 'N/A'}</td>
                <td>${v.type}</td>
                <td>$${v.price.toLocaleString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick='initEdit("${v._id}")'>Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick='deleteVehicle("${v._id}")'>Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load vehicles.</td></tr>';
    }
}

async function initEdit(id) {
    try {
        const res = await fetch(`${API_BASE}/vehicles/${id}`);
        const v = await res.json();

        switchTab('add-vehicle', document.querySelector('[onclick*="add-vehicle"]'));

        document.getElementById('form-title').textContent = 'Edit Vehicle';
        document.getElementById('submit-btn').textContent = 'Update Vehicle';
        document.getElementById('cancel-edit-btn').style.display = 'block';

        document.getElementById('vehicle-id').value = v._id;
        document.getElementById('form-title-input').value = v.title;
        document.getElementById('form-brand-input').value = v.brand || '';
        document.getElementById('form-type-select').value = v.type;
        document.getElementById('form-price-input').value = v.price;
        document.getElementById('form-desc-input').value = v.description;

        if (v.mainImage) {
            const preview = document.getElementById('current-image-preview');
            preview.style.display = 'block';
            preview.querySelector('img').src = v.mainImage || DEFAULT_IMAGE;
            preview.querySelector('img').onerror = (e) => e.target.src = DEFAULT_IMAGE;
        }

        const specsContainer = document.getElementById('specs-container');
        specsContainer.innerHTML = '';
        if (v.specifications) {
            for (const [key, val] of Object.entries(v.specifications)) {
                addSpecInput(key, val);
            }
        }

    } catch (err) {
        alert('Failed to load vehicle details for editing');
    }
}

async function deleteVehicle(id) {
    if (!confirm('Are you sure you want to delete this vehicle listing?')) return;

    try {
        const res = await fetch(`${API_BASE}/admin/vehicles/${id}`, {
            method: 'DELETE',
            headers: { 'x-admin-auth': localStorage.getItem('adminKey') }
        });
        if (res.ok) {
            alert('Vehicle deleted');
            fetchAdminVehicles();
        } else {
            alert('Deletion failed');
        }
    } catch (err) {
        alert('Request failed');
    }
}

// Inquiries Logic
async function fetchInquiries() {
    const tbody = document.querySelector('#inquiries-table tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    try {
        const res = await fetch(`${API_BASE}/inquiries`, {
            headers: { 'x-admin-auth': localStorage.getItem('adminKey') }
        });
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();

        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No inquiries found.</td></tr>';
            return;
        }

        data.forEach(inq => {
            const tr = document.createElement('tr');
            const date = new Date(inq.date).toLocaleString();
            tr.innerHTML = `
                <td>${date}</td>
                <td>${inq.name}</td>
                <td><a href="mailto:${inq.email}">${inq.email}</a></td>
                <td>${inq.phone || 'N/A'}</td>
                <td>${inq.vehicleId || 'N/A'}</td>
                <td>${inq.message}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load inquiries.</td></tr>';
    }
}

init();
