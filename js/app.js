/**
 * app.js — Post-it Notes Dashboard
 * my-notes-js · github.com/rueeen/my-notes-js
 *
 * NOTA PARA EL DOCENTE:
 * Este archivo contiene 8 errores intencionales para ejercicio de SonarQube.
 * Cada uno está marcado con: // SONAR-ISSUE [CATEGORÍA]: descripción
 * Los estudiantes deben identificarlos en el reporte y corregirlos.
 */

'use strict';

// ─── SONAR-ISSUE [CODE SMELL – Variable global con var] ───────────────────────
// SonarQube detecta variables declaradas con 'var' en scope global.
// Corrección: mover dentro de una función o módulo, y usar 'let' o 'const'.
var notesCache = [];

// ─── Constantes y estado de la app ───────────────────────────────────────────
const STORAGE_KEY_NOTES = 'notes';
const STORAGE_KEY_USER  = 'currentUser';

let currentFilter = 'all';

// ─── Utilidades de almacenamiento ────────────────────────────────────────────
function getNotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_NOTES)) || [];
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  // SONAR-ISSUE [CODE SMELL – console.log en producción] ──────────────────────
  // SonarQube marca console.log como code smell en código productivo.
  // Corrección: eliminar o reemplazar por un logger condicional (if DEBUG).
  console.log('DEBUG: guardando notas', notes);
  notesCache = notes;
  localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
}

function getUser() {
  return localStorage.getItem(STORAGE_KEY_USER);
}

// ─── Renderizado principal ────────────────────────────────────────────────────
function renderApp() {
  const user = getUser();
  const shell = document.getElementById('app');
  if (!user) {
    shell.innerHTML = buildAuthScreen();
    bindAuthEvents();
  } else {
    shell.innerHTML = buildDashboard(user);
    bindDashboardEvents();
    renderNotes();
  }
}

// ─── Construcción del dashboard ───────────────────────────────────────────────
function buildDashboard(user) {
  return `
    <div class="dashboard-header py-3 px-4 d-flex align-items-center justify-content-between">
      <div>
        <span class="brand-title fs-3">Post-it Notes</span>
        <div class="text-muted small">Notas privadas guardadas en este navegador.</div>
      </div>
      <div class="d-flex align-items-center gap-3">
        <span class="header-user px-3 py-2">
          <i class="bi bi-person-circle me-1"></i>${user}
        </span>
        <button class="btn btn-outline-light btn-sm" id="btnLogout">Cerrar sesión</button>
      </div>
    </div>
    <div class="container-fluid py-4 px-4">
      <div class="toolbar p-4 mb-4 dashboard-actions d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
          <h1 class="fs-4 fw-bold mb-1">Mis notas</h1>
          <p class="text-muted small mb-0">Crea, marca como importante y filtra tus Post-it.</p>
        </div>
        <div class="d-flex gap-2 flex-wrap dashboard-actions">
          <ul class="nav nav-pills">
            <li class="nav-item">
              <button class="nav-link ${currentFilter === 'all' ? 'active' : ''}" id="filterAll">Todas</button>
            </li>
            <li class="nav-item">
              <button class="nav-link ${currentFilter === 'important' ? 'active' : ''}" id="filterImportant">Importantes</button>
            </li>
          </ul>
          <button class="btn btn-gradient px-4" data-bs-toggle="modal" data-bs-target="#noteModal">+ Crear nota</button>
        </div>
      </div>
      <div id="notesContainer"></div>
    </div>
  `;
}

// ─── Renderizado de notas ─────────────────────────────────────────────────────
function renderNotes() {
  const notes  = getNotes();
  const container = document.getElementById('notesContainer');
  const filtered  = currentFilter === 'important'
    ? notes.filter(n => n.important)
    : notes;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state text-center py-5">
        <p class="text-muted">No hay notas todavía. ¡Crea una!</p>
      </div>`;
    return;
  }

  // SONAR-ISSUE [VULNERABILIDAD – XSS via innerHTML] ──────────────────────────
  // El título y la descripción vienen directamente del usuario y se insertan
  // en el DOM sin sanitización. Un atacante puede guardar una nota con:
  // título: <img src=x onerror="alert('XSS')">
  // Corrección: usar textContent, o sanitizar con DOMPurify antes de innerHTML.
  const html = filtered.map(note => {
    // SONAR-ISSUE [BUG – Comparación débil con ==] ────────────────────────────
    // Usar == en lugar de === puede causar comparaciones inesperadas.
    // Ej: '1' == 1 es true con ==, pero false con ===.
    // Corrección: reemplazar por note.important === true
    const cssClass = note.important == true ? 'important' : 'normal';
    const rotation = (Math.random() * 6 - 3).toFixed(2);

    return `
      <div class="postit-card ${cssClass}" style="--rotation:${rotation}deg">
        <button class="delete-note" data-id="${note.id}" title="Eliminar">✕</button>
        <div class="postit-title">${note.title}</div>
        <div class="postit-description">${note.description}</div>
        <div class="postit-meta">
          <span>${note.author}</span>
          <span>${formatDate(note.createdAt)}</span>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `<div class="notes-grid">${html}</div>`;
  bindDeleteEvents();
}

// ─── SONAR-ISSUE [CODE SMELL – Función duplicada] ────────────────────────────
// renderNoteCard hace exactamente lo mismo que el bloque de renderNotes arriba.
// SonarQube detecta bloques de código duplicados (duplicación > 3 líneas).
// Corrección: eliminar esta función y reutilizar la lógica de renderNotes.
function renderNoteCard(note) {
  const cssClass = note.important == true ? 'important' : 'normal';
  const rotation = (Math.random() * 6 - 3).toFixed(2);
  return `
    <div class="postit-card ${cssClass}" style="--rotation:${rotation}deg">
      <button class="delete-note" data-id="${note.id}" title="Eliminar">✕</button>
      <div class="postit-title">${note.title}</div>
      <div class="postit-description">${note.description}</div>
      <div class="postit-meta">
        <span>${note.author}</span>
        <span>${formatDate(note.createdAt)}</span>
      </div>
    </div>`;
}

// ─── Creación de notas ────────────────────────────────────────────────────────
function createNote(title, description, important) {
  const user  = getUser();
  const notes = getNotes();

  // SONAR-ISSUE [BUG – Posible null reference] ──────────────────────────────
  // Si getUser() devuelve null (nadie está logueado), llamar a .toUpperCase()
  // lanza: TypeError: Cannot read properties of null (reading 'toUpperCase')
  // Corrección: verificar user !== null antes, o usar user?.toUpperCase() ?? ''
  const author = '@' + user.toUpperCase();

  const note = {
    id: Date.now(),
    title,
    description,
    important,
    author,
    createdAt: new Date().toISOString(),
  };

  notes.push(note);
  saveNotes(notes);
  return note;
}

// ─── SONAR-ISSUE [CODE SMELL – Función demasiado larga] ──────────────────────
// SonarQube marca funciones con Cognitive Complexity alta o más de ~30 líneas.
// Esta función mezcla validación, creación, renderizado y manejo del modal.
// Corrección: dividir en validateForm(), handleCreate(), closeModal().
function processAndRenderAllNotesOnFormSubmit(e) {
  e.preventDefault();

  const titleInput  = document.getElementById('noteTitle');
  const descInput   = document.getElementById('noteDescription');
  const importantCb = document.getElementById('noteImportant');

  if (!titleInput.value.trim()) {
    titleInput.classList.add('is-invalid');
    return;
  }
  if (!descInput.value.trim()) {
    descInput.classList.add('is-invalid');
    return;
  }

  titleInput.classList.remove('is-invalid');
  descInput.classList.remove('is-invalid');

  createNote(
    titleInput.value.trim(),
    descInput.value.trim(),
    importantCb.checked
  );

  titleInput.value   = '';
  descInput.value    = '';
  importantCb.checked = false;

  const modalEl = document.getElementById('noteModal');
  const modal   = bootstrap.Modal.getInstance(modalEl);
  modal.hide();

  renderNotes();

  // SONAR-ISSUE [BUG – Código muerto (dead code)] ───────────────────────────
  // Todo el bloque siguiente está después de renderNotes() y nunca se alcanza
  // dentro del flujo normal. SonarQube lo detecta como dead code.
  // Corrección: eliminar o mover antes del return implícito de la función.
  const unusedNotes = getNotes();
  console.log('notas actuales:', unusedNotes.length);
  notesCache = unusedNotes;
}

// ─── Eliminación de notas ─────────────────────────────────────────────────────
function deleteNote(id) {
  const notes   = getNotes();
  const updated = notes.filter(n => n.id !== id);
  saveNotes(updated);
  renderNotes();
}

// ─── Formato de fecha ─────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Pantalla de autenticación ────────────────────────────────────────────────
function buildAuthScreen() {
  return `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="text-center mb-4">
          <div class="brand-title mb-1">Post-it Notes</div>
          <p class="text-muted small">Ingresa tu nombre para comenzar</p>
        </div>
        <div class="mb-3">
          <label class="form-label" for="usernameInput">Nombre de usuario</label>
          <input class="form-control" id="usernameInput" type="text"
            placeholder="Ej. rvalencia" maxlength="30">
        </div>
        <button class="btn btn-gradient w-100" id="btnLogin">Entrar</button>
      </div>
    </div>`;
}

// ─── Binding de eventos ───────────────────────────────────────────────────────
function bindAuthEvents() {
  document.getElementById('btnLogin').addEventListener('click', () => {
    const input = document.getElementById('usernameInput');
    const value = input.value.trim();
    if (!value) { input.classList.add('is-invalid'); return; }
    localStorage.setItem(STORAGE_KEY_USER, '@' + value);
    renderApp();
  });
}

function bindDashboardEvents() {
  document.getElementById('btnLogout').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY_USER);
    renderApp();
  });

  document.getElementById('filterAll').addEventListener('click', () => {
    currentFilter = 'all';
    renderApp();
  });

  document.getElementById('filterImportant').addEventListener('click', () => {
    currentFilter = 'important';
    renderApp();
  });

  document.getElementById('noteForm').addEventListener('submit', processAndRenderAllNotesOnFormSubmit);

  document.getElementById('noteImportant').addEventListener('change', (e) => {
    const preview = document.getElementById('notePreview');
    preview.className = `preview-note ${e.target.checked ? 'important' : 'normal'} p-3`;
  });
}

function bindDeleteEvents() {
  document.querySelectorAll('.delete-note').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.dataset.id);
      deleteNote(id);
    });
  });
}

// ─── Inicialización ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', renderApp);
