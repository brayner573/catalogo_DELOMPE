// Configuración de Firebase (Debes reemplazar estos valores con los de tu proyecto de Firebase)
// Instrucciones de cómo obtener estos datos en el README.md

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyD2hlDBs7qMvd_qe8N92i9iu0zr9Wl0hXI",
    authDomain: "catalogo-ropa-laravel.firebaseapp.com",
    projectId: "catalogo-ropa-laravel",
    storageBucket: "catalogo-ropa-laravel.firebasestorage.app",
    messagingSenderId: "1022418451252",
    appId: "1:1022418451252:web:8e6a4fcf5cab872e304361"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
