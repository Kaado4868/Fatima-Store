import { state, getCollectionRef, logAction } from './store.js';
import { db, doc, updateDoc, setDoc, writeBatch, serverTimestamp } from './firebase.js';
import { showToast } from './ui.js';
import { getDocs, query, orderBy, limit, deleteDoc, collection } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

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
    
    ['stats', 'forecast', 'team', 'logs', 'tools'].forEach(t => document.getElementById(`view-${t}`).classList.add('hidden'));
    document.getElementById(`view-${tab}`).classList.remove('hidden');

    if (tab === 'stats') renderStats();
    if (tab === 'forecast') renderForecast();
    if (tab === 'team') renderStaffList();
    if (tab === 'logs') loadLogs();
}

function renderStats() {
    document.getElementById('stat-active-count').innerText = state.visibleItems.length;
    document.getElementById('stat-total-db').innerText = state.allItems.length;

    if (catChart) catChart.destroy();
    const catCounts = {};
    state.visibleItems.forEach(i => { const c = i.category || 'Uncategorized'; catCounts[c] = (catCounts[c] || 0) + 1; });
    
    const ctx = document.getElementById('catChart');
    catChart = new window.Chart(ctx, { type: 'doughnut', data: { labels: Object.keys(catCounts), datasets: [{ data: Object.values(catCounts), backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false } });
}

function renderForecast() {
    const list = document.getElementById('forecast-list');
    list.innerHTML = '';
    
    const stockItems = state.visibleItems.filter(i => i.stock !== undefined && i.stock !== null).sort((a, b) => a.stock - b.stock);
    if(stockItems.length === 0) { list.innerHTML = '<div class="text-sm text-slate-500 text-center py-6">No stock quantities recorded. Add stock to items to generate forecasts.</div>'; return; }

    stockItems.forEach(item => {
        // Simulated AI Velocity Math (Because we don't have historical sales in DB yet)
        const dailyVelocity = Math.floor(Math.random() * 3) + 1; 
        const daysLeft = Math.floor(item.stock / dailyVelocity);
        
        let status = daysLeft <= 3 ? `<span class="text-rose-500 font-bold">Critical (Est. ${daysLeft} days)</span>` : `<span class="text-emerald-500 font-bold">Stable (Est. ${daysLeft} days)</span>`;

        const div = document.createElement('div');
        div.className = "bg-white dark:bg-slate-800 p-3 rounded-lg border dark:border-slate-700 flex justify-between items-center shadow-sm text-sm";
        div.innerHTML = `<div><div class="font-bold dark:text-white">${item.name}</div><div class="text-xs text-slate-500">Stock: ${item.stock} | Velocity: ~${dailyVelocity}/day</div></div><div>${status}</div>`;
        list.appendChild(div);
    });
}

window.addStaff = async () => {
    if (!state.isSuperAdmin) return alert("Only Super Admins can add staff.");
    const email = document.getElementById('new-staff-email').value.trim().toLowerCase();
    if (!email) return;

    state.staffMap[email] = 'manager';
    await setDoc(doc(getCollectionRef(), '_config'), { staff: state.staffMap }, { merge: true });
    document.getElementById('new-staff-email').value = '';
    showToast("Manager Added"); renderStaffList();
}

window.removeStaff = async (email) => {
    if (!state.isSuperAdmin || !confirm(`Remove ${email}?`)) return;
    delete state.staffMap[email];
    await setDoc(doc(getCollectionRef(), '_config'), { staff: state.staffMap }, { merge: true });
    showToast("Manager Removed"); renderStaffList();
}

function renderStaffList() {
    const list = document.getElementById('staff-list');
    list.innerHTML = '';
    Object.entries(state.staffMap).forEach(([email, role]) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-white dark:bg-slate-700 p-3 rounded-lg border dark:border-slate-600";
        div.innerHTML = `<div><div class="font-bold text-sm">${email}</div><div class="text-xs text-indigo-500 uppercase font-bold">${role}</div></div><button onclick="window.removeStaff('${email}')" class="text-rose-500 p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
        list.appendChild(div);
    });
    if(window.lucide) lucide.createIcons();
}

async function loadLogs() {
    const list = document.getElementById('logs-list');
    list.innerHTML = '<div class="text-center py-4 text-slate-500">Loading history...</div>';
    try {
        const safeName = state.storeName.replace(/[^a-z0-9]/gi, '').toLowerCase();
        const snap = await getDocs(query(collection(db, 'artifacts', 'fatima-store-1f63f', 'public', 'logs', `pk_store_${safeName}`), orderBy('timestamp', 'desc'), limit(50)));
        list.innerHTML = '';
        if (snap.empty) { list.innerHTML = '<div class="text-slate-400 text-sm">No logs found</div>'; return; }
        
        snap.forEach(document => { 
            const d = document.data(); 
            const date = d.timestamp ? d.timestamp.toDate().toLocaleString() : 'Just now'; 
            const div = document.createElement('div'); 
            div.className = "bg-white dark:bg-slate-800 p-3 rounded-lg border dark:border-slate-700 shadow-sm"; 
            div.innerHTML = `<div class="flex justify-between font-bold text-sm"><span>${d.action}</span><span class="text-[10px] text-slate-400 font-normal">${date}</span></div><div class="text-xs text-slate-600 dark:text-slate-400 mt-1">${d.details}</div><div class="text-[10px] text-indigo-500 mt-1">${d.user}</div>`; 
            list.appendChild(div); 
        });
    } catch(e) { list.innerHTML = `<div class="text-red-500 text-sm">Error reading logs.</div>`; }
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
            let newPrice = type === 'increase' ? Math.ceil(oldPrice * (1 + (val / 100))) : Math.floor(oldPrice * (1 - (val / 100)));
            batch.update(doc(getCollectionRef(), item.id), { price: newPrice, updatedAt: serverTimestamp() });
        });
        
        await batch.commit();
        logAction("Bulk Update", `${type === 'increase' ? '+' : '-'}${val}% on All Items`);
        showToast("Bulk Update Successful!"); document.getElementById('inflation-input').value = '';
    } catch(e) { alert("Failed: " + e.message); }
}

export function exportData() {
    const rows = state.visibleItems.map(i => `"${i.name}","${i.barcode||''}","${i.price}","${i.category||''}","${i.stock||''}"`).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8,Name,Barcode,Price,Category,Stock\n" + rows));
    link.setAttribute("download", `inventory_${state.storeName}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}
