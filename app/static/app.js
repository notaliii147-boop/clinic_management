const API_BASE = window.location.origin;

// State
let currentView = 'dashboard';
let patients = [];
let doctors = [];
let editingPatientId = null;
let editingDoctorId = null;

// DOM Elements
const views = {
  dashboard: document.getElementById('view-dashboard'),
  patients: document.getElementById('view-patients'),
  doctors: document.getElementById('view-doctors'),
};

const navItems = document.querySelectorAll('.nav-item');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const addBtn = document.getElementById('addBtn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');
const toastContainer = document.getElementById('toastContainer');
const themeToggle = document.getElementById('themeToggle');

// Theme Management
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  themeToggle.innerHTML = saved === 'dark' ? '<i class="fa-regular fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  themeToggle.innerHTML = next === 'dark' ? '<i class="fa-regular fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
}

themeToggle.addEventListener('click', toggleTheme);

// Navigation
function navigateTo(view) {
  currentView = view;
  
  // Update nav
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });
  
  // Update views
  Object.keys(views).forEach(key => {
    views[key].classList.toggle('active', key === view);
  });
  
  // Update header
  const titles = {
    dashboard: ['Dashboard', 'Overview of your clinic'],
    patients: ['Patients', 'Manage patient records'],
    doctors: ['Doctors', 'Manage doctor profiles'],
  };
  const [title, subtitle] = titles[view] || ['', ''];
  pageTitle.textContent = title;
  pageSubtitle.textContent = subtitle;
  
  // Update add button
  if (view === 'dashboard') {
    addBtn.style.display = 'none';
  } else {
    addBtn.style.display = 'inline-flex';
    addBtn.textContent = `+ Add ${view.slice(0, -1).charAt(0).toUpperCase() + view.slice(1, -1)}`;
  }
}

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navigateTo(item.dataset.view);
    if (item.dataset.view === 'patients') fetchPatients();
    if (item.dataset.view === 'doctors') fetchDoctors();
  });
});

// Toast
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Modal
function openModal(title, content) {
  modalTitle.textContent = title;
  modalBody.innerHTML = content;
  modal.classList.add('active');
}

function closeModal() {
  modal.classList.remove('active');
  editingPatientId = null;
  editingDoctorId = null;
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

// API Calls
async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const message = typeof data === 'object' && data !== null ? (data.message || data.detail || 'Request failed') : data;
      throw new Error(typeof message === 'string' ? message : 'Request failed');
    }

    return data;
  } catch (error) {
    showToast(error.message || 'Request failed', 'error');
    throw error;
  }
}

// Patients
async function fetchPatients() {
  try {
    patients = await apiFetch('/patients');
    renderPatients();
    updateStats();
  } catch (error) {
    // Show empty state
    renderPatients([]);
  }
}

function renderPatients(data = null) {
  const tbody = document.getElementById('patientsTable');
  const list = data || patients;
  
  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <div>👤</div>
          <h3>No patients found</h3>
          <p>Click "Add Patient" to create your first record</p>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = list.map(p => `
    <tr>
      <td><code>${p.id.slice(0, 8)}</code></td>
      <td><strong>${p.name}</strong></td>
      <td>${p.gender}</td>
      <td>${p.dob}</td>
      <td>${p.blood_group}</td>
      <td>${p.phone}</td>
      <td>${p.email}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editPatient('${p.id}')">✎</button>
        <button class="btn btn-danger btn-sm" onclick="deletePatient('${p.id}')">✕</button>
      </td>
    </tr>
  `).join('');
}

async function createPatient(data) {
  try {
    const result = await apiFetch('/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    showToast('Patient created successfully!');
    closeModal();
    fetchPatients();
    updateStats();
    return result;
  } catch (error) {
    throw error;
  }
}

async function updatePatient(id, data) {
  try {
    const result = await apiFetch(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    showToast('Patient updated successfully!');
    closeModal();
    fetchPatients();
    return result;
  } catch (error) {
    throw error;
  }
}

async function deletePatient(id) {
  if (!confirm('Are you sure you want to delete this patient?')) return;
  try {
    await apiFetch(`/patients/${id}`, { method: 'DELETE' });
    showToast('Patient deleted successfully!');
    fetchPatients();
    updateStats();
  } catch (error) {
    // Error already handled
  }
}

async function editPatient(id) {
  try {
    const patient = await apiFetch(`/patients/${id}`);
    editingPatientId = id;
    openModal('Edit Patient', getPatientForm(patient));
  } catch (error) {
    // Error already handled
  }
}

function getPatientForm(data = {}) {
  const p = data;
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const genders = ['Male', 'Female', 'Not Specified'];
  
  return `
    <form id="patientForm">
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="p_name" value="${p.name || ''}" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Gender</label>
          <select id="p_gender">
            ${genders.map(g => `<option value="${g}" ${p.gender === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Date of Birth</label>
          <input type="date" id="p_dob" value="${p.dob || ''}" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Blood Group</label>
          <select id="p_blood">
            ${bloodGroups.map(b => `<option value="${b}" ${p.blood_group === b ? 'selected' : ''}>${b}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input type="tel" id="p_phone" value="${p.phone || ''}" placeholder="+92 300 1234567" required />
        </div>
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="p_email" value="${p.email || ''}" placeholder="name@email.com" required />
      </div>
      <div class="form-group">
        <label>Address</label>
        <textarea id="p_address" rows="3">${p.address || ''}</textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">${editingPatientId ? 'Update' : 'Create'}</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </form>
  `;
}

// Doctors
async function fetchDoctors() {
  try {
    doctors = await apiFetch('/doctors');
    renderDoctors();
    updateStats();
  } catch (error) {
    renderDoctors([]);
  }
}

function renderDoctors(data = null) {
  const tbody = document.getElementById('doctorsTable');
  const list = data || doctors;
  
  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div>🩺</div>
          <h3>No doctors found</h3>
          <p>Click "Add Doctor" to create your first record</p>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = list.map(d => `
    <tr>
      <td><code>${d.id.slice(0, 8)}</code></td>
      <td><strong>${d.name}</strong></td>
      <td>${d.specialization}</td>
      <td>${d.phone}</td>
      <td>${d.email}</td>
      <td>${d.experience_years} years</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editDoctor('${d.id}')">✎</button>
        <button class="btn btn-danger btn-sm" onclick="deleteDoctor('${d.id}')">✕</button>
      </td>
    </tr>
  `).join('');
}

async function createDoctor(data) {
  try {
    const result = await apiFetch('/doctors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    showToast('Doctor created successfully!');
    closeModal();
    fetchDoctors();
    updateStats();
    return result;
  } catch (error) {
    throw error;
  }
}

async function updateDoctor(id, data) {
  try {
    const result = await apiFetch(`/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    showToast('Doctor updated successfully!');
    closeModal();
    fetchDoctors();
    return result;
  } catch (error) {
    throw error;
  }
}

async function deleteDoctor(id) {
  if (!confirm('Are you sure you want to delete this doctor?')) return;
  try {
    await apiFetch(`/doctors/${id}`, { method: 'DELETE' });
    showToast('Doctor deleted successfully!');
    fetchDoctors();
    updateStats();
  } catch (error) {
    // Error already handled
  }
}

async function editDoctor(id) {
  try {
    const doctor = await apiFetch(`/doctors/${id}`);
    editingDoctorId = id;
    openModal('Edit Doctor', getDoctorForm(doctor));
  } catch (error) {
    // Error already handled
  }
}

function getDoctorForm(data = {}) {
  const d = data;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const availabilityHtml = d.availability && d.availability.length > 0
    ? d.availability.map((slot, i) => `
        <div class="form-row" style="margin-bottom: 8px;">
          <div class="form-group">
            <label>Day</label>
            <select class="av_day">
              ${days.map(day => `<option value="${day}" ${slot.day === day ? 'selected' : ''}>${day}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Start</label>
            <input type="time" class="av_start" value="${slot.start_time || '09:00'}" />
          </div>
          <div class="form-group">
            <label>End</label>
            <input type="time" class="av_end" value="${slot.end_time || '17:00'}" />
          </div>
          <div class="form-group" style="display: flex; align-items: end;">
            <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.form-row').remove()">✕</button>
          </div>
        </div>
      `).join('')
    : '';
  
  return `
    <form id="doctorForm">
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="d_name" value="${d.name || ''}" required />
      </div>
      <div class="form-group">
        <label>Specialization</label>
        <input type="text" id="d_specialization" value="${d.specialization || ''}" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Phone</label>
          <input type="tel" id="d_phone" value="${d.phone || ''}" placeholder="+92 300 1234567" required />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="d_email" value="${d.email || ''}" placeholder="name@email.com" required />
        </div>
      </div>
      <div class="form-group">
        <label>Experience (Years)</label>
        <input type="number" id="d_experience" value="${d.experience_years || 0}" min="0" required />
      </div>
      <div class="form-group">
        <label>Availability</label>
        <div id="availabilityContainer">
          ${availabilityHtml || `
            <div class="form-row" style="margin-bottom: 8px;">
              <div class="form-group">
                <label>Day</label>
                <select class="av_day">
                  ${days.map(day => `<option value="${day}">${day}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Start</label>
                <input type="time" class="av_start" value="09:00" />
              </div>
              <div class="form-group">
                <label>End</label>
                <input type="time" class="av_end" value="17:00" />
              </div>
              <div class="form-group" style="display: flex; align-items: end;">
                <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.form-row').remove()">✕</button>
              </div>
            </div>
          `}
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="addAvailabilityRow()" style="margin-top: 8px;">
          + Add Availability
        </button>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">${editingDoctorId ? 'Update' : 'Create'}</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </form>
  `;
}

function addAvailabilityRow() {
  const container = document.getElementById('availabilityContainer');
  const row = document.createElement('div');
  row.className = 'form-row';
  row.style.marginBottom = '8px';
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  row.innerHTML = `
    <div class="form-group">
      <label>Day</label>
      <select class="av_day">
        ${days.map(day => `<option value="${day}">${day}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Start</label>
      <input type="time" class="av_start" value="09:00" />
    </div>
    <div class="form-group">
      <label>End</label>
      <input type="time" class="av_end" value="17:00" />
    </div>
    <div class="form-group" style="display: flex; align-items: end;">
      <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.form-row').remove()">✕</button>
    </div>
  `;
  container.appendChild(row);
}

// Form handlers
document.addEventListener('submit', async (e) => {
  if (e.target.id === 'patientForm') {
    e.preventDefault();
    const data = {
      name: document.getElementById('p_name').value,
      gender: document.getElementById('p_gender').value,
      dob: document.getElementById('p_dob').value,
      blood_group: document.getElementById('p_blood').value,
      phone: document.getElementById('p_phone').value,
      email: document.getElementById('p_email').value,
      address: document.getElementById('p_address').value,
    };
    
    try {
      if (editingPatientId) {
        await updatePatient(editingPatientId, data);
      } else {
        await createPatient(data);
      }
    } catch (error) {
      // Error already handled
    }
  }
  
  if (e.target.id === 'doctorForm') {
    e.preventDefault();
    const availability = [];
    document.querySelectorAll('#availabilityContainer .form-row').forEach(row => {
      availability.push({
        day: row.querySelector('.av_day').value,
        start_time: row.querySelector('.av_start').value,
        end_time: row.querySelector('.av_end').value,
      });
    });
    
    const data = {
      name: document.getElementById('d_name').value,
      specialization: document.getElementById('d_specialization').value,
      phone: document.getElementById('d_phone').value,
      email: document.getElementById('d_email').value,
      experience_years: parseInt(document.getElementById('d_experience').value),
      availability: availability,
    };
    
    try {
      if (editingDoctorId) {
        await updateDoctor(editingDoctorId, data);
      } else {
        await createDoctor(data);
      }
    } catch (error) {
      // Error already handled
    }
  }
});

// Stats
async function updateStats() {
  try {
    const [patientsRes, doctorsRes] = await Promise.all([
      fetch(`${API_BASE}/patients`),
      fetch(`${API_BASE}/doctors`),
    ]);
    
    const patientsData = patientsRes.ok ? await patientsRes.json() : [];
    const doctorsData = doctorsRes.ok ? await doctorsRes.json() : [];
    
    document.getElementById('totalPatients').textContent = patientsData.length || 0;
    document.getElementById('totalDoctors').textContent = doctorsData.length || 0;
    document.getElementById('totalAppointments').textContent = '0';
    
    // Recent patients for dashboard
    const recentTbody = document.getElementById('recentPatients');
    const recent = patientsData.slice(-3).reverse();
    if (recent.length === 0) {
      recentTbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 24px;">
            No patients yet
          </td>
        </tr>
      `;
    } else {
      recentTbody.innerHTML = recent.map(p => `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td>${p.phone}</td>
          <td>${p.email}</td>
          <td>${new Date(p.created_at).toLocaleDateString()}</td>
        </tr>
      `).join('');
    }
  } catch (error) {
    // Silent fail for stats
  }
}

// Search
document.getElementById('patientSearch')?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = patients.filter(p => 
    p.name.toLowerCase().includes(query) ||
    p.email.toLowerCase().includes(query) ||
    p.phone.includes(query)
  );
  renderPatients(filtered);
});

document.getElementById('doctorSearch')?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = doctors.filter(d => 
    d.name.toLowerCase().includes(query) ||
    d.specialization.toLowerCase().includes(query) ||
    d.email.toLowerCase().includes(query)
  );
  renderDoctors(filtered);
});

// Refresh buttons
document.getElementById('refreshPatients')?.addEventListener('click', fetchPatients);
document.getElementById('refreshDoctors')?.addEventListener('click', fetchDoctors);

// Add button
addBtn.addEventListener('click', () => {
  if (currentView === 'patients') {
    editingPatientId = null;
    openModal('Add Patient', getPatientForm());
  } else if (currentView === 'doctors') {
    editingDoctorId = null;
    openModal('Add Doctor', getDoctorForm());
  }
});

// Init
initTheme();
navigateTo('dashboard');
updateStats();
fetchPatients();
fetchDoctors();

// Auto-refresh every 30 seconds
setInterval(() => {
  if (currentView === 'patients') fetchPatients();
  if (currentView === 'doctors') fetchDoctors();
  updateStats();
}, 30000);