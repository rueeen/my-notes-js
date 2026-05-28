/* =========================================================
Constantes y utilidades de almacenamiento local
========================================================= */
const STORAGE_KEYS = {
  users: 'postit_users',
  notes: 'postit_notes',
  session: 'postit_session'
};

const $app = document.getElementById('app');
const noteModalElement = document.getElementById('noteModal');
const noteForm = document.getElementById('noteForm');
const noteImportantInput = document.getElementById('noteImportant');
const notePreview = document.getElementById('notePreview');
let currentFilter = 'all';
let noteModal;

const readStorage = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch (error) {
    console.warn(`No se pudo leer ${key}:`, error);
    return fallback;
  }
};

const writeStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[character]));

const formatDate = (timestamp) => new Intl.DateTimeFormat('es', {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(new Date(timestamp));

const getRotation = (id) => {
  const seed = String(id).split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return ((seed % 41) / 10 - 2).toFixed(1);
};

/* =========================================================
   Módulo Auth: registro, login, logout y sesión activa
========================================================= */
const Auth = {
  getUsers() {
    return readStorage(STORAGE_KEYS.users, []);
  },
  register(username, password, confirmPassword) {
    const cleanUsername = username.trim();
    const users = this.getUsers();

    if (!cleanUsername || !password || !confirmPassword) {
      return { ok: false, message: 'Completa usuario, contraseña y confirmación.' };
    }

    if (password !== confirmPassword) {
      return { ok: false, message: 'Las contraseñas no coinciden.' };
    }

    if (users.some((user) => user.username.toLowerCase() === cleanUsername.toLowerCase())) {
      return { ok: false, message: 'Ese usuario ya existe.' };
    }

    users.push({ username: cleanUsername, password });
    writeStorage(STORAGE_KEYS.users, users);
    localStorage.setItem(STORAGE_KEYS.session, cleanUsername);
    return { ok: true, message: 'Registro completado. ¡Bienvenido!' };
  },
  login(username, password) {
    const cleanUsername = username.trim();
    const user = this.getUsers().find((storedUser) => storedUser.username === cleanUsername && storedUser.password === password);

    if (!user) {
      return { ok: false, message: 'Usuario o contraseña incorrectos.' };
    }

    localStorage.setItem(STORAGE_KEYS.session, user.username);
    return { ok: true, message: 'Inicio de sesión correcto.' };
  },
  logout() {
    localStorage.removeItem(STORAGE_KEYS.session);
    currentFilter = 'all';
    UI.renderLogin();
  },
  getCurrentUser() {
    return localStorage.getItem(STORAGE_KEYS.session);
  }
};

/* =========================================================
   Módulo Notes: crear, eliminar y consultar por usuario
========================================================= */
const Notes = {
  getAllNotes() {
    return readStorage(STORAGE_KEYS.notes, []);
  },
  createNote({ titulo, descripcion, importante }) {
    const autor = Auth.getCurrentUser();
    if (!autor) return;

    const notes = this.getAllNotes();
    const note = {
      id: `${Date.now()}-${globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(16).slice(2)}`,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      importante: Boolean(importante),
      autor,
      fechaCreacion: Date.now()
    };

    notes.push(note);
    writeStorage(STORAGE_KEYS.notes, notes);
    return note;
  },
  deleteNote(id) {
    const currentUser = Auth.getCurrentUser();
    const nextNotes = this.getAllNotes().filter((note) => !(note.id === id && note.autor === currentUser));
    writeStorage(STORAGE_KEYS.notes, nextNotes);
  },
  getNotesByUser(username = Auth.getCurrentUser()) {
    return this.getAllNotes()
      .filter((note) => note.autor === username)
      .sort((a, b) => b.fechaCreacion - a.fechaCreacion);
  }
};

/* =========================================================
   Módulo UI: pantallas, render de notas y modal
========================================================= */
const UI = {
  renderLogin(message = '') {
    $app.innerHTML = `
          <main class="auth-screen">
            <section class="auth-card">
              <div class="text-center mb-4">
                <div class="brand-title">Post-it Notes</div>
                <p class="text-white-50 mb-0">Tu dashboard privado de notas rápidas.</p>
              </div>

              <ul class="nav nav-pills nav-fill gap-2 mb-4" id="authTabs" role="tablist">
                <li class="nav-item" role="presentation">
                  <button class="nav-link active" id="login-tab" data-bs-toggle="pill" data-bs-target="#login-pane" type="button" role="tab">Login</button>
                </li>
                <li class="nav-item" role="presentation">
                  <button class="nav-link" id="register-tab" data-bs-toggle="pill" data-bs-target="#register-pane" type="button" role="tab">Registro</button>
                </li>
              </ul>

              <div class="alert-app mb-3" id="authMessage">${message ? `<div class="alert alert-info py-2 mb-0">${escapeHTML(message)}</div>` : ''}</div>

              <div class="tab-content">
                <div class="tab-pane fade show active" id="login-pane" role="tabpanel" aria-labelledby="login-tab" tabindex="0">
                  <form id="loginForm" autocomplete="on">
                    <div class="mb-3">
                      <label class="form-label" for="loginUsername">Usuario</label>
                      <input class="form-control" id="loginUsername" type="text" placeholder="Tu usuario" required>
                    </div>
                    <div class="mb-4">
                      <label class="form-label" for="loginPassword">Contraseña</label>
                      <input class="form-control" id="loginPassword" type="password" placeholder="Tu contraseña" required>
                    </div>
                    <button class="btn btn-gradient w-100 py-2 fw-bold" type="submit">Entrar</button>
                  </form>
                </div>

                <div class="tab-pane fade" id="register-pane" role="tabpanel" aria-labelledby="register-tab" tabindex="0">
                  <form id="registerForm" autocomplete="on">
                    <div class="mb-3">
                      <label class="form-label" for="registerUsername">Nombre de usuario</label>
                      <input class="form-control" id="registerUsername" type="text" minlength="3" maxlength="28" placeholder="Elige un usuario" required>
                    </div>
                    <div class="mb-3">
                      <label class="form-label" for="registerPassword">Contraseña</label>
                      <input class="form-control" id="registerPassword" type="password" minlength="4" placeholder="Mínimo 4 caracteres" autocomplete="new-password" required>
                    </div>
                    <div class="mb-4">
                      <label class="form-label" for="registerConfirmPassword">Confirmar contraseña</label>
                      <input class="form-control" id="registerConfirmPassword" type="password" minlength="4" placeholder="Repite tu contraseña" autocomplete="new-password" required>
                    </div>
                    <button class="btn btn-gradient w-100 py-2 fw-bold" type="submit">Crear cuenta</button>
                  </form>
                </div>
              </div>
            </section>
          </main>
        `;

    document.getElementById('loginForm').addEventListener('submit', this.handleLogin);
    document.getElementById('registerForm').addEventListener('submit', this.handleRegister);
  },
  renderApp() {
    const currentUser = Auth.getCurrentUser();
    if (!currentUser) {
      this.renderLogin();
      return;
    }

    $app.innerHTML = `
    <header class="dashboard-header">
      <div class="container py-3">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h1 class="brand-title fs-1 mb-0">Post-it Notes</h1>
            <p class="mb-0 text-white-50">Notas privadas guardadas en este navegador.</p>
          </div>
          <div class="d-flex align-items-center gap-2 dashboard-actions">
            <span class="header-user px-3 py-2 small">👤 <strong>${escapeHTML(currentUser)}</strong></span>
            <button class="btn btn-outline-light" id="logoutButton" type="button">Cerrar sesión</button>
          </div>
        </div>
      </div>
    </header>

    <main class="container py-4 py-lg-5">
      <section class="toolbar p-3 p-md-4 mb-4">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h2 class="h4 mb-1">Mis notas</h2>
            <p class="text-white-50 mb-0">Crea, marca como importante y filtra tus Post-it.</p>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <div class="btn-group" role="group" aria-label="Filtro de notas">
              <button class="btn ${currentFilter === 'all' ? 'btn-light' : 'btn-outline-light'}" data-filter="all" type="button">Todas</button>
              <button class="btn ${currentFilter === 'important' ? 'btn-light' : 'btn-outline-light'}" data-filter="important" type="button">Importantes</button>
            </div>
            <button class="btn btn-gradient" id="newNoteButton" type="button">+ Crear nota</button>
          </div>
        </div>
      </section>
      <section id="notesContainer" aria-live="polite"></section>
    </main>
    `;

    document.getElementById('logoutButton').addEventListener('click', Auth.logout);
    document.getElementById('newNoteButton').addEventListener('click', () => this.showModal());
    document.querySelectorAll('[data-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        currentFilter = button.dataset.filter;
        this.renderApp();
      });
    });
    this.renderNotes();
  },
  renderNotes() {
    const notesContainer = document.getElementById('notesContainer');
    const userNotes = Notes.getNotesByUser();
    const visibleNotes = currentFilter === 'important' ? userNotes.filter((note) => note.importante) : userNotes;

    if (!visibleNotes.length) {
      notesContainer.innerHTML = `
            <div class="empty-state text-center p-5">
              <div class="display-5 mb-3">${currentFilter === 'important' ? '🚨' : '📝'}</div>
              <h3 class="h4">${currentFilter === 'important' ? 'No hay notas importantes' : 'Aún no tienes notas'}</h3>
              <p class="text-white-50 mb-3">${currentFilter === 'important' ? 'Marca una nota como importante para verla aquí.' : 'Crea tu primer Post-it y aparecerá en este tablero.'}</p>
              <button class="btn btn-gradient" id="emptyCreateNoteButton" type="button">Crear nota</button>
            </div>
          `;
      document.getElementById('emptyCreateNoteButton').addEventListener('click', () => this.showModal());
      return;
    }

    notesContainer.innerHTML = `
    <div class="notes-grid">
      ${visibleNotes.map((note) => `
              <article class="postit-card ${note.importante ? 'important' : 'normal'}" style="--rotation: ${getRotation(note.id)}deg;">
                <button class="delete-note" type="button" aria-label="Eliminar nota ${escapeHTML(note.titulo)}" data-delete-id="${escapeHTML(note.id)}">✕</button>
                <h3 class="postit-title">${escapeHTML(note.titulo)}</h3>
                <p class="postit-description mb-0">${escapeHTML(note.descripcion)}</p>
                <footer class="postit-meta">
                  <span>@${escapeHTML(note.autor)}</span>
                  <time datetime="${new Date(note.fechaCreacion).toISOString()}">${formatDate(note.fechaCreacion)}</time>
                </footer>
              </article>
            `).join('')}
    </div>
    `;

    notesContainer.querySelectorAll('[data-delete-id]').forEach((button) => {
      button.addEventListener('click', () => {
        Notes.deleteNote(button.dataset.deleteId);
        this.renderNotes();
      });
    });
  },
  showModal() {
    noteForm.reset();
    this.updatePreview();
    noteModal.show();
    setTimeout(() => document.getElementById('noteTitle').focus(), 150);
  },
  updatePreview() {
    const isImportant = noteImportantInput.checked;
    notePreview.className = `preview-note ${isImportant ? 'important' : 'normal'} p-3`;
    notePreview.innerHTML = `<strong>Preview:</strong> esta nota se verá ${isImportant ? 'roja y destacada' : 'amarilla tipo Post-it clásico'}.`;
  },
  handleLogin(event) {
    event.preventDefault();
    const result = Auth.login(
      document.getElementById('loginUsername').value,
      document.getElementById('loginPassword').value
    );

    if (result.ok) UI.renderApp();
    else UI.showAuthMessage(result.message, 'danger');
  },
  handleRegister(event) {
    event.preventDefault();
    const result = Auth.register(
      document.getElementById('registerUsername').value,
      document.getElementById('registerPassword').value,
      document.getElementById('registerConfirmPassword').value
    );

    if (result.ok) UI.renderApp();
    else UI.showAuthMessage(result.message, 'warning');
  },
  showAuthMessage(message, type = 'info') {
    document.getElementById('authMessage').innerHTML = `<div class="alert alert-${type} py-2 mb-0">${escapeHTML(message)}</div>`;
  }
};

/* =========================================================
   Inicialización y eventos globales
========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  noteModal = new bootstrap.Modal(noteModalElement);
  noteImportantInput.addEventListener('change', () => UI.updatePreview());
  noteForm.addEventListener('submit', (event) => {
    event.preventDefault();
    Notes.createNote({
      titulo: document.getElementById('noteTitle').value,
      descripcion: document.getElementById('noteDescription').value,
      importante: noteImportantInput.checked
    });
    noteModal.hide();
    UI.renderApp();
  });

  if (Auth.getCurrentUser()) UI.renderApp();
  else UI.renderLogin();
});