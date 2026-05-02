import { auth, db, storage } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-storage.js";

// Elementos UI Autenticación y Navegación
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const catalogSection = document.getElementById('catalogSection');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const adminLink = document.getElementById('adminLink');
const viewCatalogBtn = document.getElementById('viewCatalogBtn');

// Elementos UI Cámara
const cameraView = document.getElementById('camera-view');
const imagePreview = document.getElementById('image-preview');
const startCameraBtn = document.getElementById('startCameraBtn');
const takePhotoBtn = document.getElementById('takePhotoBtn');
const imageUpload = document.getElementById('imageUpload');

// Elementos UI Formulario
const addProductForm = document.getElementById('addProductForm');
const saveProductBtn = document.getElementById('saveProductBtn');
const uploadStatus = document.getElementById('uploadStatus');
const adminProductsList = document.getElementById('adminProductsList');

// Variables globales
let imageFile = null; // Guardará el Blob de la cámara o File de galería
let stream = null; // Stream de la cámara

// --- 1. Autenticación y Navegación ---

// Variables de estado
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        loadAdminProducts();
        // Si estábamos en login, pasamos al dashboard
        if (loginSection.style.display !== 'none') {
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';
        }
    } else {
        // Si estábamos en dashboard, pasamos a login o catálogo
        if (dashboardSection.style.display !== 'none') {
            dashboardSection.style.display = 'none';
            loginSection.style.display = 'none';
            catalogSection.style.display = 'block';
        }
    }
});

adminLink.addEventListener('click', (e) => {
    e.preventDefault();
    catalogSection.style.display = 'none';
    if (currentUser) {
        dashboardSection.style.display = 'block';
        loginSection.style.display = 'none';
    } else {
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
    }
});

viewCatalogBtn.addEventListener('click', (e) => {
    e.preventDefault();
    dashboardSection.style.display = 'none';
    loginSection.style.display = 'none';
    catalogSection.style.display = 'block';
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('loginBtn');
    
    try {
        btn.disabled = true;
        btn.textContent = "Iniciando...";
        await signInWithEmailAndPassword(auth, email, password);
        loginError.style.display = 'none';
    } catch (error) {
        loginError.textContent = "Error: Correo o contraseña incorrectos.";
        loginError.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = "Ingresar";
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error cerrando sesión:", error);
    }
});


// --- 2. Funciones de Cámara ---

startCameraBtn.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        cameraView.srcObject = stream;
        cameraView.style.display = 'block';
        imagePreview.style.display = 'none';
        takePhotoBtn.style.display = 'block';
        startCameraBtn.style.display = 'none';
    } catch (err) {
        console.error("Error al acceder a la cámara:", err);
        alert("No se pudo acceder a la cámara. Asegúrate de dar permisos o usa la opción de subir galería.");
    }
});

takePhotoBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = cameraView.videoWidth;
    canvas.height = cameraView.videoHeight;
    canvas.getContext('2d').drawImage(cameraView, 0, 0);
    
    // Convertir a Blob (JPG)
    canvas.toBlob((blob) => {
        imageFile = blob;
        // Mostrar vista previa
        const url = URL.createObjectURL(blob);
        imagePreview.src = url;
        imagePreview.style.display = 'block';
        
        // Detener cámara
        cameraView.style.display = 'none';
        stream.getTracks().forEach(track => track.stop());
        takePhotoBtn.style.display = 'none';
        startCameraBtn.style.display = 'block';
        startCameraBtn.innerHTML = '<i class="fas fa-camera"></i> Tomar Otra';
    }, 'image/jpeg', 0.8);
});

imageUpload.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        imageFile = e.target.files[0];
        
        // Mostrar vista previa
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            cameraView.style.display = 'none';
            if(stream) stream.getTracks().forEach(track => track.stop());
            takePhotoBtn.style.display = 'none';
            startCameraBtn.style.display = 'block';
        }
        reader.readAsDataURL(imageFile);
    }
});


// --- 3. CRUD Productos ---

addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!imageFile) {
        alert("Por favor toma una foto o sube una imagen del producto.");
        return;
    }

    saveProductBtn.disabled = true;
    
    try {
        uploadStatus.textContent = "Subiendo imagen...";
        uploadStatus.style.color = "black";
        
        // 1. Subir imagen a Storage
        const fileName = `products/${Date.now()}_img.jpg`;
        const storageRef = ref(storage, fileName);
        const uploadTask = await uploadBytesResumable(storageRef, imageFile);
        const imageUrl = await getDownloadURL(uploadTask.ref);

        uploadStatus.textContent = "Guardando datos...";

        // 2. Guardar en Firestore
        const productData = {
            nombre: document.getElementById('prodName').value,
            precio: parseFloat(document.getElementById('prodPrice').value),
            categoria: document.getElementById('prodCategory').value,
            tallas: document.getElementById('prodSizes').value,
            colores: document.getElementById('prodColors').value,
            estado: document.getElementById('prodStatus').value,
            descripcion: document.getElementById('prodDesc').value,
            imageUrl: imageUrl,
            imagePath: fileName, // Guardamos la ruta para poder borrarla después
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, "products"), productData);

        uploadStatus.textContent = "¡Producto guardado con éxito!";
        uploadStatus.style.color = "green";
        
        // Limpiar formulario
        addProductForm.reset();
        imageFile = null;
        imagePreview.style.display = 'none';
        startCameraBtn.innerHTML = '<i class="fas fa-camera"></i> Abrir Cámara';
        
        // Recargar lista
        loadAdminProducts();
        
        setTimeout(() => { uploadStatus.textContent = ""; }, 3000);

    } catch (error) {
        console.error("Error al guardar producto:", error);
        uploadStatus.textContent = "Error al guardar el producto.";
        uploadStatus.style.color = "red";
    } finally {
        saveProductBtn.disabled = false;
    }
});

// Cargar y listar productos
async function loadAdminProducts() {
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        adminProductsList.innerHTML = '';
        
        querySnapshot.forEach((docSnap) => {
            const prod = docSnap.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${prod.imageUrl}" class="admin-product-img"></td>
                <td>${prod.nombre}</td>
                <td>S/ ${prod.precio}</td>
                <td>${prod.categoria}</td>
                <td class="action-buttons">
                    <button class="btn-danger" onclick="deleteProduct('${docSnap.id}', '${prod.imagePath}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            adminProductsList.appendChild(tr);
        });
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

// Hacer deleteProduct global para el onclick
window.deleteProduct = async (docId, imagePath) => {
    if(confirm("¿Estás seguro de eliminar este producto?")) {
        try {
            // Eliminar documento de Firestore
            await deleteDoc(doc(db, "products", docId));
            
            // Eliminar imagen de Storage
            if(imagePath) {
                const imgRef = ref(storage, imagePath);
                await deleteObject(imgRef).catch(e => console.log("La imagen no existía o ya fue borrada", e));
            }
            
            alert("Producto eliminado");
            loadAdminProducts();
        } catch (error) {
            console.error("Error al eliminar:", error);
            alert("Error al eliminar el producto.");
        }
    }
};
