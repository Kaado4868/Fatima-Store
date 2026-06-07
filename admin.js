import { state, getCollectionRef } from './store.js';
import { db, doc, updateDoc, writeBatch, serverTimestamp } from './firebase.js';
import { showToast } from './ui.js';

let catChart = null;

export function openAdminModal() {
    if (!state.isSuperAdmin && !state.isManager) return;
    document.getElementById('admin-modal').classList.remove('hidden');
    switchAdminTab('stats');
}

export function closeAdminModal() {
    document.getElementById('admin-modal').classList.add('hidden');
}

export function switchAdminTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active', 'text-indigo-600', 'border-b-2', 'border-indigo-600');
        b.classList.add('text-slate-500');
    });
    
    const btn = document.getElementById(`tab-${tab}`);
    btn.classList.remove('text-slate-500');
    btn.classList.add('active', 'text-indigo-600', 'border-b-2', 'border-indigo-600');
    
    ['stats', 'trash', 'tools'].forEach(t => document.getElementById(`view-${t}`).classList.add('hidden'));
    document.getElementById(`view-${tab}`).classList.remove('hidden');

    if (tab === 'stats') renderStats();
    if (tab === 'trash') renderTrash();
}

function renderStats() {
    document.getElementById('stat-active-count').innerText = state.visibleItems.length;
    document.getElementById('stat-total-db').innerText = state.allItems.length;

    if (catChart) catChart.destroy();
    const catCounts = {};
    state.visibleItems.forEach(i => { 
        const c = i.category || 'Uncategorized'; 
        catCounts[c] = (catCounts[c] || 0) + 1; 
    });
    
    const ctx = document.getElementById('catChart');
    catChart = new window.Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(catCounts),
            datasets: [{ 
                data: Object.values(catCounts), 
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], 
                borderWidth: 0 
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderTrash() {
    const list = document.getElementById('trash-list');
    const deletedItems = state.allItems.filter(i => i.isDeleted);
    
    list.innerHTML = '';
    if (deletedItems.length === 0) {
        list.innerHTML = '<div class="text-center text-slate-400 py-10 text-sm">Recycle bin is empty</div>';
        return;
    }

    deletedItems.forEach(item => {
        const div = document.createElement('div');
        div.className = "bg-white dark:bg-slate-800 p-3 rounded-lg border border-rose-100 flex justify-between items-center shadow-sm";
        div.innerHTML = `
            <div class="font-bold text-slate-800 dark:text-white">${item.name}</div>
            <button onclick="window.restoreItem('${item.id}')" class="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold">Restore</button>
        `;
        list.appendChild(div);
    });
}

export async function restoreItem(id) {
    if (!state.isManager) return;
    await updateDoc(doc(getCollectionRef(), id), { isDeleted: false, updatedAt: serverTimestamp() });
    showToast("Item Restored!");
    renderTrash();
}

export async function emptyTrash() {
    if (!state.isSuperAdmin) return alert("Only Super Admins can empty trash.");
    if (!confirm("PERMANENTLY delete trash?")) return;
    
    const deletedItems = state.allItems.filter(i => i.isDeleted);
    const batch = writeBatch(db);
    deletedItems.forEach(i => batch.delete(doc(getCollectionRef(), i.id)));
    
    await batch.commit();
    showToast("Trash Emptied");
    renderTrash();
}

export async function applyBulkUpdate(type) {
    if (!state.isManager) return alert("Access Denied");
    
    const val = parseFloat(document.getElementById('inflation-input').value);
    if (isNaN(val) || val === 0) return alert("Enter a valid percentage");
    if (!confirm(`Apply ${type === 'increase' ? 'Inflation' : 'Discount'} of ${val}% to ALL items?`)) return;

    try {
        const batch = writeBatch(db);
        state.visibleItems.slice(0, 490).forEach(item => {
            let oldPrice = parseFloat(item.price) || 0;
            let newPrice = type === 'increase' 
                ? Math.ceil(oldPrice * (1 + (val / 100))) 
                : Math.floor(oldPrice * (1 - (val / 100)));
            batch.update(doc(getCollectionRef(), item.id), { price: newPrice, updatedAt: serverTimestamp() });
        });
        
        await batch.commit();
        showToast("Bulk Update Successful!");
        document.getElementById('inflation-input').value = '';
    } catch(e) {
        alert("Bulk Update Failed: " + e.message);
    }
}

export function exportData() {
    const headers = "Name,Barcode,Price,Category,Bulk Deal\n";
    const rows = state.visibleItems.map(i => `"${i.name}","${i.barcode||''}","${i.price}","${i.category||''}","${i.bulkPrice||''}"`).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `inventory_${state.storeName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
