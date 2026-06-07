import { db, appId, collection, onSnapshot, doc, updateDoc, setDoc, serverTimestamp } from './firebase.js';

export const state = {
    allItems: [],
    visibleItems: [],
    categories: ['All'],
    currentCategory: 'All',
    searchQuery: '',
    storeName: null,
    isSuperAdmin: false,
    isManager: false,
    currentUser: null
};

let unsubscribe = null;

export function getCollectionRef() {
    if (!state.storeName) return null;
    const safeName = state.storeName.replace(/[^a-z0-9]/gi, '').toLowerCase();
    return collection(db, 'artifacts', appId, 'public', 'data', `pk_store_${safeName}`);
}

export function initSync(storeName, callback) {
    state.storeName = storeName;
    if (unsubscribe) unsubscribe();
    
    unsubscribe = onSnapshot(getCollectionRef(), (snapshot) => {
        state.allItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => i.id !== '_config');
        state.visibleItems = state.allItems.filter(i => !i.isDeleted).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        const catSet = new Set(['All']);
        state.visibleItems.forEach(i => { if (i.category) catSet.add(i.category.trim()); });
        state.categories = Array.from(catSet);
        
        callback();
    });
}

export async function saveItem(id, data) {
    if (!state.isManager) return alert("Access Denied");
    data.updatedAt = serverTimestamp();
    
    if (id) {
        await updateDoc(doc(getCollectionRef(), id), data);
    } else {
        data.isDeleted = false;
        data.createdAt = serverTimestamp();
        const newRef = doc(collection(db, 'dummy'));
        await setDoc(doc(getCollectionRef(), newRef.id), data);
    }
}

export async function softDeleteItem(id) {
    if (!state.isManager || !confirm("Move to Trash?")) return;
    await updateDoc(doc(getCollectionRef(), id), { isDeleted: true, updatedAt: serverTimestamp() });
}
