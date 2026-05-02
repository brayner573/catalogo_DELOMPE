import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Configura tu número de WhatsApp aquí (con código de país sin el +)
const WHATSAPP_NUMBER = "51999999999"; 

document.addEventListener('DOMContentLoaded', () => {
    const productsGrid = document.getElementById('productsGrid');
    const loader = document.getElementById('loader');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const floatingWhatsapp = document.getElementById('floatingWhatsapp');
    
    // Configurar enlace flotante general de WhatsApp
    floatingWhatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola, vengo de tu catálogo online y quiero más información.')}`;

    let allProducts = [];

    // Función para obtener productos de Firebase
    async function fetchProducts() {
        try {
            const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            allProducts = [];
            
            querySnapshot.forEach((doc) => {
                allProducts.push({ id: doc.id, ...doc.data() });
            });
            
            loader.style.display = 'none';
            renderProducts(allProducts);
        } catch (error) {
            console.error("Error al obtener productos:", error);
            loader.style.display = 'none';
            productsGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Error al cargar los productos. Por favor intenta más tarde.</p>';
        }
    }

    // Renderizar productos en el DOM
    function renderProducts(products) {
        productsGrid.innerHTML = '';
        
        if (products.length === 0) {
            productsGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">No se encontraron productos.</p>';
            return;
        }

        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            // Texto para WhatsApp predeterminado
            const message = encodeURIComponent(`Hola, me interesa el producto: ${product.nombre} (S/${product.precio})`);
            const wpLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

            card.innerHTML = `
                ${product.estado && product.estado !== 'Normal' ? `<span class="product-badge">${product.estado}</span>` : ''}
                <img src="${product.imageUrl || 'img/placeholder.png'}" alt="${product.nombre}" class="product-image" loading="lazy">
                <div class="product-info">
                    <h3 class="product-title">${product.nombre}</h3>
                    <p class="product-price">S/ ${product.precio}</p>
                    <div class="product-details">
                        <span><strong>Categoría:</strong> ${product.categoria}</span>
                        <span><strong>Tallas:</strong> ${product.tallas}</span>
                        <span><strong>Colores:</strong> ${product.colores}</span>
                    </div>
                    <a href="${wpLink}" target="_blank" class="whatsapp-btn">
                        <i class="fab fa-whatsapp"></i> Pedir por WhatsApp
                    </a>
                </div>
            `;
            productsGrid.appendChild(card);
        });
    }

    // Filtros por categoría
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remover activo de todos
            filterBtns.forEach(b => b.classList.remove('active'));
            // Añadir al clickeado
            e.target.classList.add('active');
            
            const category = e.target.getAttribute('data-category');
            
            if (category === 'Todos') {
                renderProducts(allProducts);
            } else {
                const filtered = allProducts.filter(p => p.categoria === category);
                renderProducts(filtered);
            }
        });
    });

    // Búsqueda por nombre
    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        const filtered = allProducts.filter(p => 
            p.nombre.toLowerCase().includes(searchTerm)
        );
        
        // Resetear botones de categoría
        filterBtns.forEach(b => b.classList.remove('active'));
        document.querySelector('[data-category="Todos"]').classList.add('active');
        
        renderProducts(filtered);
    }

    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Iniciar
    fetchProducts();
});
