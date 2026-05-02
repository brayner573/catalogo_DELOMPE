// ============================================================
// script.js — Catálogo para clientes
// ============================================================

import { db } from './firebase-config.js';
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ---- Número de WhatsApp (configura el tuyo aquí) ----
const WHATSAPP_NUMBER = "51999999999"; // Reemplaza con tu número (con código de país, sin +)

// ---- Referencias DOM ----
const catalogGrid   = document.getElementById('catalogGrid');
const emptyMsg      = document.getElementById('emptyMsg');
const searchInput   = document.getElementById('searchInput');
const filterChips   = document.querySelectorAll('.chip');
const modal         = document.getElementById('productModal');
const modalClose    = document.getElementById('modalClose');
const fabWhatsapp   = document.getElementById('fabWhatsapp');

// Campos modal
const modalImg      = document.getElementById('modalImg');
const modalBadge    = document.getElementById('modalBadge');
const modalCat      = document.getElementById('modalCat');
const modalName     = document.getElementById('modalName');
const modalPrice    = document.getElementById('modalPrice');
const modalSizes    = document.getElementById('modalSizes');
const modalColors   = document.getElementById('modalColors');
const modalDesc     = document.getElementById('modalDesc');
const modalWhatsapp = document.getElementById('modalWhatsapp');

// ---- Estado local ----
let allProducts = [];
let currentCategory = 'all';
let currentSearch   = '';

// ---- FAB WhatsApp general ----
fabWhatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=Hola%2C%20vi%20su%20cat%C3%A1logo%20y%20quisiera%20m%C3%A1s%20informaci%C3%B3n.`;

// =====================================================
//  Escuchar productos en tiempo real desde Firestore
// =====================================================
function initCatalog() {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));

  onSnapshot(q,
    (snapshot) => {
      allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderCatalog();
    },
    (error) => {
      console.error('Error al cargar productos:', error);
      catalogGrid.innerHTML = '<p class="empty-msg" style="display:block">Error al cargar productos. Revisa la conexión.</p>';
    }
  );
}

// =====================================================
//  Renderizar catálogo con filtros
// =====================================================
function renderCatalog() {
  let filtered = allProducts;

  // Filtrar por categoría
  if (currentCategory !== 'all') {
    filtered = filtered.filter(p => p.categoria === currentCategory);
  }

  // Filtrar por búsqueda
  if (currentSearch.trim()) {
    const term = currentSearch.toLowerCase();
    filtered = filtered.filter(p =>
      (p.nombre || '').toLowerCase().includes(term) ||
      (p.descripcion || '').toLowerCase().includes(term)
    );
  }

  // Limpiar grid
  catalogGrid.innerHTML = '';

  if (filtered.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  filtered.forEach((product, index) => {
    const card = createProductCard(product, index);
    catalogGrid.appendChild(card);
  });
}

// =====================================================
//  Crear tarjeta de producto
// =====================================================
function createProductCard(product, index) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.style.animationDelay = `${index * 0.06}s`;

  // Badge
  let badgeHTML = '';
  if (product.estado) {
    const badgeClass = product.estado === 'Nuevo' ? 'badge-nuevo'
                     : product.estado === 'Oferta' ? 'badge-oferta'
                     : 'badge-mas';
    badgeHTML = `<span class="card-badge ${badgeClass}">${product.estado}</span>`;
  }

  // Imagen
  const imgHTML = product.imageUrl
    ? `<img class="card-img" src="${product.imageUrl}" alt="${product.nombre}" loading="lazy" />`
    : `<div class="card-img-placeholder">👕</div>`;

  card.innerHTML = `
    ${imgHTML}
    <div class="card-body">
      ${badgeHTML}
      <p class="card-cat">${product.categoria || ''}</p>
      <p class="card-name">${product.nombre || 'Sin nombre'}</p>
      <p class="card-price">S/ ${Number(product.precio || 0).toFixed(2)}</p>
    </div>
  `;

  card.addEventListener('click', () => openModal(product));
  return card;
}

// =====================================================
//  Modal de producto
// =====================================================
function openModal(product) {
  // Imagen
  if (product.imageUrl) {
    modalImg.src = product.imageUrl;
    modalImg.style.display = 'block';
  } else {
    modalImg.style.display = 'none';
  }

  // Badge
  if (product.estado) {
    const badgeClass = product.estado === 'Nuevo' ? 'badge-nuevo'
                     : product.estado === 'Oferta' ? 'badge-oferta'
                     : 'badge-mas';
    modalBadge.textContent = product.estado;
    modalBadge.className = `modal-badge card-badge ${badgeClass}`;
  } else {
    modalBadge.textContent = '';
  }

  modalCat.textContent   = product.categoria || '';
  modalName.textContent  = product.nombre || '';
  modalPrice.textContent = `S/ ${Number(product.precio || 0).toFixed(2)}`;
  modalSizes.textContent = product.tallas || '—';
  modalColors.textContent = product.colores || '—';
  modalDesc.textContent  = product.descripcion || '';

  // Link WhatsApp
  const msg = encodeURIComponent(
    `Hola, me interesa el producto: *${product.nombre}* (S/ ${Number(product.precio || 0).toFixed(2)}). ¿Está disponible?`
  );
  modalWhatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

// ---- Eventos modal ----
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// =====================================================
//  Filtros de categoría
// =====================================================
filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentCategory = chip.dataset.cat;
    renderCatalog();
  });
});

// =====================================================
//  Búsqueda
// =====================================================
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentSearch = searchInput.value;
    renderCatalog();
  }, 300);
});

// =====================================================
//  Init
// =====================================================
initCatalog();
