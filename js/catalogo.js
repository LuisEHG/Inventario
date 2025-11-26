// js/catalogo.js
const URL_API = "https://script.google.com/macros/s/AKfycbytZvOLajZMxxbNOrz7z50SVSvCaT7QcETOObiZx39HLCCnvc7q2Q73uHfhYMWjE2TR/exec";

window.onload = function() {
    cargarCatalogo();
};

function cargarCatalogo() {
    mostrarLoader(true);
    fetch(URL_API)
    .then(r => r.json())
    .then(data => {
        const productos = (data.productos || []).filter(p => p.id != 'ID');
        renderizarProductos(productos);
        mostrarLoader(false);
    })
    .catch(e => {
        console.error(e);
        const container = document.getElementById('catalogo-productos');
        container.innerHTML = '<p class="text-center text-danger">No se pudo cargar el catálogo. Intente más tarde.</p>';
        mostrarLoader(false);
    });
}

function renderizarProductos(productos) {
    const container = document.getElementById('catalogo-productos');
    container.innerHTML = '';

    if (productos.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No hay productos disponibles en este momento.</p>';
        return;
    }

    productos.forEach(p => {
        const precio = parseFloat(p.precio) || 0;

        container.innerHTML += `
            <div class="col-md-4 col-sm-6">
                <div class="card h-100">
                    <div class="card-body text-center">
                        <h5 class="card-title">${p.nombre}</h5>
                        <p class="card-text fs-4 fw-bold text-primary">S/ ${precio.toFixed(2)}</p>
                    </div>
                </div>
            </div>
        `;
    });
}

function mostrarLoader(show) {
    document.getElementById('loader').style.display = show ? 'flex' : 'none';
}
