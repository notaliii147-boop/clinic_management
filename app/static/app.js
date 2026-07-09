const API_BASE = window.location.origin;
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// State
let currentView = "dashboard";
let patients = [];
let doctors = [];
let appointments = [];
let editingPatientId = null;
let editingDoctorId = null;
let bookingPatientId = null;

// DOM Elements
const views = {
  dashboard: document.getElementById("view-dashboard"),
  patients: document.getElementById("view-patients"),
  doctors: document.getElementById("view-doctors"),
};

const navItems = document.querySelectorAll(".nav-item");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const addBtn = document.getElementById("addBtn");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");
const toastContainer = document.getElementById("toastContainer");
const themeToggle = document.getElementById("themeToggle");

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Theme Management
function initTheme() {
  const saved = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  themeToggle.innerHTML =
    saved === "dark"
      ? '<i class="fa-regular fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  themeToggle.innerHTML =
    next === "dark"
      ? '<i class="fa-regular fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
}

themeToggle.addEventListener("click", toggleTheme);

function createParticle(x, y) {
  const particle = document.createElement("particle");
  document.body.appendChild(particle);

  const size = Math.floor(Math.random() * 20 + 22);
  const destinationX = (Math.random() - 0.5) * 260;
  const destinationY = (Math.random() - 0.5) * 260;
  const rotation = Math.random() * 520;
  const delay = Math.random() * 260;
  const hue = Math.random() * 90 + 270;

  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.left = `${x}px`;
  particle.style.top = `${y}px`;
  particle.style.background = `hsl(${hue}, 78%, 62%)`;
  particle.style.border = "1px solid rgba(255,255,255,0.9)";
  particle.style.borderRadius = "3px";
  particle.style.boxShadow = "0 0 10px rgba(255,255,255,0.2)";

  const animation = particle.animate(
    [
      {
        transform: "translate(-50%, -50%) rotate(0deg) scale(1)",
        opacity: 1,
      },
      {
        transform: `translate(calc(-50% + ${destinationX}px), calc(-50% + ${destinationY}px)) rotate(${rotation}deg) scale(0)`,
        opacity: 0,
      },
    ],
    {
      duration: Math.random() * 1000 + 2200,
      easing: "cubic-bezier(0, .9, .57, 1)",
      delay,
    },
  );

  animation.onfinish = () => particle.remove();
}

function pop(e) {
  if (e.clientX === 0 && e.clientY === 0) {
    const bbox = e.target.getBoundingClientRect();
    const x = bbox.left + bbox.width / 2;
    const y = bbox.top + bbox.height / 2;
    for (let i = 0; i < 28; i += 1) {
      createParticle(x, y);
    }
    return;
  }

  const x = e.clientX;
  const y = e.clientY + window.scrollY;

  for (let i = 0; i < 28; i += 1) {
    createParticle(x, y);
  }
}

document.addEventListener("click", (event) => {
  if (event.target.closest(".modal") || event.target.closest(".toast")) {
    return;
  }
  pop(event);
});

// Navigation
function navigateTo(view) {
  currentView = view;

  // Update nav
  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });

  // Update views
  Object.keys(views).forEach((key) => {
    views[key].classList.toggle("active", key === view);
  });

  // Update header
  const titles = {
    dashboard: ["Dashboard", "Overview of your clinic"],
    patients: ["Patients", "Manage patient records"],
    doctors: ["Doctors", "Manage doctor profiles"],
  };
  const [title, subtitle] = titles[view] || ["", ""];
  pageTitle.textContent = title;
  pageSubtitle.textContent = subtitle;

  // Update add button
  if (view === "dashboard") {
    addBtn.style.display = "none";
  } else {
    addBtn.style.display = "inline-flex";
    addBtn.textContent = `+ Add ${view.slice(0, -1).charAt(0).toUpperCase() + view.slice(1, -1)}`;
  }
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    navigateTo(item.dataset.view);
    if (item.dataset.view === "patients") fetchPatients();
    if (item.dataset.view === "doctors") fetchDoctors();
  });
});

// Toast
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Modal
function openModal(title, content) {
  modalTitle.textContent = title;
  modalBody.innerHTML = content;
  modal.classList.add("active");
}

function closeModal() {
  modal.classList.remove("active");
  editingPatientId = null;
  editingDoctorId = null;
}

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// API Calls
async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const message =
        typeof data === "object" && data !== null
          ? data.message || data.detail || "Request failed"
          : data;
      throw new Error(typeof message === "string" ? message : "Request failed");
    }

    return data;
  } catch (error) {
    showToast(error.message || "Request failed", "error");
    throw error;
  }
}

// Patients
async function fetchPatients() {
  try {
    patients = await apiFetch("/patients");
    renderPatients();
    updateStats();
  } catch (error) {
    // Show empty state
    renderPatients([]);
  }
}

function renderPatients(data = null) {
  const tbody = document.getElementById("patientsTable");
  const list = data || patients;

  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <div><i class="fa-solid fa-person"></i></div>
          <h3>No patients found</h3>
          <p>Click "Add Patient" to create your first record</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list
    .map(
      (p) => `
    <tr class="clickable-row" onclick="showPatientDetails('${p.id}')">
      <td><code>${p.id.slice(0, 8)}</code></td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${escapeHtml(p.gender)}</td>
      <td>${formatDate(p.dob)}</td>
      <td>${escapeHtml(p.blood_group)}</td>
      <td>${escapeHtml(p.phone)}</td>
      <td>${escapeHtml(p.email)}</td>
      <td>
        <button class="btn btn-info btn-sm" title="Show Appointments" aria-label="Show appointments" onclick="event.stopPropagation(); showPatientAppointments('${p.id}')">
          <i class="fa-solid fa-calendar-check"></i>
        </button>
        <button class="btn btn-primary btn-sm" title="Book Appointment" aria-label="Book appointment" onclick="event.stopPropagation(); openBookingModal('${p.id}')">
          <i class="fa-solid fa-calendar-plus"></i>
        </button>
        <button class="btn btn-secondary btn-sm" title="Edit Patient" aria-label="Edit patient" onclick="event.stopPropagation(); editPatient('${p.id}')">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="btn btn-danger btn-sm" title="Delete Patient" aria-label="Delete patient" onclick="event.stopPropagation(); deletePatient('${p.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>
  `,
    )
    .join("");
}

async function createPatient(data) {
  const result = await apiFetch("/patients", {
    method: "POST",
    body: JSON.stringify(data),
  });
  showToast("Patient created successfully!");
  closeModal();
  fetchPatients();
  updateStats();
  return result;
}

async function updatePatient(id, data) {
  const result = await apiFetch(`/patients/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  showToast("Patient updated successfully!");
  closeModal();
  fetchPatients();
  return result;
}

async function deletePatient(id) {
  if (!confirm("Are you sure you want to delete this patient?")) return;
  await apiFetch(`/patients/${id}`, { method: "DELETE" });
  showToast("Patient deleted successfully!");
  fetchPatients();
  updateStats();
}

async function editPatient(id) {
  const patient = await apiFetch(`/patients/${id}`);
  editingPatientId = id;
  openModal("Edit Patient", getPatientForm(patient));
}

async function showPatientDetails(id) {
  const patient = await apiFetch(`/patients/${id}`);
  const content = `
    <div class="detail-card">
      <div class="detail-header">
        <div class="detail-icon"><i class="fa-solid fa-circle-user"></i></div>
        <div>
          <h4>${escapeHtml(patient.name)}</h4>
          <p>${escapeHtml(patient.gender)} • ${escapeHtml(patient.blood_group)}</p>
        </div>
      </div>
      <div class="detail-grid">
        <div><span class="detail-label">ID</span><span>${escapeHtml(patient.id)}</span></div>
        <div><span class="detail-label">DOB</span><span>${formatDate(patient.dob)}</span></div>
        <div><span class="detail-label">Phone</span><span>${escapeHtml(patient.phone)}</span></div>
        <div><span class="detail-label">Email</span><span>${escapeHtml(patient.email)}</span></div>
        <div><span class="detail-label">Address</span><span>${escapeHtml(patient.address)}</span></div>
        <div><span class="detail-label">Created</span><span>${escapeHtml(patient.created_at)}</span></div>
        <div><span class="detail-label">Updated</span><span>${escapeHtml(patient.updated_at)}</span></div>
      </div>
    </div>
  `;
  openModal("Patient Details", content);
}

async function showPatientAppointments(patientId) {
  const patient =
    patients.find((p) => p.id === patientId) ||
    (await apiFetch(`/patients/${patientId}`));
  if (!patient) {
    showToast("Unable to load patient details.", "error");
    return;
  }

  if (!doctors.length) {
    await fetchDoctors();
  }
  if (!appointments.length) {
    await fetchAppointments();
  }

  const patientAppointments = appointments.filter(
    (appointment) => appointment.patient_id === patientId,
  );
  const appointmentRows = patientAppointments.length
    ? patientAppointments
        .map((appointment) => {
          const doctor = doctors.find((d) => d.id === appointment.doctor_id);
          const doctorDisplay = doctor
            ? `${escapeHtml(doctor.name)} (${escapeHtml(doctor.specialization)})`
            : escapeHtml(appointment.doctor_id);
          return `
          <tr>
            <td><code>${appointment.id.slice(0, 8)}</code></td>
            <td>${doctorDisplay}</td>
            <td>${formatDate(appointment.appointment_date)}</td>
            <td>${escapeHtml(appointment.appointment_time)}</td>
            <td>${escapeHtml(appointment.status)}</td>
            <td>${escapeHtml(appointment.notes || "-")}</td>
          </tr>
        `;
        })
        .join("")
    : `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 24px;">No appointments found for this patient.</td>
          </tr>
        `;

  const content = `
    <div class="detail-card">
      <div class="detail-header">
        <div class="detail-icon"><i class="fa-solid fa-calendar-check"></i></div>
        <div>
          <h4>Appointments for ${escapeHtml(patient.name)}</h4>
          <p>${escapeHtml(patient.email)} • ${escapeHtml(patient.phone)}</p>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Doctor</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${appointmentRows}
          </tbody>
        </table>
      </div>
    </div>
  `;

  openModal("Patient Appointments", content);
}

function getPatientForm(data = {}) {
  const p = data;
  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const genders = ["Male", "Female", "Not Specified"];

  return `
    <form id="patientForm">
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="p_name" value="${p.name || ""}" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Gender</label>
          <select id="p_gender">
            ${genders.map((g) => `<option value="${g}" ${p.gender === g ? "selected" : ""}>${g}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label>Date of Birth</label>
          <input type="date" id="p_dob" value="${formatDate(p.dob) || ""}" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Blood Group</label>
          <select id="p_blood">
            ${bloodGroups.map((b) => `<option value="${b}" ${p.blood_group === b ? "selected" : ""}>${b}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input type="tel" id="p_phone" value="${p.phone || ""}" placeholder="+92 300 1234567" required />
        </div>
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="p_email" value="${p.email || ""}" placeholder="name@email.com" required />
      </div>
      <div class="form-group">
        <label>Address</label>
        <textarea id="p_address" rows="3">${p.address || ""}</textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">${editingPatientId ? "Update" : "Create"}</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </form>
  `;
}

// Doctors
async function fetchDoctors() {
  try {
    doctors = await apiFetch("/doctors");
    renderDoctors();
    updateStats();
  } catch (error) {
    renderDoctors([]);
  }
}

async function fetchAppointments() {
  try {
    appointments = await apiFetch("/appointments");
  } catch (error) {
    appointments = [];
  }
}

function renderDoctors(data = null) {
  const tbody = document.getElementById("doctorsTable");
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

  tbody.innerHTML = list
    .map(
      (d) => `
    <tr class="clickable-row" onclick="showDoctorDetails('${d.id}')">
      <td><code>${d.id.slice(0, 8)}</code></td>
      <td><strong>${escapeHtml(d.name)}</strong></td>
      <td>${escapeHtml(d.specialization)}</td>
      <td>${escapeHtml(d.phone)}</td>
      <td>${escapeHtml(d.email)}</td>
      <td>${escapeHtml(d.experience_years)} years</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); editDoctor('${d.id}')">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteDoctor('${d.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>
  `,
    )
    .join("");
}

async function createDoctor(data) {
  const result = await apiFetch("/doctors", {
    method: "POST",
    body: JSON.stringify(data),
  });
  showToast("Doctor created successfully!");
  closeModal();
  fetchDoctors();
  updateStats();
  return result;
}

async function updateDoctor(id, data) {
  const result = await apiFetch(`/doctors/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  showToast("Doctor updated successfully!");
  closeModal();
  fetchDoctors();
  return result;
}

async function deleteDoctor(id) {
  if (!confirm("Are you sure you want to delete this doctor?")) return;
  await apiFetch(`/doctors/${id}`, { method: "DELETE" });
  showToast("Doctor deleted successfully!");
  fetchDoctors();
  updateStats();
}

async function editDoctor(id) {
  const doctor = await apiFetch(`/doctors/${id}`);
  editingDoctorId = id;
  openModal("Edit Doctor", getDoctorForm(doctor));
}

async function showDoctorDetails(id) {
  const doctor = await apiFetch(`/doctors/${id}`);
  const availability = (doctor.availability || [])
    .map(
      (slot) => `
    <li>${escapeHtml(slot.day)} • ${escapeHtml(slot.start_time)} - ${escapeHtml(slot.end_time)}</li>
  `,
    )
    .join("");

  const content = `
    <div class="detail-card">
      <div class="detail-header">
        <div class="detail-icon"><i class="fa-solid fa-user-doctor"></i></div>
        <div>
          <h4>${escapeHtml(doctor.name)}</h4>
          <p>${escapeHtml(doctor.specialization)} • ${escapeHtml(doctor.experience_years)} years</p>
        </div>
      </div>
      <div class="detail-grid">
        <div><span class="detail-label">ID</span><span>${escapeHtml(doctor.id)}</span></div>
        <div><span class="detail-label">Phone</span><span>${escapeHtml(doctor.phone)}</span></div>
        <div><span class="detail-label">Email</span><span>${escapeHtml(doctor.email)}</span></div>
        <div><span class="detail-label">Created</span><span>${escapeHtml(doctor.created_at)}</span></div>
        <div><span class="detail-label">Updated</span><span>${escapeHtml(doctor.updated_at)}</span></div>
      </div>
      <div class="detail-section">
        <h5>Availability</h5>
        <ul class="detail-list">${availability || "<li>No availability listed</li>"}</ul>
      </div>
    </div>
  `;
  openModal("Doctor Details", content);
}

function showFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const existing = input.parentElement.querySelector(".field-error");
  if (existing) existing.remove();

  input.classList.add("field-error-input");
  const error = document.createElement("div");
  error.className = "field-error";
  error.textContent = message;
  input.parentElement.appendChild(error);
}

function clearFieldErrors(form) {
  form
    .querySelectorAll(".field-error-input")
    .forEach((input) => input.classList.remove("field-error-input"));
  form.querySelectorAll(".field-error").forEach((error) => error.remove());
}

function validatePatientForm() {
  const errors = [];
  const name = document.getElementById("p_name").value.trim();
  const phone = document.getElementById("p_phone").value.trim();
  const email = document.getElementById("p_email").value.trim();
  const address = document.getElementById("p_address").value.trim();
  const dob = document.getElementById("p_dob").value;

  if (!name) {
    errors.push({ field: "p_name", message: "Name is required." });
  }
  if (!dob) {
    errors.push({ field: "p_dob", message: "Date of birth is required." });
  }
  if (!phone || !/^\+92\d{10}$/.test(phone.replace(/\s+/g, ""))) {
    errors.push({
      field: "p_phone",
      message: "Phone must be in +92XXXXXXXXXX format.",
    });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: "p_email", message: "Enter a valid email address." });
  }
  if (!address) {
    errors.push({ field: "p_address", message: "Address is required." });
  }

  return errors;
}

function validateDoctorForm() {
  const errors = [];
  const name = document.getElementById("d_name").value.trim();
  const specialization = document
    .getElementById("d_specialization")
    .value.trim();
  const phone = document.getElementById("d_phone").value.trim();
  const email = document.getElementById("d_email").value.trim();
  const experience = document.getElementById("d_experience").value;

  if (!name) {
    errors.push({ field: "d_name", message: "Name is required." });
  }
  if (!specialization) {
    errors.push({
      field: "d_specialization",
      message: "Specialization is required.",
    });
  }
  if (!phone || !/^\+92\d{10}$/.test(phone.replace(/\s+/g, ""))) {
    errors.push({
      field: "d_phone",
      message: "Phone must be in +92XXXXXXXXXX format.",
    });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: "d_email", message: "Enter a valid email address." });
  }
  if (!experience || Number(experience) < 0) {
    errors.push({
      field: "d_experience",
      message: "Experience must be 0 or more.",
    });
  }

  return errors;
}

function validateBookingForm() {
  const errors = [];
  const doctorId = document.getElementById("bookingDoctor")?.value;
  const date = document.getElementById("bookingDate")?.value;
  const time = document.getElementById("bookingTime")?.value;

  if (!doctorId) {
    errors.push({ field: "bookingDoctor", message: "Please select a doctor." });
  }
  if (!date) {
    errors.push({ field: "bookingDate", message: "Please select a date." });
  } else {
    const today = getTodayLocalDate();
    if (date < today) {
      errors.push({ field: "bookingDate", message: "Appointment date cannot be in the past." });
    }
  }
  if (!time) {
    errors.push({ field: "bookingTime", message: "Please select a time." });
  }

  return errors;
}

function getDoctorForm(data = {}) {
  const d = data;

  const availabilityHtml =
    d.availability && d.availability.length > 0
      ? d.availability
          .map(
            (slot, i) => `
        <div class="form-row" style="margin-bottom: 8px;">
          <div class="form-group">
            <label>Day</label>
            <select class="av_day">
              ${DAYS.map((day) => `<option value="${day}" ${slot.day === day ? "selected" : ""}>${day}</option>`).join("")}
            </select>
          </div>
          <div class="form-group">
            <label>Start</label>
            <input type="time" class="av_start" value="${slot.start_time || "09:00"}" />
          </div>
          <div class="form-group">
            <label>End</label>
            <input type="time" class="av_end" value="${slot.end_time || "17:00"}" />
          </div>
          <div class="form-group" style="display: flex; align-items: end;">
            <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.form-row').remove()">✕</button>
          </div>
        </div>
      `,
          )
          .join("")
      : "";

  return `
    <form id="doctorForm">
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="d_name" value="${d.name || ""}" required />
      </div>
      <div class="form-group">
        <label>Specialization</label>
        <input type="text" id="d_specialization" value="${d.specialization || ""}" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Phone</label>
          <input type="tel" id="d_phone" value="${d.phone || ""}" placeholder="+92 300 1234567" required />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="d_email" value="${d.email || ""}" placeholder="name@email.com" required />
        </div>
      </div>
      <div class="form-group">
        <label>Experience (Years)</label>
        <input type="number" id="d_experience" value="${d.experience_years || 0}" min="0" required />
      </div>
      <div class="form-group">
        <label>Availability</label>
        <div id="availabilityContainer">
          ${
            availabilityHtml ||
            `
            <div class="form-row" style="margin-bottom: 8px;">
              <div class="form-group">
                <label>Day</label>
                <select class="av_day">
                  ${DAYS.map((day) => `<option value="${day}">${day}</option>`).join("")}
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
          `
          }
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="addAvailabilityRow()" style="margin-top: 8px;">
          + Add Availability
        </button>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">${editingDoctorId ? "Update" : "Create"}</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </form>
  `;
}

function addAvailabilityRow() {
  const container = document.getElementById("availabilityContainer");
  const row = document.createElement("div");
  row.className = "form-row";
  row.style.marginBottom = "8px";
  row.innerHTML = `
    <div class="form-group">
      <label>Day</label>
      <select class="av_day">
        ${DAYS.map((day) => `<option value="${day}">${day}</option>`).join("")}
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

function getBookingForm(doctorOptions = [], selectedDoctorId = "") {
  return `
    <form id="bookingForm">
      <div class="form-group">
        <label>Patient</label>
        <select id="bookingPatient" disabled>
          <option value="">Selected Patient</option>
        </select>
      </div>
      <div class="form-group">
        <label>Doctor</label>
        <select id="bookingDoctor" required>
          ${doctorOptions
            .map(
              (doc) => `
            <option value="${doc.id}" ${doc.id === selectedDoctorId ? "selected" : ""}>
              ${escapeHtml(doc.name)} (${escapeHtml(doc.specialization)})
            </option>
          `,
            )
            .join("")}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="bookingDate" required min="${getTodayLocalDate()}" />
        </div>
        <div class="form-group">
          <label>Time</label>
          <input type="time" id="bookingTime" required />
        </div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="bookingNotes" rows="3"></textarea>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Book Appointment</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </form>
  `;
}

async function openBookingModal(patientId) {
  bookingPatientId = patientId;
  const patient =
    patients.find((p) => p.id === patientId) ||
    (await apiFetch(`/patients/${patientId}`));
  if (!patient) {
    showToast("Unable to load patient details.", "error");
    return;
  }

  if (!doctors.length) {
    await fetchDoctors();
  }

  const content = `
    <div class="detail-card">
      <div class="detail-header">
        <div class="detail-icon"><i class="fa-solid fa-calendar-plus"></i></div>
        <div>
          <h4>Book Appointment for ${escapeHtml(patient.name)}</h4>
          <p>${escapeHtml(patient.email)} • ${escapeHtml(patient.phone)}</p>
        </div>
      </div>
      ${getBookingForm(doctors)}
    </div>
  `;

  openModal("Book Appointment", content);
  document.getElementById("bookingPatient").innerHTML = `
    <option value="${escapeHtml(patient.id)}" selected>
      ${escapeHtml(patient.name)}
    </option>
  `;
}

async function bookAppointment(data) {
  const result = await apiFetch("/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
  showToast("Appointment booked successfully!");
  closeModal();
  await updateStats();
  return result;
}

// Form handlers
document.addEventListener("submit", async (e) => {
  if (e.target.id === "patientForm") {
    e.preventDefault();
    clearFieldErrors(e.target);
    const errors = validatePatientForm();
    if (errors.length) {
      errors.forEach(({ field, message }) => showFieldError(field, message));
      showToast("Please correct the highlighted fields.", "error");
      return;
    }

    const data = {
      name: document.getElementById("p_name").value,
      gender: document.getElementById("p_gender").value,
      dob: document.getElementById("p_dob").value,
      blood_group: document.getElementById("p_blood").value,
      phone: document.getElementById("p_phone").value,
      email: document.getElementById("p_email").value,
      address: document.getElementById("p_address").value,
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

  if (e.target.id === "doctorForm") {
    e.preventDefault();
    clearFieldErrors(e.target);
    const errors = validateDoctorForm();
    if (errors.length) {
      errors.forEach(({ field, message }) => showFieldError(field, message));
      showToast("Please correct the highlighted fields.", "error");
      return;
    }

    const availability = [];
    document
      .querySelectorAll("#availabilityContainer .form-row")
      .forEach((row) => {
        availability.push({
          day: row.querySelector(".av_day").value,
          start_time: row.querySelector(".av_start").value,
          end_time: row.querySelector(".av_end").value,
        });
      });

    const data = {
      name: document.getElementById("d_name").value,
      specialization: document.getElementById("d_specialization").value,
      phone: document.getElementById("d_phone").value,
      email: document.getElementById("d_email").value,
      experience_years: parseInt(document.getElementById("d_experience").value),
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

  if (e.target.id === "bookingForm") {
    e.preventDefault();
    clearFieldErrors(e.target);
    const errors = validateBookingForm();
    if (errors.length) {
      errors.forEach(({ field, message }) => showFieldError(field, message));
      showToast("Please correct the highlighted fields.", "error");
      return;
    }

    const data = {
      patient_id: bookingPatientId,
      doctor_id: document.getElementById("bookingDoctor").value,
      appointment_date: document.getElementById("bookingDate").value,
      appointment_time: document.getElementById("bookingTime").value,
      notes: document.getElementById("bookingNotes").value,
    };

    try {
      await bookAppointment(data);
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
      fetchAppointments(),
    ]);

    const patientsData = patientsRes.ok ? await patientsRes.json() : [];
    const doctorsData = doctorsRes.ok ? await doctorsRes.json() : [];

    const activeAppointments = appointments.filter(
      (appointment) => appointment.status === "Scheduled",
    );

    document.getElementById("totalPatients").textContent =
      patientsData.length || 0;
    document.getElementById("totalDoctors").textContent =
      doctorsData.length || 0;
    document.getElementById("totalAppointments").textContent =
      activeAppointments.length || 0;
    document.getElementById("patientsChange").textContent = "Current records";
    document.getElementById("doctorsChange").textContent = "Current records";
    document.getElementById("appointmentsChange").textContent =
      activeAppointments.length > 0
        ? `${activeAppointments.length} active`
        : "No active appointments";

    // Recent patients for dashboard
    const recentTbody = document.getElementById("recentPatients");
    const recent = patientsData.slice(-3).reverse();
    if (recent.length === 0) {
      recentTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 24px;">
            No patients yet
          </td>
        </tr>
      `;
    } else {
      recentTbody.innerHTML = recent
        .map(
          (p) => `
        <tr>
          <td><strong>${escapeHtml(p.name)}</strong></td>
          <td>${escapeHtml(p.phone)}</td>
          <td>${escapeHtml(p.email)}</td>
          <td>${new Date(p.created_at).toLocaleDateString()}</td>
          <td>
            <button class="btn btn-info btn-sm" title="Show Appointments" aria-label="Show appointments" onclick="event.stopPropagation(); showPatientAppointments('${p.id}')">
            <i class="fa-solid fa-calendar-check"></i>
            </button>
            <button class="btn btn-primary btn-sm" title="Book Appointment" aria-label="Book appointment" onclick="event.stopPropagation(); openBookingModal('${p.id}')">
              <i class="fa-solid fa-calendar-plus"></i>
            </button>
          </td>
        </tr>
      `,
        )
        .join("");
    }
  } catch (error) {
    // Silent fail for stats
  }
}

async function lookupPatientById(query) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    renderPatients(patients);
    return;
  }

  try {
    const patient = await apiFetch(
      `/patients/${encodeURIComponent(trimmedQuery)}`,
    );
    renderPatients([patient]);
  } catch (error) {
    const filtered = patients.filter((p) => {
      const haystack = `${p.name} ${p.email} ${p.phone}`.toLowerCase();
      return haystack.includes(trimmedQuery.toLowerCase());
    });

    renderPatients(filtered);
    if (!filtered.length) {
      showToast("No patient found for that ID or search term.", "error");
    }
  }
}

// Search
document.getElementById("patientSearch")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    lookupPatientById(e.target.value);
  }
});

document.getElementById("patientSearchBtn")?.addEventListener("click", () => {
  lookupPatientById(document.getElementById("patientSearch").value);
});

async function lookupDoctorById(query) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    renderDoctors(doctors);
    return;
  }

  try {
    const doctor = await apiFetch(
      `/doctors/${encodeURIComponent(trimmedQuery)}`,
    );
    renderDoctors([doctor]);
  } catch (error) {
    const filtered = doctors.filter((d) => {
      const haystack = `${d.name} ${d.specialization} ${d.email}`.toLowerCase();
      return haystack.includes(trimmedQuery.toLowerCase());
    });

    renderDoctors(filtered);
    if (!filtered.length) {
      showToast("No doctor found for that ID or search term.", "error");
    }
  }
}

document.getElementById("doctorSearch")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    lookupDoctorById(e.target.value);
  }
});

document.getElementById("doctorSearchBtn")?.addEventListener("click", () => {
  lookupDoctorById(document.getElementById("doctorSearch").value);
});

// Add button
addBtn.addEventListener("click", () => {
  if (currentView === "patients") {
    editingPatientId = null;
    openModal("Add Patient", getPatientForm());
  } else if (currentView === "doctors") {
    editingDoctorId = null;
    openModal("Add Doctor", getDoctorForm());
  }
});

// Init
initTheme();
navigateTo("dashboard");
updateStats();
fetchPatients();
fetchDoctors();

// Auto-refresh every 30 seconds
setInterval(() => {
  if (currentView === "patients") fetchPatients();
  if (currentView === "doctors") fetchDoctors();
  updateStats();
}, 30000);
