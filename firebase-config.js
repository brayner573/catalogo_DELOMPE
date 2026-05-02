// Configuración de Firebase (Debes reemplazar estos valores con los de tu proyecto de Firebase)
// Instrucciones de cómo obtener estos datos en el README.md

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyD2hlDBs7qMvd_qe8N92i9iu0zr9Wl0hXI",
    authDomain: "catalogo-ropa-laravel.firebaseapp.com",
    projectId: "catalogo-ropa-laravel",
    storageBucket: "catalogo-ropa-laravel.firebasestorage.app",
    messagingSenderId: "1022418451252",
    appId: "1:1022418451252:web:8e6a4fcf5cab872e304361",
    measurementId: "G-DRD1T3HXK7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export { auth, db, storage };
