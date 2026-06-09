import { auth, onAuthStateChanged, signInAnonymously, signOut, signInWithPopup, GoogleAuthProvider, SUPER_ADMIN_EMAIL } from './firebase.js';
import { state, initSync, saveItem, softDeleteItem } from './store.js';
import { renderCategories, renderList, updateRoleUI, showToast } from './ui.js';
import { openScanner, closeScanner } from './scanner.js';
import { openAdminModal, closeAdminModal, switchAdminTab, restoreItem, emptyTrash, applyBulkUpdate, exportData } from './admin.js';

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');
    
    const storeName = localStorage.getItem('pk_store_name');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');

    if (storeName) {
        loginScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        
        // THE FIX: Explicitly hide the loading screen!
        if (loadingOverlay) loadingOverlay.classList.add('hidden'); 
        
        document.getElementById('skeleton-loader').classList.remove('hidden');
        
        initSync(storeName, () => {
            document.getElementById('skeleton-loader').classList.add('hidden');
            renderCategories();
            renderList();
        });
    } else {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        appScreen.classList.add('hidden');
    }

    document.getElementById('search-input').addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderList();
    });

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const inputName = document.getElementById('store-name-input').value.trim().toUpperCase();
        if (inputName.length > 2) {
            localStorage.setItem('pk_store_name', inputName);
            window.location.reload();
        }
    });

    document.getElementById('item-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('item-id').value;
        const rawStock = document.getElementById('stock-input').value;
        const data = {
            barcode: document.getElementById('barcode-input').value.trim(),
            name: document.getElementById('name-input').value.trim(),
            price: parseFloat(document.getElementById('price-input').value),
            bulkPrice: document.getElementById('bulk-input').value.trim(),
            stock: rawStock === '' ? null : parseInt(rawStock),
            category: document.getElementById('category-input').value.trim()
        };
        await saveItem(id, data);
        window.closeModal('item-modal');
        showToast("Item Saved!");
    });
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        state.currentUser = user;
        const email = user.email ? user.email.toLowerCase() : "";
        state.isSuperAdmin = (email === SUPER_ADMIN_EMAIL.toLowerCase());
        
        setTimeout(() => {
            updateRoleUI();
            renderList();
        }, 500); 
    } else {
        state.currentUser = null;
        state.isSuperAdmin = false;
        state.isManager = false;
        if (localStorage.getItem('pk_store_name') && navigator.onLine) signInAnonymously(auth);
        updateRoleUI();
        renderList();
    }
});

// ----- ALL WINDOW FUNCTIONS RESTORED -----

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

window.logout = () => {
    if (confirm("Exit?")) {
        localStorage.removeItem('pk_store_name');
        window.location.reload();
    }
};

window.openSuperAdmin = () => {
    if (state.isSuperAdmin) {
        openAdminModal();
        switchAdminTab('stats');
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
    document.getElementById('stock-input').value = item.stock !== undefined && item.stock !== null ? item.stock : '';
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
window.openAdminModal = openAdminModal;
window.closeAdminModal = closeAdminModal;
window.switchAdminTab = switchAdminTab;
window.restoreItem = restoreItem;
window.emptyTrash = emptyTrash;
window.applyBulkUpdate = applyBulkUpdate;
window.exportData = exportData;
