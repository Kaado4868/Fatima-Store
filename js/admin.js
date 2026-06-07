import { state, getCollectionRef, getLogCollectionRef, logAction } from './store.js';
import { db, doc, updateDoc, setDoc, writeBatch, serverTimestamp } from './firebase.js';
import { showToast } from './ui.js';
import { getDocs, query, orderBy, limit, deleteDoc, getDoc } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

let catChart = null;
let priceChart = null;

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
    
    ['stats', 'team', 'logs', 'trash', 'tools'].forEach(t => document.getElementById(`view-${t}`).classList.add('hidden'));
    document.getElementById(`view-${tab}`).classList.remove('hidden');

    if (tab === 'stats') renderStats();
    if (tab === 'team') renderStaffList();
    if (tab === 'logs') loadLogs();
    if (tab === 'trash') renderTrash();
}

// ---- RESTORED CHARTS ----
function renderStats() {
    document.getElementById('stat-active-count').innerText = state.visibleItems.length;
    document.getElementById('stat-total-db').innerText = state.allItems.length;

    if (catChart) catChart.destroy();
    if (priceChart) priceChart.destroy();

    const catCounts = {};
    const ranges = { '0-500': 0, '500-1k': 0, '1k-5k': 0, '5k+': 0 };

    state.visibleItems.forEach(i => { 
        const c = i.category || 'Uncategorized'; 
        catCounts[c] = (catCounts[c] || 0) + 1; 

        let p = parseFloat(i.price) || 0;
        if (p < 500) ranges['0-500']++;
        else if (p < 1000) ranges['500-1k']++;
        else if (p < 5000) ranges['1k-5k']++;
        else ranges['5k+']++;
    });
    
    const ctx1 = document.getElementById('catChart');
    catChart = new window.Chart(ctx1, { type: 'doughnut', data: { labels: Object.keys(catCounts), datasets: [{ data: Object.values(catCounts), backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false } });

    const ctx2 = document.getElementById('priceChart');
    priceChart = new window.Chart(ctx2, { type: 'bar', data: { labels: Object.keys(ranges), datasets: [{ label: 'Items', data: Object.values(ranges), backgroundColor: '#6366f1', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false } });
}

// ---- RESTORED TEAM MANAGEMENT ----
window.addStaff = async () => {
    if (!state.isSuperAdmin) return alert("Only Super Admins can add staff.");
    const email = document.getElementById('new-staff-email').value.trim().toLowerCase();
    if (!email) return;

    state.staffMap[email] = 'manager';
    await setDoc(doc(getCollectionRef(), '_config'), { staff: state.staffMap }, { merge: true });
    document.getElementById('new-staff-email').value = '';
    showToast("Manager Added");
    renderStaffList();
}

window.removeStaff = async (email) => {
    if (!state.isSuperAdmin || !confirm(`Remove ${email}?`)) return;
    delete state.staffMap[email];
    await setDoc(doc(getCollectionRef(), '_config'), { staff: state.staffMap }, { merge: true });
    showToast("Manager Removed");
    renderStaffList();
}

function renderStaffList() {
    const list = document.getElementById('staff-list');
    list.innerHTML = '';
    if (Object.keys(state.staffMap).length === 0) { list.innerHTML = '<div class="text-slate-400 text-sm">No extra managers added.</div>'; return; }
    
    Object.entries(state.staffMap).forEach(([email, role]) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-white dark:bg-slate-700 p-3 rounded-lg border dark:border-slate-600";
        div.innerHTML = `<div><div class="font-bold text-sm">${email}</div><div class="text-xs text-indigo-500 uppercase font-bold">${role}</div></div><button onclick="window.removeStaff('${email}')" class="text-rose-500 p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
        list.appendChild(div);
    });
    if(window.lucide) lucide.createIcons();
}

// ---- RESTORED AUDIT LOGS ----
async function loadLogs() {
    const list = document.getElementById('logs-list');
    list.innerHTML = '<div class="text-center py-4 text-slate-500">Loading history...</div>';
    try {
        const snap = await getDocs(query(getLogCollectionRef(), orderBy('timestamp', 'desc'), limit(50)));
        list.innerHTML = '';
        if (snap.empty) { list.innerHTML = '<div class="text-slate-400 text-sm">No logs found</div>'; return; }
        
        snap.forEach(document => { 
            const d = document.data(); 
            const date = d.timestamp ? d.timestamp.toDate().toLocaleString() : 'Just now'; 
            let revertBtn = '';
            
            const canUndo = (d.action === 'Bulk Update' && d.meta?.backupData) || (['Edit', 'Soft Delete', 'Restore'].includes(d.action) && d.meta?.previousData) || (d.action === 'Create' && d.meta?.itemId);

            if (canUndo && !d.reverted) {
                revertBtn = `<button onclick="window.revertAction('${document.id}')" class="text-xs font-bold text-indigo-500 ml-2">Undo</button>`;
            }
            
            const div = document.createElement('div'); 
            div.className = "bg-white dark:bg-slate-800 p-3 rounded-lg border dark:border-slate-700 shadow-sm"; 
            div.innerHTML = `<div class="flex justify-between font-bold text-sm"><span>${d.action}</span><span class="text-[10px] text-slate-400 font-normal">${date}</span></div><div class="text-xs text-slate-600 dark:text-slate-400 mt-1">${d.details}</div><div class="flex justify-between items-end mt-1"><span class="text-[10px] text-indigo-500">${d.user}</span>${revertBtn}</div>`; 
            list.appendChild(div); 
        });
    } catch(e) { list.innerHTML = `<div class="text-red-500 text-sm">Error reading logs. Check rules.</div>`; }
}

window.revertAction = async (logId) => {
    if (!confirm("Undo this action?")) return;
    try {
        const logSnap = await getDoc(doc(getLogCollectionRef(), logId));
        const logData = logSnap.data();
        const meta = logData.meta || {};

        if (logData.action === 'Bulk Update' && meta.backupData) {
            const batch = writeBatch(db);
            meta.backupData.forEach(item => batch.update(doc(getCollectionRef(), item.id), { price: item.oldPrice, updatedAt: serverTimestamp() }));
            await batch.commit();
        } else {
            const itemRef = doc(getCollectionRef(), meta.itemId);
            if (logData.action === 'Edit') await updateDoc(itemRef, meta.previousData);
            else if (logData.action === 'Soft Delete') await updateDoc(itemRef, { isDeleted: false });
            else if (logData.action === 'Restore') await updateDoc(itemRef, { isDeleted: true });
            else if (logData.action === 'Create') await deleteDoc(itemRef);
        }
        await updateDoc(doc(getLogCollectionRef(), logId), { reverted: true });
        showToast("Action undone."); loadLogs(); 
    } catch(e) { alert("Revert failed: " + e.message); }
};


// ---- TRASH & TOOLS ----
function renderTrash() {
    const list = document.getElementById('trash-list');
    const deletedItems = state.allItems.filter(i => i.isDeleted);
    list.innerHTML = '';
    if (deletedItems.length === 0) { list.innerHTML = '<div class="text-center text-slate-400 py-10 text-sm">Recycle bin is empty</div>'; return; }

    deletedItems.forEach(item => {
        const div = document.createElement('div');
        div.className = "bg-white dark:bg-slate-800 p-3 rounded-lg border border-rose-100 flex justify-between items-center shadow-sm";
        div.innerHTML = `<div class="font-bold text-slate-800 dark:text-white">${item.name}</div><button onclick="window.restoreItem('${item.id}')" class="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold">Restore</button>`;
        list.appendChild(div);
    });
}

export async function restoreItem(id) {
    if (!state.isManager) return;
    const item = state.allItems.find(i => i.id === id);
    await updateDoc(doc(getCollectionRef(), id), { isDeleted: false, updatedAt: serverTimestamp() });
    logAction("Restore", `Restored '${item.name}'`, { itemId: id, previousData: { isDeleted: true } });
    showToast("Item Restored!"); renderTrash();
}

export async function emptyTrash() {
    if (!state.isSuperAdmin) return alert("Only Super Admins can empty trash.");
    if (!confirm("PERMANENTLY delete trash?")) return;
    const batch = writeBatch(db);
    state.allItems.filter(i => i.isDeleted).forEach(i => batch.delete(doc(getCollectionRef(), i.id)));
    await batch.commit();
    showToast("Trash Emptied"); renderTrash();
}

export async function applyBulkUpdate(type) {
    if (!state.isManager) return alert("Access Denied");
    const val = parseFloat(document.getElementById('inflation-input').value);
    if (isNaN(val) || val === 0) return alert("Enter a valid percentage");
    if (!confirm(`Apply ${type === 'increase' ? 'Inflation' : 'Discount'} of ${val}% to ALL items?`)) return;

    try {
        const batch = writeBatch(db);
        const backupData = [];
        state.visibleItems.slice(0, 490).forEach(item => {
            let oldPrice = parseFloat(item.price) || 0;
            let newPrice = type === 'increase' ? Math.ceil(oldPrice * (1 + (val / 100))) : Math.floor(oldPrice * (1 - (val / 100)));
            backupData.push({ id: item.id, oldPrice: oldPrice });
            batch.update(doc(getCollectionRef(), item.id), { price: newPrice, updatedAt: serverTimestamp() });
        });
        
        await batch.commit();
        logAction("Bulk Update", `${type === 'increase' ? '+' : '-'}${val}% on All Items`, { backupData: backupData });
        showToast("Bulk Update Successful!"); document.getElementById('inflation-input').value = '';
    } catch(e) { alert("Failed: " + e.message); }
}

export function exportData() {
    const rows = state.visibleItems.map(i => `"${i.name}","${i.barcode||''}","${i.price}","${i.category||''}","${i.bulkPrice||''}"`).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8,Name,Barcode,Price,Category,Bulk Deal\n" + rows));
    link.setAttribute("download", `inventory_${state.storeName}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

export function copyRules() {
    const rules = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} { allow read, write: if request.auth != null; }\n  }\n}`;
    navigator.clipboard.writeText(rules).then(() => alert("Rules copied!"));
}

// Window attachments for Admin specific modal actions
window.addStaff = addStaff;
window.removeStaff = removeStaff;
window.revertAction = revertAction;
window.copyRules = copyRules;
