// ============================================================
// admin.js — Panel de administración
// ============================================================

import { auth, db, storage } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// =====================================================
//  Referencias DOM
// =====================================================
const loginScreen     = document.getElementById('loginScreen');
const adminPanel      = document.getElementById('adminPanel');
const loginEmail      = document.getElementById('loginEmail');
const loginPassword   = document.getElementById('loginPassword');
const loginBtn        = document.getElementById('loginBtn');
const loginError      = document.getElementById('loginError');
const logoutBtn       = document.getElementById('logoutBtn');
const formAlert       = document.getElementById('formAlert');

// Imagen
const imgPreview      = document.getElementById('imgPreview');
const imagePlaceholder= document.getElementById('imagePlaceholder');
const openCameraBtn   = document.getElementById('openCameraBtn');
const closeCameraBtn  = document.getElementById('closeCameraBtn');
const captureBtn      = document.getElementById('captureBtn');
const cameraSection   = document.getElementById('cameraSection');
const cameraVideo     = document.getElementById('cameraVideo');
const cameraCanvas    = document.getElementById('cameraCanvas');
const galleryInput    = document.getElementById('galleryInput');

// Campos
const prodName        = document.getElementById('prodName');
const prodPrice       = document.getElementById('prodPrice');
const prodCategory    = document.getElementById('prodCategory');
const prodSizes       = document.getElementById('prodSizes');
const prodColors      = document.getElementById('prodColors');
const prodStatus      = document.getElementById('prodStatus');
const prodDesc        = document.getElementById('prodDesc');

// Botones
const saveProductBtn  = document.getElementById('saveProductBtn');
const saveBtnText     = document.getElementById('saveBtnText');
const saveBtnLoader   = document.getElementById('saveBtnLoader');
const cancelEditBtn   = document.getElementById('cancelEditBtn');
const formTitle       = document.getElementById('formTitle');
const adminProductList= document.getElementById('adminProductList');

// =====================================================
//  Estado local
// =====================================================
let capturedImageBlob = null;   // Blob de la foto capturada o imagen de galería
let cameraStream      = null;   // Stream de la cámara activo
let editingProductId  = null;   // ID del producto en edición
let editingImageUrl   = null;   // URL de imagen previa al editar

// =====================================================
//  AUTH — Login / Logout
// =====================================================
loginBtn.addEventListener('click', async () => {
  const email    = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    showLoginError('Por favor ingresa correo y contraseña.');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Ingresando...';
  hideLoginError();

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged maneja la UI
  } catch (error) {
    console.error('Error login:', error.code);
    const msg = getAuthErrorMessage(error.code);
    showLoginError(msg);
    loginBtn.disabled = false;
    loginBtn.textContent = 'Iniciar sesión';
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    stopCamera();
    await signOut(auth);
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
});

// Escuchar cambios de autenticación
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginScreen.style.display = 'none';
    adminPanel.style.display  = 'block';
    loadAdminProducts();
  } else {
    loginScreen.style.display = 'flex';
    adminPanel.style.display  = 'none';
  }
});

// Mensaje de error de auth legible
function getAuthErrorMessage(code) {
  const messages = {
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-email':  'El correo no es válido.',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
    'auth/network-request-failed': 'Sin conexión a internet.',
    'auth/invalid-credential': 'Credenciales inválidas. Verifica tu correo y contraseña.',
  };
  return messages[code] || 'Error al iniciar sesión. Intenta nuevamente.';
}

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.style.display = 'block';
}
function hideLoginError() {
  loginError.style.display = 'none';
}

// =====================================================
//  CÁMARA — getUserMedia
// =====================================================
openCameraBtn.addEventListener('click', async () => {
  // Verificar soporte
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showFormAlert('Tu navegador no soporta cámara. Usa la galería.', 'error');
    return;
  }

  try {
    // Solicitar permiso de cámara trasera (celular)
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' }, // cámara trasera en celular
        width:  { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    cameraVideo.srcObject = cameraStream;
    cameraSection.style.display = 'block';
    openCameraBtn.style.display = 'none';
  } catch (error) {
    console.error('Error cámara:', error);
    let msg = 'No se pudo acceder a la cámara. ';
    if (error.name === 'NotAllowedError') {
      msg += 'Permite el acceso en la configuración de tu navegador.';
    } else if (error.name === 'NotFoundError') {
      msg += 'No se encontró ninguna cámara.';
    } else {
      msg += 'Usa la opción de galería como alternativa.';
    }
    showFormAlert(msg, 'error');
  }
});

// Tomar foto
captureBtn.addEventListener('click', () => {
  if (!cameraStream) return;

  const video  = cameraVideo;
  const canvas = cameraCanvas;
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Convertir a Blob
  canvas.toBlob((blob) => {
    if (!blob) {
      showFormAlert('Error al capturar la foto. Intenta de nuevo.', 'error');
      return;
    }
    capturedImageBlob = blob;
    showImagePreview(URL.createObjectURL(blob));
    stopCamera();
  }, 'image/jpeg', 0.85); // calidad 85%
});

// Cerrar cámara
closeCameraBtn.addEventListener('click', stopCamera);

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  cameraVideo.srcObject = null;
  cameraSection.style.display = 'none';
  openCameraBtn.style.display = 'inline-flex';
}

// =====================================================
//  GALERÍA — input file
// =====================================================
galleryInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validar tipo
  if (!file.type.startsWith('image/')) {
    showFormAlert('Solo se permiten imágenes.', 'error');
    return;
  }

  // Validar tamaño (5 MB máx)
  if (file.size > 5 * 1024 * 1024) {
    showFormAlert('La imagen no puede superar 5 MB.', 'error');
    return;
  }

  capturedImageBlob = file;
  showImagePreview(URL.createObjectURL(file));
});

function showImagePreview(url) {
  imgPreview.src = url;
  imgPreview.style.display = 'block';
  imagePlaceholder.style.display = 'none';
}

function clearImagePreview() {
  imgPreview.src = '';
  imgPreview.style.display = 'none';
  imagePlaceholder.style.display = 'flex';
  capturedImageBlob = null;
  galleryInput.value = '';
}

// =====================================================
//  GUARDAR PRODUCTO (Crear o Editar)
// =====================================================
saveProductBtn.addEventListener('click', async () => {
  // Validaciones básicas
  const nombre     = prodName.value.trim();
  const precio     = parseFloat(prodPrice.value);
  const categoria  = prodCategory.value;

  if (!nombre) { showFormAlert('El nombre es obligatorio.', 'error'); return; }
  if (isNaN(precio) || precio < 0) { showFormAlert('El precio no es válido.', 'error'); return; }
  if (!categoria) { showFormAlert('Selecciona una categoría.', 'error'); return; }

  // Si es nuevo producto, requiere imagen
  if (!editingProductId && !capturedImageBlob) {
    showFormAlert('Debes agregar una imagen (cámara o galería).', 'error');
    return;
  }

  setSavingState(true);
  hideFormAlert();

  try {
    let imageUrl = editingImageUrl || '';

    // Si hay nueva imagen, subirla a Firebase Storage
    if (capturedImageBlob) {
      const timestamp   = Date.now();
      const extension   = capturedImageBlob.type === 'image/png' ? 'png' : 'jpg';
      const fileName    = `products/${timestamp}_${nombre.replace(/\s+/g, '_')}.${extension}`;
      const storageRef  = ref(storage, fileName);

      await uploadBytes(storageRef, capturedImageBlob, {
        contentType: capturedImageBlob.type
      });
      imageUrl = await getDownloadURL(storageRef);
    }

    const productData = {
      nombre,
      precio,
      categoria,
      tallas:      prodSizes.value.trim(),
      colores:     prodColors.value.trim(),
      estado:      prodStatus.value,
      descripcion: prodDesc.value.trim(),
      imageUrl,
    };

    if (editingProductId) {
      // EDITAR
      const productRef = doc(db, 'products', editingProductId);
      await updateDoc(productRef, productData);
      showFormAlert('Producto actualizado correctamente.', 'success');
      cancelEdit();
    } else {
      // CREAR
      productData.createdAt = serverTimestamp();
      await addDoc(collection(db, 'products'), productData);
      showFormAlert('Producto guardado correctamente.', 'success');
      resetForm();
    }

  } catch (error) {
    console.error('Error guardando producto:', error);
    showFormAlert('Error al guardar. Verifica tu conexión e intenta de nuevo.', 'error');
  } finally {
    setSavingState(false);
  }
});

// =====================================================
//  CARGAR Y LISTAR PRODUCTOS (Admin)
// =====================================================
function loadAdminProducts() {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));

  onSnapshot(q, (snapshot) => {
    adminProductList.innerHTML = '';

    if (snapshot.empty) {
      adminProductList.innerHTML = '<p class="loading-text">No hay productos registrados.</p>';
      return;
    }

    snapshot.docs.forEach(docSnap => {
      const product = { id: docSnap.id, ...docSnap.data() };
      adminProductList.appendChild(createAdminProductItem(product));
    });
  },
  (error) => {
    console.error('Error cargando lista:', error);
    adminProductList.innerHTML = '<p class="loading-text" style="color:#ef5350">Error al cargar.</p>';
  });
}

function createAdminProductItem(product) {
  const item = document.createElement('div');
  item.className = 'admin-product-item';

  item.innerHTML = `
    <img class="admin-prod-img"
         src="${product.imageUrl || ''}"
         alt="${product.nombre}"
         onerror="this.style.display='none'" />
    <div class="admin-prod-info">
      <p class="admin-prod-name">${product.nombre || 'Sin nombre'}</p>
      <p class="admin-prod-meta">S/ ${Number(product.precio || 0).toFixed(2)} · ${product.categoria || ''} · ${product.estado || ''}</p>
    </div>
    <div class="admin-prod-actions">
      <button class="btn btn-edit btn-sm" data-id="${product.id}">✏️</button>
      <button class="btn btn-danger btn-sm" data-id="${product.id}" data-url="${product.imageUrl || ''}">🗑️</button>
    </div>
  `;

  // Editar
  item.querySelector('.btn-edit').addEventListener('click', () => startEdit(product));

  // Eliminar
  item.querySelector('.btn-danger').addEventListener('click', () => confirmDelete(product));

  return item;
}

// =====================================================
//  EDITAR PRODUCTO
// =====================================================
function startEdit(product) {
  editingProductId = product.id;
  editingImageUrl  = product.imageUrl || '';

  // Llenar formulario
  prodName.value     = product.nombre || '';
  prodPrice.value    = product.precio || '';
  prodCategory.value = product.categoria || '';
  prodSizes.value    = product.tallas || '';
  prodColors.value   = product.colores || '';
  prodStatus.value   = product.estado || 'Nuevo';
  prodDesc.value     = product.descripcion || '';

  // Mostrar imagen existente
  if (product.imageUrl) {
    showImagePreview(product.imageUrl);
  }

  formTitle.textContent        = 'Editar Producto';
  saveBtnText.textContent      = 'Actualizar producto';
  cancelEditBtn.style.display  = 'block';

  // Scroll al formulario
  document.getElementById('formSection').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
  editingProductId = null;
  editingImageUrl  = null;
  formTitle.textContent       = 'Agregar Producto';
  saveBtnText.textContent     = 'Guardar producto';
  cancelEditBtn.style.display = 'none';
  resetForm();
}

cancelEditBtn.addEventListener('click', cancelEdit);

// =====================================================
//  ELIMINAR PRODUCTO
// =====================================================
async function confirmDelete(product) {
  const confirmed = window.confirm(`¿Eliminar "${product.nombre}"? Esta acción no se puede deshacer.`);
  if (!confirmed) return;

  try {
    // Eliminar de Firestore
    await deleteDoc(doc(db, 'products', product.id));

    // Intentar eliminar imagen de Storage (opcional, ignora si falla)
    if (product.imageUrl) {
      try {
        // Extraer la ruta del storage desde la URL
        const url    = new URL(product.imageUrl);
        const path   = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
        const imgRef = ref(storage, path);
        await deleteObject(imgRef);
      } catch (imgError) {
        console.warn('No se pudo eliminar la imagen del storage:', imgError);
      }
    }

    showFormAlert('Producto eliminado correctamente.', 'success');
  } catch (error) {
    console.error('Error eliminando:', error);
    showFormAlert('Error al eliminar el producto.', 'error');
  }
}

// =====================================================
//  UTILIDADES
// =====================================================
function resetForm() {
  prodName.value     = '';
  prodPrice.value    = '';
  prodCategory.value = '';
  prodSizes.value    = '';
  prodColors.value   = '';
  prodStatus.value   = 'Nuevo';
  prodDesc.value     = '';
  clearImagePreview();
  stopCamera();
}

function setSavingState(saving) {
  saveProductBtn.disabled       = saving;
  saveBtnText.style.display     = saving ? 'none' : 'inline';
  saveBtnLoader.style.display   = saving ? 'inline' : 'none';
}

function showFormAlert(msg, type) {
  formAlert.textContent  = msg;
  formAlert.className    = `alert alert-${type}`;
  formAlert.style.display = 'block';

  // Auto ocultar en 5 seg si es éxito
  if (type === 'success') {
    setTimeout(() => hideFormAlert(), 5000);
  }
}

function hideFormAlert() {
  formAlert.style.display = 'none';
}

// =====================================================
//  Enter key en login
// =====================================================
loginPassword.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});
