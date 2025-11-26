// js/app.js
// ==========================================
const URL_API = "https://script.google.com/macros/s/AKfycbytZvOLajZMxxbNOrz7z50SVSvCaT7QcETOObiZx39HLCCnvc7q2Q73uHfhYMWjE2TR/exec";
// ==========================================

let productos = [];
let movimientos = [];
let editandoId = null;

window.onload = function() {
    cargarDatos();
};

// --- SISTEMA DE NAVEGACIÓN ---
function navegar(vista) {
    if (vista === 'finanzas') {
        Swal.fire({
            title: 'Acceso Restringido',
            input: 'password',
            inputPlaceholder: 'Ingresa la contraseña',
            inputAttributes: {
                autocapitalize: 'off'
            },
            showCancelButton: true,
            confirmButtonText: 'Acceder',
            showLoaderOnConfirm: true,
            preConfirm: (password) => {
                if (password === 'YaneEdu') {
                    return true;
                } else {
                    Swal.showValidationMessage('Contraseña incorrecta');
                    return false;
                }
            },
            allowOutsideClick: () => !Swal.isLoading()
        }).then((result) => {
            if (result.isConfirmed) {
                // 1. Ocultar todas las vistas
                document.querySelectorAll('.view-section').forEach(el => el.classList.add('d-none'));
                
                // 2. Mostrar la deseada
                const target = document.getElementById(`view-${vista}`);
                if(target) {
                    target.classList.remove('d-none');
                    // Efecto visual de scroll arriba
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        });
        return; // Detener la navegación normal
    }

    // 1. Ocultar todas las vistas
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('d-none'));
    
    // 2. Mostrar la deseada
    const target = document.getElementById(`view-${vista}`);
    if(target) {
        target.classList.remove('d-none');
        // Efecto visual de scroll arriba
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// --- CONEXIÓN Y DATOS ---
function cargarDatos() {
    mostrarLoader(true);
    fetch(URL_API)
    .then(r => r.json())
    .then(data => {
        // Filtrar encabezados Excel
        productos = (data.productos || []).filter(p => p.id != 'ID');
        movimientos = (data.movimientos || []).filter(m => m.id != 'ID');
        
        actualizarUI();
        
        document.getElementById('status-indicator').innerHTML = 
            '<span class="badge bg-success"><i class="fas fa-wifi"></i> Conectado</span>';
        mostrarLoader(false);
    })
    .catch(e => {
        console.error(e);
        document.getElementById('status-indicator').innerHTML = 
            '<span class="badge bg-danger"><i class="fas fa-times"></i> Error</span>';
        mostrarLoader(false);
    });
}

function enviarDatos(payload, mensaje) {
    mostrarLoader(true);
    fetch(URL_API, { method: 'POST', body: JSON.stringify(payload) })
    .then(r => r.json())
    .then(d => {
        if(d.status === 'success') {
            Swal.fire({ icon:'success', title: mensaje, toast:true, position:'top-end', showConfirmButton:false, timer:2000 });
            cargarDatos();
            if(payload.action === 'crearProducto') navegar('home'); // Volver al home si crea
        } else throw new Error(d.message);
    })
    .catch(e => {
        console.warn(e);
        setTimeout(cargarDatos, 2500);
    });
}

// --- LÓGICA NEGOCIO ---
function guardarProducto() {
    const nombre = document.getElementById('prodName').value;
    const costo = document.getElementById('prodCost').value;
    const precio = document.getElementById('prodPrice').value;
    const stock = document.getElementById('prodStock').value;

    if(!nombre || !costo || !precio) return Swal.fire('Faltan datos', '', 'warning');

    const payload = {
        action: editandoId ? 'editarProducto' : 'crearProducto',
        id: editandoId || Date.now(),
        nombre, costo, precio, stockInicial: parseInt(stock)||0
    };
    enviarDatos(payload, editandoId ? 'Producto Actualizado' : 'Producto Creado');
    limpiarForm();
}

function registrarMovimiento() {
    const prodId = document.getElementById('selectProd').value;
    // Obtener valor del radio button seleccionado
    const tipo = document.querySelector('input[name="moveType"]:checked').value;
    const qty = parseInt(document.getElementById('moveQty').value);

    if(!prodId) return Swal.fire('Error', 'Selecciona un producto', 'warning');
    if(tipo === 'salida' && calcularStock(prodId) < qty) return Swal.fire('Stock Insuficiente', '', 'error');

    const payload = {
        action: 'registrarMovimiento',
        id: Date.now(), prodId, tipo, cantidad: qty, fecha: new Date().toISOString()
    };
    enviarDatos(payload, 'Operación Exitosa');
}

function eliminarProducto(id) {
    Swal.fire({ title:'¿Borrar?', icon:'warning', showCancelButton:true, confirmButtonColor:'#d33', confirmButtonText:'Sí' })
    .then(r => { if(r.isConfirmed) enviarDatos({ action:'eliminarProducto', id }, 'Eliminado'); });
}

// --- HELPERS UI ---
function actualizarUI() {
    // 1. Calcular Totales y Llenar Select
    let inv = 0, gan = 0;
    const sel = document.getElementById('selectProd');
    sel.innerHTML = '<option value="">Seleccione producto...</option>';
    
    // 2. Llenar Tabla Inventario
    const tbody = document.getElementById('tablaBody');
    tbody.innerHTML = '';

    productos.forEach(p => {
        const stock = calcularStock(p.id);
        const vendidos = movimientos.filter(m => String(m.prodId) == String(p.id) && m.tipo == 'salida')
                         .reduce((a,b) => a + parseInt(b.cantidad), 0);
        
        const costo = parseFloat(p.costo)||0;
        const precio = parseFloat(p.precio)||0;

        const comprados = movimientos.filter(m => String(m.prodId) == String(p.id) && m.tipo == 'entrada')
                           .reduce((a,b) => a + parseInt(b.cantidad), 0);
        inv += comprados * costo;
        gan += vendidos * (precio - costo);

        sel.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;

        tbody.innerHTML += `<tr>
            <td class="fw-bold">${p.nombre}</td>
            <td class="text-center"><span class="badge rounded-pill ${stock<10?'bg-danger':'bg-success'}">${stock}</span></td>
            <td>S/ ${precio.toFixed(2)}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-light text-primary" onclick="editarProducto('${p.id}')"><i class="fas fa-pen"></i></button>
                <button class="btn btn-sm btn-light text-danger" onclick="eliminarProducto('${p.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });

    document.getElementById('kpiInversion').innerText = `S/ ${inv.toFixed(2)}`;
    document.getElementById('kpiGanancia').innerText = `S/ ${gan.toFixed(2)}`;

    // 3. Historial
    const hbody = document.getElementById('tablaHistorial');
    hbody.innerHTML = '';
    [...movimientos].sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).slice(0,5).forEach(m => {
        const p = productos.find(x => String(x.id) == String(m.prodId));
        hbody.innerHTML += `<tr>
            <td>${new Date(m.fecha).toLocaleTimeString()}</td>
            <td>${p ? p.nombre : '???'} (${m.tipo})</td>
            <td class="fw-bold">${m.cantidad}</td>
        </tr>`;
    });
}

function calcularStock(pid) {
    let s = 0;
    movimientos.forEach(m => {
        if(String(m.prodId) == String(pid)) m.tipo == 'entrada' ? s += parseInt(m.cantidad) : s -= parseInt(m.cantidad);
    });
    return s;
}

function editarProducto(id) {
    const p = productos.find(x => String(x.id) == String(id));
    if(!p) return;
    editandoId = id;
    document.getElementById('prodName').value = p.nombre;
    document.getElementById('prodCost').value = p.costo;
    document.getElementById('prodPrice').value = p.precio;
    document.getElementById('prodStock').disabled = true;
    
    document.getElementById('btnGuardar').innerText = 'Actualizar Datos';
    document.getElementById('btnCancelar').style.display = 'inline-block';
    navegar('productos');
}

function limpiarForm() {
    editandoId = null;
    document.getElementById('prodName').value = '';
    document.getElementById('prodCost').value = '';
    document.getElementById('prodPrice').value = '';
    document.getElementById('prodStock').value = '0';
    document.getElementById('prodStock').disabled = false;
    document.getElementById('btnGuardar').innerText = 'Guardar Producto';
    document.getElementById('btnCancelar').style.display = 'none';
}

function mostrarLoader(show) { document.getElementById('loader').style.display = show ? 'flex' : 'none'; }