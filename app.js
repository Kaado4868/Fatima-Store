import { auth, onAuthStateChanged, signInAnonymously, signOut, signInWithPopup, GoogleAuthProvider, SUPER_ADMIN_EMAIL } from './firebase.js';
import { state, initSync, saveItem, softDeleteItem } from './store.js';
import { renderCategories, renderList, updateRoleUI, showToast } from './ui.js';
import { openScanner, closeScanner } from './scanner.js';
import { openAdminModal, closeAdminModal, switchAdminTab, restoreItem, emptyTrash, applyBulkUpdate, exportData } from './admin.js';

// ---- INITIALIZATION ----
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    
    if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');
    
    const storeName = localStorage.getItem('pk_store_name');
    if (storeName) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        document.getElementById('skeleton-loader').classList.remove('hidden');
        
        initSync(storeName, () => {
            document.getElementById('skeleton-loader').classList.add('hidden');
            renderCategories();
            renderList();
        });
    }

    // Search Listener
    document.getElementById('search-input').addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderList();
    });

    // Login Form Listener
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const inputName = document.getElementById('store-name-input').value.trim().toUpperCase();
        if (inputName.length > 2) {
            localStorage.setItem('pk_store_name', inputName);
            window.location.reload();
        }
    });

    // Item Form Submission
    document.getElementById('item-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('item-id').value;
        const data = {
            barcode: document.getElementById('barcode-input').value.trim(),
            name: document.getElementById('name-input').value.trim(),
            price: parseFloat(document.getElementById('price-input').value),
            bulkPrice: document.getElementById('bulk-input').value.trim(),
            category: document.getElementById('category-input').value.trim()
        };
        await saveItem(id, data);
        window.closeModal('item-modal');
        showToast("Item Saved!");
    });
});

// ---- AUTHENTICATION ----
onAuthStateChanged(auth, (user) => {
    if (user) {
        state.currentUser = user;
        const email = user.email ? user.email.toLowerCase() : "";
        state.isSuperAdmin = (email === SUPER_ADMIN_EMAIL.toLowerCase());
        state.isManager = state.isSuperAdmin; 
    } else {
        state.currentUser = null;
        state.isSuperAdmin = false;
        state.isManager = false;
        if (localStorage.getItem('pk_store_name') && navigator.onLine) signInAnonymously(auth);
    }
    updateRoleUI();
    renderList();
});

// ---- GLOBAL WINDOW FUNCTIONS (Bound to HTML onClick) ----
window.toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
};

window.toggleAuth = () => {
    if (state.currentUser && !state.currentUser.isAnonymous) {
        if(confirm("Log out Admin?")) signOut(auth).then(()=>signInAnonymously(auth));
    } else {
        signInWithPopup(auth, new GoogleAuthProvider()).catch(e => alert(e.message));
    }
};

window.openItemModal = () => {
    document.getElementById('item-form').reset();
    document.getElementById('item-id').value = '';
    document.getElementById('modal-title').innerText = "New Item";
    document.getElementById('item-modal').classList.remove('hidden');
};

window.editItem = (id) => {
    const item = state.visibleItems.find(i => i.id === id);
    if (!item) return;
    document.getElementById('item-id').value = item.id;
    document.getElementById('barcode-input').value = item.barcode || '';
    document.getElementById('name-input').value = item.name;
    document.getElementById('price-input').value = item.price;
    document.getElementById('bulk-input').value = item.bulkPrice || '';
    document.getElementById('category-input').value = item.category || '';
    document.getElementById('modal-title').innerText = "Edit Item";
    document.getElementById('item-modal').classList.remove('hidden');
};

window.deleteItem = async (id) => {
    await softDeleteItem(id);
    showToast("Item moved to trash");
};

window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

window.startScanner = (mode) => {
    openScanner(mode, (text, currentMode) => {
        if (currentMode === 'search') {
            const s = document.getElementById('search-input');
            s.value = text;
            s.dispatchEvent(new Event('input'));
        } else {
            document.getElementById('barcode-input').value = text;
        }
    });
};

window.stopScanner = closeScanner;

// ---- ADMIN FUNCTIONS ----
window.openAdminModal = openAdminModal;
window.closeAdminModal = closeAdminModal;
window.switchAdminTab = switchAdminTab;
window.restoreItem = restoreItem;
window.emptyTrash = emptyTrash;
window.applyBulkUpdate = applyBulkUpdate;
window.exportData = exportData;
