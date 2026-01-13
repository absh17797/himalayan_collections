// public/admin.js

const API_BASE = '/api';
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
    // Default open Add Vehicle
    // If we wanted to persist tab state, we could, but default is fine.
}

function switchTab(tabId, el) {
    // Hide all
    document.getElementById('tab-add-vehicle').style.display = 'none';
    document.getElementById('tab-inquiries').style.display = 'none';

    // Show target
    document.getElementById('tab-' + tabId).style.display = 'block';

    // Update Nav
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    el.classList.add('active');

    if (tabId === 'inquiries') {
        fetchInquiries();
    }
}

// Add Vehicle Logic
function addSpecInput() {
    const container = document.getElementById('specs-container');
    const div = document.createElement('div');
    div.className = 'input-group mb-2';
    div.innerHTML = `
        <span class="input-group-text">Key</span>
        <input type="text" class="form-control spec-key" placeholder="e.g. Range">
        <span class="input-group-text">Value</span>
        <input type="text" class="form-control spec-val" placeholder="e.g. 400 Miles">
        <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(div);
}

async function handleAddVehicle(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const specs = {};
    const keys = document.querySelectorAll('.spec-key');
    const vals = document.querySelectorAll('.spec-val');
    keys.forEach((k, i) => {
        if (k.value.trim() && vals[i].value.trim()) {
            specs[k.value.trim()] = vals[i].value.trim();
        }
    });
    formData.append('specifications', JSON.stringify(specs));

    try {
        const res = await fetch(`${API_BASE}/admin/add`, {
            method: 'POST',
            headers: { 'x-admin-auth': localStorage.getItem('adminKey') },
            body: formData
        });
        if (res.ok) {
            alert('Vehicle Published Successfully');
            form.reset();
            document.getElementById('specs-container').innerHTML = ''; // clear specs
        } else {
            const d = await res.json();
            alert('Error: ' + d.error);
        }
    } catch (err) {
        alert('Request failed');
    }
}

// Inquiries Logic
async function fetchInquiries() {
    const tbody = document.querySelector('#inquiries-table tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

    try {
        const res = await fetch(`${API_BASE}/inquiries`, {
            headers: { 'x-admin-auth': localStorage.getItem('adminKey') }
        });
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();

        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No inquiries found.</td></tr>';
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
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load inquiries.</td></tr>';
    }
}

init();
