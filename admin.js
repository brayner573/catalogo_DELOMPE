import { auth, db, storage } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, setDoc, getDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-storage.js";

// Elementos UI Autenticación y Navegación
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const catalogSection = document.getElementById('catalogSection');
const clientDashboardSection = document.getElementById('clientDashboardSection');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const logoutBtn = document.getElementById('logoutBtn');
const logoutClientBtn = document.getElementById('logoutClientBtn');
const logoutSidebarBtn = document.getElementById('logoutSidebarBtn');
const logoutSidebarClientBtn = document.getElementById('logoutSidebarClientBtn');
const adminLink = document.getElementById('adminLink');
const adminLinkFooter = document.getElementById('adminLinkFooter');
const viewCatalogBtn = document.getElementById('viewCatalogBtn');
const viewCatalogClientBtn = document.getElementById('viewCatalogClientBtn');

const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');

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

// Variables de estado
let currentUser = null;
let currentUserRole = null;

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        // Verificar rol
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === 'client') {
            currentUserRole = 'client';
            document.getElementById('clientWelcomeText').textContent = `¡Hola, ${userDoc.data().name}! Bienvenido a tu cuenta.`;
        } else {
            currentUserRole = 'admin'; // Backward compatibility: si no hay doc, es el admin original
            loadAdminProducts();
        }

        // Mostrar la vista correspondiente
        if (loginSection.style.display !== 'none') {
            loginSection.style.display = 'none';
            if (currentUserRole === 'admin') {
                dashboardSection.style.display = 'block';
            } else {
                clientDashboardSection.style.display = 'block';
            }
        }
    } else {
        currentUserRole = null;
        // Si estábamos en dashboard o panel de cliente, pasamos a login
        if (dashboardSection.style.display !== 'none' || clientDashboardSection.style.display !== 'none') {
            dashboardSection.style.display = 'none';
            clientDashboardSection.style.display = 'none';
            loginSection.style.display = 'block';
            catalogSection.style.display = 'none';
        }
    }
});

adminLink.addEventListener('click', (e) => {
    e.preventDefault();
    catalogSection.style.display = 'none';
    if (currentUser) {
        if (currentUserRole === 'admin') {
            dashboardSection.style.display = 'block';
        } else {
            clientDashboardSection.style.display = 'block';
        }
        loginSection.style.display = 'none';
    } else {
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        clientDashboardSection.style.display = 'none';
    }
});

if (adminLinkFooter) {
    adminLinkFooter.addEventListener('click', (e) => {
        e.preventDefault();
        catalogSection.style.display = 'none';
        if (currentUser) {
            if (currentUserRole === 'admin') {
                dashboardSection.style.display = 'block';
            } else {
                clientDashboardSection.style.display = 'block';
            }
            loginSection.style.display = 'none';
        } else {
            loginSection.style.display = 'block';
            dashboardSection.style.display = 'none';
            clientDashboardSection.style.display = 'none';
        }
    });
}

viewCatalogBtn.addEventListener('click', (e) => {
    e.preventDefault();
    dashboardSection.style.display = 'none';
    loginSection.style.display = 'none';
    catalogSection.style.display = 'block';
});

viewCatalogClientBtn.addEventListener('click', (e) => {
    e.preventDefault();
    clientDashboardSection.style.display = 'none';
    loginSection.style.display = 'none';
    catalogSection.style.display = 'block';
});

// Manejo de pestañas
tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
});

tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
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

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const btn = document.getElementById('registerBtn');
    
    try {
        btn.disabled = true;
        btn.textContent = "Registrando...";
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Guardar rol de cliente en Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
            name: name,
            email: email,
            role: 'client',
            createdAt: serverTimestamp()
        });
        
        registerError.style.display = 'none';
        registerForm.reset();
    } catch (error) {
        console.error("Error en registro:", error);
        registerError.textContent = "Error: No se pudo crear la cuenta. Intenta de nuevo.";
        registerError.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = "Registrarse";
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error cerrando sesión:", error);
    }
});

logoutClientBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error cerrando sesión:", error);
    }
});

if (logoutSidebarBtn) {
    logoutSidebarBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error cerrando sesión:", error);
        }
    });
}

if (logoutSidebarClientBtn) {
    logoutSidebarClientBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error cerrando sesión:", error);
        }
    });
}


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

        // 2. Guardar en Firestore con campos en inglés (solicitado por usuario)
        const productData = {
            name: document.getElementById('prodName').value,
            price: parseFloat(document.getElementById('prodPrice').value),
            category: document.getElementById('prodCategory').value,
            tallas: document.getElementById('prodSizes').value,
            colores: document.getElementById('prodColors').value,
            estado: document.getElementById('prodStatus').value,
            descripcion: document.getElementById('prodDesc').value,
            image_url: imageUrl,
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
        
        // Ya no es necesario llamar loadAdminProducts() porque usamos onSnapshot
        
        setTimeout(() => { uploadStatus.textContent = ""; }, 3000);

    } catch (error) {
        console.error("Error al guardar producto:", error);
        uploadStatus.textContent = "Error al guardar el producto.";
        uploadStatus.style.color = "red";
    } finally {
        saveProductBtn.disabled = false;
    }
});

// Cargar y listar productos (Tiempo real)
function loadAdminProducts() {
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        
        onSnapshot(q, (querySnapshot) => {
            adminProductsList.innerHTML = '';
            
            querySnapshot.forEach((docSnap) => {
                const prod = docSnap.data();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><img src="${prod.image_url || 'img/placeholder.png'}" class="admin-product-img"></td>
                    <td>${prod.name}</td>
                    <td>S/ ${prod.price}</td>
                    <td>${prod.category}</td>
                    <td class="action-buttons">
                        <button class="btn-danger" onclick="deleteProduct('${docSnap.id}', '${prod.imagePath}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                adminProductsList.appendChild(tr);
            });
        }, (error) => {
            console.error("Error cargando productos del admin:", error);
        });
    } catch (error) {
        console.error("Error al configurar snapshot:", error);
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
            // loadAdminProducts() no es necesario ya que se actualiza solo
        } catch (error) {
            console.error("Error al eliminar:", error);
            alert("Error al eliminar el producto.");
        }
    }
};
