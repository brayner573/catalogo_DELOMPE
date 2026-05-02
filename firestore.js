// ============================================================
// REGLAS FIRESTORE — firestore.rules
// Copia y pega en: Firebase Console → Firestore → Reglas
// ============================================================

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ---- Colección: products ----
    match /products/{productId} {

      // Lectura pública — cualquier visitante puede ver el catálogo
      allow read: if true;

      // Crear producto — solo usuario autenticado
      allow create: if request.auth != null
                    && request.resource.data.nombre is string
                    && request.resource.data.nombre.size() > 0
                    && request.resource.data.precio is number
                    && request.resource.data.precio >= 0;

      // Editar producto — solo usuario autenticado
      allow update: if request.auth != null;

      // Eliminar producto — solo usuario autenticado
      allow delete: if request.auth != null;
    }
  }
}
