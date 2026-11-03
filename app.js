/* ── DOM References ─────────────────────────────────── */
const studentForm      = document.getElementById('studentForm');
const studentIdInput   = document.getElementById('studentId');
const nameInput        = document.getElementById('name');
const emailInput       = document.getElementById('email');
const departmentInput  = document.getElementById('department');
const semesterInput    = document.getElementById('semester');
const contactInput     = document.getElementById('contact');
const btnAdd           = document.getElementById('btnAdd');
const btnUpdate        = document.getElementById('btnUpdate');
const btnClear         = document.getElementById('btnClear');
const searchInput      = document.getElementById('searchInput');
const tableBody        = document.getElementById('studentTableBody');
const emptyState       = document.getElementById('emptyState');
const studentCount     = document.getElementById('studentCount');
const loadingOverlay   = document.getElementById('loadingOverlay');
const notification     = document.getElementById('notification');
const notifIcon        = document.getElementById('notifIcon');
const notifMessage     = document.getElementById('notifMessage');
const dialogOverlay    = document.getElementById('dialogOverlay');
const dialogMessage    = document.getElementById('dialogMessage');
const dialogConfirm    = document.getElementById('dialogConfirm');
const dialogCancel     = document.getElementById('dialogCancel');

const API_BASE = CONFIG.API_URL + '/api/students';

let allStudents  = [];
let editingStudentId = null;   // studentId of the student being edited
let notifTimer   = null;
let pendingDeleteId = null;

/* ── Helpers ───────────────────────────────────────── */

function showLoading() {
  loadingOverlay.classList.add('active');
}

function hideLoading() {
  loadingOverlay.classList.remove('active');
}

function showNotification(message, type) {
  clearTimeout(notifTimer);
  notifIcon.textContent = type === 'success' ? '✅' : '❌';
  notifMessage.textContent = message;
  notification.className = 'notification ' + type;

  // Trigger reflow so transition replays
  void notification.offsetWidth;
  notification.classList.add('show');

  notifTimer = setTimeout(() => {
    notification.classList.remove('show');
  }, 3500);
}

function clearForm() {
  studentForm.reset();
  editingStudentId = null;
  studentIdInput.disabled = false;
  btnAdd.style.display = '';
  btnUpdate.style.display = 'none';
}

function populateForm(student) {
  studentIdInput.value  = student.studentId;
  nameInput.value       = student.name;
  emailInput.value      = student.email;
  departmentInput.value = student.department;
  semesterInput.value   = student.semester;
  contactInput.value    = student.contact;

  editingStudentId = student.studentId;
  studentIdInput.disabled = true;   // Don't allow changing ID during edit
  btnAdd.style.display    = 'none';
  btnUpdate.style.display = '';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Render Table ──────────────────────────────────── */

function renderTable(students) {
  tableBody.innerHTML = '';

  if (students.length === 0) {
    emptyState.style.display = '';
    studentCount.textContent = '';
    return;
  }

  emptyState.style.display = 'none';
  studentCount.innerHTML = 'Showing <strong>' + students.length + '</strong> student' + (students.length !== 1 ? 's' : '');

  students.forEach(function (s) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + escapeHtml(s.studentId)   + '</td>' +
      '<td>' + escapeHtml(s.name)        + '</td>' +
      '<td>' + escapeHtml(s.email)       + '</td>' +
      '<td>' + escapeHtml(s.department)  + '</td>' +
      '<td>' + s.semester                + '</td>' +
      '<td>' + escapeHtml(s.contact)     + '</td>' +
      '<td class="actions-cell">' +
        '<button class="btn btn-secondary btn-sm btn-edit" data-sid="' + escapeHtml(s.studentId) + '">✏️ Edit</button>' +
        '<button class="btn btn-danger btn-sm btn-delete" data-sid="' + escapeHtml(s.studentId) + '">🗑️ Delete</button>' +
      '</td>';
    tableBody.appendChild(tr);
  });
}

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

/* ── API Calls ─────────────────────────────────────── */

function fetchStudents() {
  showLoading();
  fetch(API_BASE)
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to fetch students');
      return res.json();
    })
    .then(function (data) {
      allStudents = Array.isArray(data) ? data : [];
      renderTable(allStudents);
    })
    .catch(function (err) {
      showNotification('Error loading students: ' + err.message, 'error');
    })
    .finally(hideLoading);
}

function addStudent(student) {
  showLoading();
  fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(student)
  })
    .then(function (res) {
      if (!res.ok) return res.json().then(function (e) { throw new Error(e.error || 'Failed to add student'); });
      return res.json();
    })
    .then(function () {
      showNotification('Student added successfully!', 'success');
      clearForm();
      fetchStudents();
    })
    .catch(function (err) {
      showNotification(err.message, 'error');
    })
    .finally(hideLoading);
}

function updateStudent(studentId, student) {
  showLoading();
  fetch(API_BASE + '/' + studentId, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(student)
  })
    .then(function (res) {
      if (!res.ok) return res.json().then(function (e) { throw new Error(e.error || 'Failed to update student'); });
      return res.json();
    })
    .then(function () {
      showNotification('Student updated successfully!', 'success');
      clearForm();
      fetchStudents();
    })
    .catch(function (err) {
      showNotification(err.message, 'error');
    })
    .finally(hideLoading);
}

function deleteStudent(studentId) {
  showLoading();
  fetch(API_BASE + '/' + studentId, { method: 'DELETE' })
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to delete student');
      showNotification('Student deleted successfully!', 'success');
      fetchStudents();
    })
    .catch(function (err) {
      showNotification(err.message, 'error');
    })
    .finally(hideLoading);
}

/* ── Event Handlers ────────────────────────────────── */

// Submit form → add
studentForm.addEventListener('submit', function (e) {
  e.preventDefault();
  var student = {
    studentId:  studentIdInput.value.trim(),
    name:       nameInput.value.trim(),
    email:      emailInput.value.trim(),
    department: departmentInput.value,
    semester:   semesterInput.value,
    contact:    contactInput.value.trim()
  };
  addStudent(student);
});

// Update button
btnUpdate.addEventListener('click', function () {
  if (!editingStudentId) return;
  var student = {
    studentId:  studentIdInput.value.trim(),
    name:       nameInput.value.trim(),
    email:      emailInput.value.trim(),
    department: departmentInput.value,
    semester:   semesterInput.value,
    contact:    contactInput.value.trim()
  };
  updateStudent(editingStudentId, student);
});

// Clear button
btnClear.addEventListener('click', clearForm);

// Search
searchInput.addEventListener('input', function () {
  var query = searchInput.value.toLowerCase().trim();
  if (!query) {
    renderTable(allStudents);
    return;
  }
  var filtered = allStudents.filter(function (s) {
    return (s.studentId && s.studentId.toLowerCase().includes(query)) ||
           (s.name && s.name.toLowerCase().includes(query));
  });
  renderTable(filtered);
});

// Table action delegation (Edit / Delete)
tableBody.addEventListener('click', function (e) {
  var btn = e.target.closest('button');
  if (!btn) return;
  var sid = btn.dataset.sid;

  if (btn.classList.contains('btn-edit')) {
    var student = allStudents.find(function (s) { return s.studentId === sid; });
    if (student) populateForm(student);
  }

  if (btn.classList.contains('btn-delete')) {
    var target = allStudents.find(function (s) { return s.studentId === sid; });
    pendingDeleteId = sid;
    dialogMessage.textContent = 'Are you sure you want to delete ' + (target ? target.name : 'this student') + '?';
    dialogOverlay.classList.add('active');
  }
});

// Confirm dialog
dialogConfirm.addEventListener('click', function () {
  dialogOverlay.classList.remove('active');
  if (pendingDeleteId) {
    deleteStudent(pendingDeleteId);
    pendingDeleteId = null;
  }
});

dialogCancel.addEventListener('click', function () {
  dialogOverlay.classList.remove('active');
  pendingDeleteId = null;
});

dialogOverlay.addEventListener('click', function (e) {
  if (e.target === dialogOverlay) {
    dialogOverlay.classList.remove('active');
    pendingDeleteId = null;
  }
});

/* ── Init ──────────────────────────────────────────── */
fetchStudents();
