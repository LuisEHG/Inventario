// js/catalogo.js
const URL_API = "https://script.google.com/macros/s/AKfycbytZvOLajZMxxbNOrz7z50SVSvCaT7QcETOObiZx39HLCCnvc7q2Q73uHfhYMWjE2TR/exec";
const WHATSAPP_NUMBER = '51992848465';
let cart = [];
let allProducts = [];

window.onload = function() {
    loadCart();
    cargarCatalogo();
    document.getElementById('checkout-button').addEventListener('click', checkout);
    document.getElementById('cart-icon-container').addEventListener('click', renderCartModal);
};

function loadCart() {
    const savedCart = sessionStorage.getItem('bodegaCart');
    if (savedCart) {
        try {
            const parsedCart = JSON.parse(savedCart);
            if (Array.isArray(parsedCart)) {
                cart = parsedCart;
            } else {
                cart = [];
            }
        } catch (e) {
            console.error("Error parsing cart from sessionStorage:", e);
            cart = [];
            sessionStorage.removeItem('bodegaCart');
        }
    }
    updateCartIcon();
}

function cargarCatalogo() {
    mostrarLoader(true);
    fetch(URL_API)
    .then(r => r.json())
    .then(data => {
        try {
            allProducts = (data.productos || []).filter(p => p.id != 'ID');
            renderizarProductos(allProducts);
        } catch (e) {
            console.error("Error rendering products:", e);
            const container = document.getElementById('catalogo-productos');
            container.innerHTML = '<p class="text-center text-danger">Ocurrió un error al mostrar los productos.</p>';
        } finally {
            mostrarLoader(false);
        }
    })
    .catch(e => {
        console.error("Error fetching data:", e);
        const container = document.getElementById('catalogo-productos');
        container.innerHTML = '<p class="text-center text-danger">No se pudo cargar el catálogo. Intente más tarde.</p>';
        mostrarLoader(false);
    });
}

function renderizarProductos(productos) {
    const container = document.getElementById('catalogo-productos');
    container.innerHTML = '';
    if (!productos || productos.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No hay productos disponibles en este momento.</p>';
        return;
    }

    productos.forEach(p => {
        const precio = parseFloat(p.precio) || 0;
        const card = document.createElement('div');
        card.className = 'col-md-4 col-sm-6 mb-4';
        
        const cardContent = `
            <div class="card h-100 d-flex flex-column product-card">
                <div class="card-body text-center d-flex flex-column">
                    <h5 class="card-title">${p.nombre}</h5>
                    <p class="card-text fs-4 fw-bold text-primary mt-auto">S/ ${precio.toFixed(2)}</p>
                </div>
                <div class="card-footer bg-white border-0 p-3">
                    <div class="d-flex justify-content-center align-items-center gap-2">
                        <input type="number" class="form-control" value="1" min="1" id="qty-${p.id}" style="width: 70px;">
                        <button class="btn btn-primary flex-grow-1" onclick="addToCart('${p.id}')">Agregar</button>
                    </div>
                </div>
            </div>
        `;
        card.innerHTML = cardContent;

        const imgElement = document.createElement('img');
        imgElement.className = "card-img-top d-block mx-auto product-image";
        imgElement.alt = p.nombre;
        imgElement.style = "height: 200px; object-fit: cover;";
        const productNameEncoded = encodeURIComponent(p.nombre);
        const possibleExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.webp', ''];
        let currentExtensionIndex = 0;

        imgElement.onerror = function() {
            currentExtensionIndex++;
            if (currentExtensionIndex < possibleExtensions.length) {
                this.src = `img/${productNameEncoded}${possibleExtensions[currentExtensionIndex]}`;
            } else {
                this.style.display = 'none';
            }
        };
        imgElement.src = `img/${productNameEncoded}${possibleExtensions[currentExtensionIndex]}`;
        card.querySelector('.card').prepend(imgElement);
        container.appendChild(card);
    });
}

function addToCart(productId) {
    const product = allProducts.find(p => String(p.id) === String(productId));
    if (!product) return;

    const quantityInput = document.getElementById(`qty-${productId}`);
    const quantity = parseInt(quantityInput.value);
    if (isNaN(quantity) || quantity <= 0) return;

    const existingItem = cart.find(item => String(item.id) === String(productId));
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: productId,
            name: product.nombre,
            price: parseFloat(product.precio),
            quantity: quantity
        });
    }

    quantityInput.value = 1;
    const cartIcon = document.getElementById('cart-icon-container');
    cartIcon.classList.add('animate__animated', 'animate__tada');
    setTimeout(() => {
        cartIcon.classList.remove('animate__animated', 'animate__tada');
    }, 1000);

    saveCart();
    updateCartIcon();
}

function saveCart() {
    sessionStorage.setItem('bodegaCart', JSON.stringify(cart));
}

function updateCartIcon() {
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cart-count').innerText = cartCount;
}

function renderCartModal() {
    const modalBody = document.getElementById('cartModalBody');
    if (cart.length === 0) {
        modalBody.innerHTML = '<p class="text-center">Tu carrito está vacío.</p>';
        return;
    }

    let total = 0;
    const cartItemsHtml = cart.map(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        return `
            <tr>
                <td>${item.name}</td>
                <td class="text-center">
                    <input type="number" class="form-control form-control-sm mx-auto" value="${item.quantity}" min="1" onchange="updateCartItem('${item.id}', this.value)" style="width: 70px;">
                </td>
                <td class="text-end">S/ ${subtotal.toFixed(2)}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger" onclick="removeCartItem('${item.id}')"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    modalBody.innerHTML = `
        <div class="table-responsive">
            <table class="table align-middle">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th class="text-center">Cantidad</th>
                        <th class="text-end">Subtotal</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${cartItemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" class="text-end fw-bold">TOTAL</td>
                        <td class="text-end fw-bold fs-5">S/ ${total.toFixed(2)}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}

function updateCartItem(productId, newQuantity) {
    const quantity = parseInt(newQuantity);
    const item = cart.find(item => String(item.id) === String(productId));
    if (item && quantity > 0) {
        item.quantity = quantity;
    } else if (item) {
        cart = cart.filter(i => String(i.id) !== String(productId));
    }
    saveCart();
    updateCartIcon();
    renderCartModal();
}

function removeCartItem(productId) {
    cart = cart.filter(item => String(item.id) !== String(productId));
    saveCart();
    updateCartIcon();
    renderCartModal();
}

function checkout() {
    if (cart.length === 0) {
        alert('Tu carrito está vacío.');
        return;
    }

    let message = '¡Hola! Quisiera hacer el siguiente pedido:\n\n';
    let total = 0;
    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        message += `- ${item.name} (x${item.quantity}) - S/ ${subtotal.toFixed(2)}\n`;
        total += subtotal;
    });
    message += `\n*TOTAL: S/ ${total.toFixed(2)}*`;

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function mostrarLoader(show) {
    document.getElementById('loader').style.display = show ? 'flex' : 'none';
}
