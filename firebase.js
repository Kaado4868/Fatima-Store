import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, writeBatch, enableMultiTabIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

const firebaseConfig = { 
    apiKey: "AIzaSyAKtNEsWV_4GnHs_Q4CfrHz3AbWQ4gRrow", 
    authDomain: "fatima-store-1f63f.firebaseapp.com", 
    projectId: "fatima-store-1f63f", 
    storageBucket: "fatima-store-1f63f.firebasestorage.app", 
    messagingSenderId: "349442172022", 
    appId: "1:349442172022:web:af457182d0daac14beeb57" 
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = 'fatima-store-1f63f';
export const SUPER_ADMIN_EMAIL = "abdulkadirbukar2006@gmail.com";

try {
    enableMultiTabIndexedDbPersistence(db).catch(err => console.log('Offline Persistence Error:', err.code));
} catch(e) {}

export { signInAnonymously, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence, collection, addDoc, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, writeBatch };
