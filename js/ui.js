import { state } from './store.js';

export function showToast(message) {
    const t = document.getElementById('toast');
    t.innerText = message;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

export function renderCategories() {
    const container = document.getElementById('category-container');
    container.innerHTML = '';
    state.categories.forEach(cat => {
        const btn = document.createElement('button');
        const isActive = cat === state.currentCategory;
        btn.className = `whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600'}`;
        btn.innerText = cat;
        btn.onclick = () => { state.currentCategory = cat; renderCategories(); renderList(); };
        container.appendChild(btn);
    });
}

export function renderList() {
    const listEl = document.getElementById('item-list');
    const emptyEl = document.getElementById('empty-state');
    const searchWords = state.searchQuery.toLowerCase().split(" ").filter(w => w.length > 0);
    
    const filtered = state.visibleItems.filter(item => {
        const itemText = (item.name + " " + (item.category || "") + " " + (item.barcode || "")).toLowerCase();
        return searchWords.every(word => itemText.includes(word)) && 
               (state.currentCategory === 'All' || item.category === state.currentCategory);
    });

    listEl.innerHTML = '';
    if (filtered.length === 0) {
        emptyEl.classList.remove('hidden');
        return;
    }
    emptyEl.classList.add('hidden');

    filtered.forEach(item => {
        const price = parseFloat(item.price || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
        const div = document.createElement('div');
        div.className = "bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center";
        
        div.innerHTML = `
            <div class="flex-1">
                <h3 class="font-bold text-slate-900 dark:text-white text-lg">${item.name}</h3>
                <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-xl font-bold text-indigo-600 dark:text-indigo-400">₦${price}</span>
                    ${item.category ? `<span class="text-[10px] text-slate-400 font-medium uppercase border px-1 rounded">${item.category}</span>` : ''}
                </div>
            </div>
            ${state.isManager ? `
            <div class="flex gap-2">
                <button onclick="window.editItem('${item.id}')" class="p-2 text-slate-400 hover:text-indigo-600"><i data-lucide="edit-2" class="w-5 h-5"></i></button>
                <button onclick="window.deleteItem('${item.id}')" class="p-2 text-slate-400 hover:text-red-500"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
            </div>` : ''}
        `;
        listEl.appendChild(div);
    });
    if(window.lucide) lucide.createIcons();
}

export function updateRoleUI() {
    const roleBadge = document.getElementById('role-badge');
    const authBtn = document.getElementById('auth-btn');
    const fabContainer = document.getElementById('fab-container'); // Targets the wrapper now
    const adminNav = document.getElementById('admin-nav-btn');

    if (state.isSuperAdmin) {
        roleBadge.innerText = "SUPER ADMIN";
        roleBadge.className = "text-[10px] text-amber-500 font-bold uppercase tracking-wide";
        authBtn.innerHTML = '<i data-lucide="unlock" class="w-5 h-5 text-amber-600"></i>';
        fabContainer.classList.remove('hidden');
        adminNav.classList.remove('hidden');
    } else if (state.isManager) {
        roleBadge.innerText = "MANAGER";
        roleBadge.className = "text-[10px] text-indigo-500 font-bold uppercase tracking-wide";
        authBtn.innerHTML = '<i data-lucide="unlock" class="w-5 h-5 text-indigo-600"></i>';
        fabContainer.classList.remove('hidden');
        adminNav.classList.add('hidden'); 
    } else {
        roleBadge.innerText = "PRICE KEEPER";
        roleBadge.className = "text-[10px] text-slate-400 font-mono uppercase tracking-wide";
        authBtn.innerHTML = '<i data-lucide="lock" class="w-5 h-5"></i>';
        fabContainer.classList.add('hidden');
        adminNav.classList.add('hidden');
    }
    if(window.lucide) lucide.createIcons();
}
