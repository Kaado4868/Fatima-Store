import { db, appId, collection, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, addDoc } from './firebase.js';

export const state = {
    allItems: [],
    visibleItems: [],
    categories: ['All'],
    currentCategory: 'All',
    searchQuery: '',
    storeName: null,
    isSuperAdmin: false,
    isManager: false,
    currentUser: null,
    staffMap: {} // Restored team tracking
};

let unsubscribe = null;

export function getCollectionRef() {
    if (!state.storeName) return null;
    const safeName = state.storeName.replace(/[^a-z0-9]/gi, '').toLowerCase();
    return collection(db, 'artifacts', appId, 'public', 'data', `pk_store_${safeName}`);
}

export function getLogCollectionRef() {
    if (!state.storeName) return null;
    const safeName = state.storeName.replace(/[^a-z0-9]/gi, '').toLowerCase();
    return collection(db, 'artifacts', appId, 'public', 'logs', `pk_store_${safeName}`);
}

export function initSync(storeName, callback) {
    state.storeName = storeName;
    if (unsubscribe) unsubscribe();
    
    unsubscribe = onSnapshot(getCollectionRef(), (snapshot) => {
        // Find config for Team Management
        const configDoc = snapshot.docs.find(d => d.id === '_config');
        if (configDoc) state.staffMap = configDoc.data().staff || {};

        // Recalculate Role based on config
        const email = state.currentUser?.email?.toLowerCase();
        state.isManager = state.isSuperAdmin || (state.staffMap[email] === 'manager');

        // Parse items
        state.allItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => i.id !== '_config');
        state.visibleItems = state.allItems.filter(i => !i.isDeleted).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        const catSet = new Set(['All']);
        state.visibleItems.forEach(i => { if (i.category) catSet.add(i.category.trim()); });
        state.categories = Array.from(catSet);
        
        callback();
    });
}

// Restored Audit Logging
export async function logAction(action, details, meta = {}) {
    if (!state.isSuperAdmin && !state.isManager) return;
    addDoc(getLogCollectionRef(), { action, details, user: state.currentUser?.email || "Unknown", timestamp: serverTimestamp(), meta }).catch(e => console.error(e));
}

export async function saveItem(id, data) {
    if (!state.isManager) return alert("Access Denied");
    data.updatedAt = serverTimestamp();
    
    if (id) {
        const oldItem = state.allItems.find(i => i.id === id);
        let oldDataSafe = oldItem ? JSON.parse(JSON.stringify(oldItem)) : null;
        if(oldDataSafe) delete oldDataSafe.id;

        await updateDoc(doc(getCollectionRef(), id), data);
        logAction("Edit", `Updated '${data.name}'`, { itemId: id, previousData: oldDataSafe });
    } else {
        data.isDeleted = false;
        data.createdAt = serverTimestamp();
        const newRef = doc(collection(db, 'dummy'));
        await setDoc(doc(getCollectionRef(), newRef.id), data);
        logAction("Create", `Created '${data.name}'`, { itemId: newRef.id });
    }
}

export async function softDeleteItem(id) {
    if (!state.isManager || !confirm("Move to Trash?")) return;
    const item = state.visibleItems.find(i => i.id === id);
    if (!item) return;

    await updateDoc(doc(getCollectionRef(), id), { isDeleted: true, updatedAt: serverTimestamp() });
    logAction("Soft Delete", `Deleted '${item.name}'`, { itemId: id });
}
