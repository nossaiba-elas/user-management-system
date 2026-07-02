let users = [];
let editingUserId = null;
let searchTerm = '';
const defaultPhotoUrl = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%239f7aea'/%3E%3Ccircle cx='60' cy='40' r='28' fill='%23ffffff'/%3E%3Crect x='25' y='75' width='70' height='18' rx='9' fill='%23ffffff'/%3E%3Ctext x='60' y='112' font-size='14' text-anchor='middle' fill='%239f7aea' font-family='Inter,sans-serif'%3EPHOTO%3C/text%3E%3C/svg%3E";
const editPhotos = {};
const editPhotoNames = {};

const userForm = document.getElementById('user-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const photoInput = document.getElementById('photo');
const photoButton = document.getElementById('photo-button');
const photoFilename = document.getElementById('photo-filename');
const descriptionInput = document.getElementById('description');

const searchInput = document.getElementById('search-input');
const userList = document.getElementById('user-list');
const loading = document.getElementById('loading');
const emptyState = document.getElementById('empty-state');
const emptyText = document.getElementById('empty-text');
const userCount = document.getElementById('user-count');
const searchStats = document.getElementById('search-stats');
const toggleFormBtn = document.getElementById('toggle-form');
const toggleText = document.querySelector('.toggle-text');
const messageContainer = document.getElementById('message-container');

document.addEventListener('DOMContentLoaded', () => {
    fetchUsers();
    setupEventListeners();
});

function setupEventListeners() {
    userForm.addEventListener('submit', handleAddUser);
    searchInput.addEventListener('input', handleSearch);
    toggleFormBtn.addEventListener('click', toggleForm);
    photoButton.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', updatePhotoFilename);
}

function updatePhotoFilename() {
    const file = photoInput.files[0];
    photoFilename.textContent = file ? file.name : 'Aucune photo sélectionnée';
}

function toggleForm() {
    const form = document.querySelector('.user-form');
    const isVisible = form.classList.contains('show');

    if (isVisible) {
        form.classList.remove('show');
        toggleText.textContent = 'Afficher';
    } else {
        form.classList.add('show');
        toggleText.textContent = 'Masquer';
    }
}

function handleSearch(event) {
    searchTerm = event.target.value.toLowerCase();
    renderUsers();
}

async function fetchUsers() {
    showLoading();

    try {
        const response = await fetch('http://127.0.0.1:8000/users');
        users = await response.json();
        renderUsers();
    } catch (error) {
        console.error(error);
        showMessage('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
        hideLoading();
    }
}

function showLoading() {
    loading.style.display = 'block';
    userList.style.display = 'none';
    emptyState.style.display = 'none';
}

function hideLoading() {
    loading.style.display = 'none';
}

async function handleAddUser(event) {
    event.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const description = descriptionInput.value.trim();
    const photoFile = photoInput.files[0];

    if (!name || !email) {
        showMessage('Veuillez remplir le nom et l’email', 'error');
        return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("description", description);

    if (photoFile) {
        formData.append("photo", photoFile);
    }

    try {
        showLoading();
        const response = await fetch('http://127.0.0.1:8000/users', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            nameInput.value = '';
            emailInput.value = '';
            photoInput.value = '';
            photoFilename.textContent = 'Aucune photo sélectionnée';
            descriptionInput.value = '';

            await fetchUsers();
            showMessage('Utilisateur ajouté avec succès !', 'success');
            toggleForm();
        } else {
            throw new Error('Erreur lors de l’ajout');
        }
    } catch (error) {
        console.error(error);
        showMessage('Erreur lors de l’ajout', 'error');
    } finally {
        hideLoading();
    }
}
async function deleteUser(userId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
        showLoading();
        const response = await fetch(`http://127.0.0.1:8000/users/${userId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await fetchUsers();
            showMessage('Utilisateur supprimé avec succès !', 'success');
        }
    } catch (error) {
        console.error(error);
        showMessage('Erreur lors de la suppression', 'error');
    } finally {
        hideLoading();
    }
}

function startEdit(userId) {
    editingUserId = userId;
    renderUsers();
}

function cancelEdit() {
    editingUserId = null;
    renderUsers();
}

async function saveEdit(userId) {
    const name = document.getElementById(`edit-name-${userId}`).value.trim();
    const email = document.getElementById(`edit-email-${userId}`).value.trim();
    const description = document.getElementById(`edit-description-${userId}`).value.trim();
    const selectedPhoto = editPhotos[userId] || null;

    if (!name || !email) {
        showMessage('Veuillez remplir le nom et l’email', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('description', description);

    if (selectedPhoto) {
        formData.append('photo', selectedPhoto);
    }

    try {
        const response = await fetch(`http://127.0.0.1:8000/users/${userId}`, {
            method: 'PUT',
            body: formData
        });

        if (response.ok) {
            editingUserId = null;
            delete editPhotos[userId];
            delete editPhotoNames[userId];
            await fetchUsers();
            showMessage('Utilisateur modifié avec succès !', 'success');
        }
    } catch (error) {
        console.error(error);
        showMessage('Erreur lors de la modification', 'error');
    }
}

function renderUsers() {
    const filteredUsers = users.filter(user =>
        (user.name || '').toLowerCase().includes(searchTerm) ||
        (user.email || '').toLowerCase().includes(searchTerm) ||
        (user.description || '').toLowerCase().includes(searchTerm)
    );

    userCount.textContent = filteredUsers.length;

    if (searchTerm) {
        searchStats.textContent = ` (recherche: "${searchTerm}")`;
    } else {
        searchStats.textContent = '';
    }

    if (filteredUsers.length === 0) {
        userList.style.display = 'none';
        emptyState.style.display = 'block';
        emptyText.textContent = searchTerm
            ? `Aucun utilisateur trouvé pour "${searchTerm}".`
            : 'Aucun utilisateur trouvé. Ajoutez-en un ci-dessus !';
        return;
    }

    userList.style.display = 'grid';
    emptyState.style.display = 'none';

    userList.innerHTML = filteredUsers.map(user => `
        <div class="user-card ${editingUserId === user.id ? 'editing' : ''}" data-user-id="${user.id}">
            ${editingUserId === user.id ? `
                <div class="edit-form">
                    <input 
                        type="text" 
                        id="edit-name-${user.id}" 
                        class="edit-input" 
                        value="${user.name || ''}" 
                        placeholder="Nom"
                    />

                    <input 
                        type="email" 
                        id="edit-email-${user.id}" 
                        class="edit-input" 
                        value="${user.email || ''}" 
                        placeholder="Email"
                    />

                    <input 
                        type="text" 
                        id="edit-description-${user.id}" 
                        class="edit-input" 
                        value="${user.description || ''}" 
                        placeholder="Description"
                    />

                    <label class="file-button" for="edit-photo-input-${user.id}">
                        📷 Modifier la photo
                    </label>
                    <input 
                        id="edit-photo-input-${user.id}" 
                        type="file" 
                        accept="image/*" 
                        class="hidden-file-input"
                        onchange="setEditPhoto('${user.id}', this)"
                    />
                    <div class="file-name">${editPhotoNames[user.id] || 'Nouvelle photo optionnelle'}</div>
                </div>

                <div class="button-group">
                    <button class="btn btn-save" onclick="saveEdit('${user.id}')">
                        💾 Sauvegarder
                    </button>
                    <button class="btn btn-cancel" onclick="cancelEdit()">
                        ❌ Annuler
                    </button>
                </div>
            ` : `
                <div class="user-info">
                    <img 
                        src="${user.photo || defaultPhotoUrl}"
                        alt="${user.name}"
                        class="user-photo"
                        onerror="this.src='${defaultPhotoUrl}'"
                    />

                    <div class="user-name">${user.name || ''}</div>
                    <div class="user-email">${user.email || ''}</div>
                    <div class="user-created">Créé le ${formatDate(user.created_at)}</div>

                    ${user.description ? `
                        <div class="user-description">${user.description}</div>
                    ` : ''}
                </div>

                <div class="button-group">
                    <button class="btn btn-edit" onclick="startEdit('${user.id}')">
                        ✏️ Modifier
                    </button>
                    <button class="btn btn-danger" onclick="deleteUser('${user.id}')">
                        🗑️ Supprimer
                    </button>
                </div>
            `}
        </div>
    `).join('');
}

function setEditPhoto(userId, input) {
    const file = input.files[0];
    if (file) {
        editPhotos[userId] = file;
        editPhotoNames[userId] = file.name;
    } else {
        delete editPhotos[userId];
        editPhotoNames[userId] = 'Nouvelle photo optionnelle';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'inconnue';
    return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function showMessage(message, type = 'success') {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;

    messageContainer.appendChild(messageElement);

    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 5000);
}