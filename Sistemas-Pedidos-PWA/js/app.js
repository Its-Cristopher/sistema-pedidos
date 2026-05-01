import { auth } from './firebase.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  escucharMenu,
  agregarProducto,
  eliminarProducto,
  guardarComanda,
  escucharComandasPendientes,
  actualizarEstadoComanda,
  obtenerRolUsuario,
  guardarUsuario,
  obtenerTodosLosUsuarios,
  eliminarDatosUsuario,
  obtenerTodasLasComandas,
  obtenerHistorialComandas
} from './db.js';

// ─── ESTADO ───────────────────────────────────────────────────
let comandaActual = [];
let menuProductos = [];
let rolSeleccionado = 'mesero';
let unsubscribeMenu = null;
let unsubscribeCocina = null;
let historialCompleto = [];

// ─── DOM: NAVEGACIÓN ─────────────────────────────────────────
const vistas          = document.querySelectorAll('.vista');
const mainNav         = document.getElementById('main-nav');
const headerRight     = document.getElementById('header-right');
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
const btnNavPedidos   = document.getElementById('btn-nav-pedidos');
const btnNavCocina    = document.getElementById('btn-nav-cocina');
const btnNavAdmin     = document.getElementById('btn-nav-admin');

// ─── DOM: LOGIN ───────────────────────────────────────────────
const rolCards      = document.querySelectorAll('.rol-card');
const loginEmail    = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const btnLogin      = document.getElementById('btn-login');
const loginError    = document.getElementById('login-error');

// ─── DOM: MESERO ─────────────────────────────────────────────
const menuContainer    = document.getElementById('menu-container');
const listaPedidosUI   = document.getElementById('listaPedidos');
const btnEnviarComanda = document.getElementById('btn-enviar-comanda');

// ─── DOM: COCINA ─────────────────────────────────────────────
const pedidosPendientes  = document.getElementById('pedidos-pendientes');
const btnGestionarMenu   = document.getElementById('btn-gestionar-menu');
const modalMenu          = document.getElementById('modal-menu');
const btnCerrarModal     = document.getElementById('btn-cerrar-modal');
const inputNombre        = document.getElementById('input-nombre');
const inputPrecio        = document.getElementById('input-precio');
const inputCategoria     = document.getElementById('input-categoria');
const inputImagen        = document.getElementById('input-imagen');
const previewImagen      = document.getElementById('preview-imagen');
const btnGuardarProducto = document.getElementById('btn-guardar-producto');
const listaProductosModal = document.getElementById('lista-productos-modal');

// ─── DOM: ADMIN ───────────────────────────────────────────────
const listaUsuariosAdmin = document.getElementById('lista-usuarios-admin');
const btnCrearUsuario    = document.getElementById('btn-crear-usuario');
const nuevoNombre        = document.getElementById('nuevo-nombre');
const nuevoApellido      = document.getElementById('nuevo-apellido');
const nuevoEmail         = document.getElementById('nuevo-email');
const nuevaPassword      = document.getElementById('nueva-password');
const nuevoRol           = document.getElementById('nuevo-rol');
const adminError         = document.getElementById('admin-error');
const reporteContainer   = document.getElementById('reporte-container');
const historialContainer = document.getElementById('historial-container');
const btnFiltroTodos     = document.getElementById('btn-filtro-todos');
const btnFiltroPendiente = document.getElementById('btn-filtro-pendiente');
const btnFiltroCompletado = document.getElementById('btn-filtro-completado');

// ─── UTILS ────────────────────────────────────────────────────
function mostrarToast(mensaje, tipo = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = mensaje;
  toast.style.background = tipo === 'error' ? '#c0392b' : '#355347';
  toast.className = 'toast show';
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

function mostrarError(el, msg) {
  el.textContent = msg;
  setTimeout(() => el.textContent = '', 4000);
}

// ─── NAVEGACIÓN ───────────────────────────────────────────────
function cambiarVista(idVista) {
  vistas.forEach(v => v.style.display = 'none');
  document.getElementById(idVista).style.display = 'block';
  const esLogin = idVista === 'vista-login';
  mainNav.style.display     = esLogin ? 'none' : 'flex';
  headerRight.style.display = esLogin ? 'none' : 'flex';
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.remove('active');
    b.style.display = 'none';
  });
}

function configurarNavPorRol(rol) {
  btnNavPedidos.style.display = 'none';
  btnNavCocina.style.display  = 'none';
  btnNavAdmin.style.display   = 'none';
  if (rol === 'mesero') btnNavPedidos.style.display = 'block';
  if (rol === 'cocina') btnNavCocina.style.display  = 'block';
  if (rol === 'admin')  btnNavAdmin.style.display   = 'block';
}

// ─── SELECTOR DE ROL ─────────────────────────────────────────
rolCards.forEach(card => {
  card.addEventListener('click', () => {
    rolCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    rolSeleccionado = card.dataset.rol;
    const nombres = { mesero: 'Mesero', cocina: 'Cocina', admin: 'Admin' };
    btnLogin.textContent = `Ingresar como ${nombres[rolSeleccionado]}`;
    loginEmail.value = "";
    loginPassword.value = "";
    loginError.textContent = "";
  });
});

// ─── AUTENTICACIÓN ────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const datosCompletos = await obtenerRolUsuario(user.uid, true);
    const rol = datosCompletos?.rol || null;

    if (!rol) {
      await signOut(auth);
      mostrarError(loginError, 'Sin rol asignado. Contacta al administrador.');
      return;
    }

    const nombreCompleto = datosCompletos?.nombre
      ? `${datosCompletos.nombre} ${datosCompletos.apellido || ''}`.trim()
      : user.email.split('@')[0];
    const inicial = nombreCompleto.charAt(0).toUpperCase();

    document.getElementById('user-nombre').textContent = nombreCompleto;
    document.getElementById('user-info').textContent   = user.email;
    document.getElementById('user-avatar').textContent = inicial;
    configurarNavPorRol(rol);

    if (unsubscribeMenu) unsubscribeMenu();
    unsubscribeMenu = escucharMenu((productos) => {
      menuProductos = productos;
      renderizarMenuMesero();
      renderizarMenuModal();
    });

    if (rol === 'mesero') {
      cambiarVista('vista-mesero');
      btnNavPedidos.classList.add('active');
    } else if (rol === 'cocina') {
      cambiarVista('vista-cocina');
      btnNavCocina.classList.add('active');
      iniciarEscuchaCocina();
    } else if (rol === 'admin') {
      cambiarVista('vista-admin');
      btnNavAdmin.classList.add('active');
      cargarUsuariosAdmin();
      cargarReporte();
      cargarHistorial();
    }
  } else {
    if (unsubscribeMenu)  { unsubscribeMenu();  unsubscribeMenu = null; }
    if (unsubscribeCocina){ unsubscribeCocina(); unsubscribeCocina = null; }
    loginEmail.value = "";
    loginPassword.value = "";
    loginError.textContent = "";
    cambiarVista('vista-login');
  }
});

btnLogin.addEventListener('click', async () => {
  const email = loginEmail.value.trim();
  const pass  = loginPassword.value.trim();
  if (!email || !pass) return mostrarError(loginError, 'Completa todos los campos.');
  btnLogin.disabled = true;
  btnLogin.textContent = 'Ingresando...';
  loginError.textContent = '';
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const rol  = await obtenerRolUsuario(cred.user.uid);
    if (rol && rol !== rolSeleccionado) {
      await signOut(auth);
      mostrarError(loginError, `Tu cuenta es de tipo "${rol}". Selecciona el rol correcto.`);
    }
  } catch (e) {
    mostrarError(loginError, 'Correo o contraseña incorrectos.');
  } finally {
    btnLogin.disabled = false;
    const nombres = { mesero: 'Mesero', cocina: 'Cocina', admin: 'Admin' };
    btnLogin.textContent = `Ingresar como ${nombres[rolSeleccionado]}`;
    loginEmail.value = "";
    loginPassword.value = "";
    loginError.textContent = "";
  }
});

btnCerrarSesion.addEventListener('click', () => signOut(auth));

// ─── MENÚ (MESERO) ────────────────────────────────────────────
function renderizarMenuMesero() {
  if (!menuContainer) return;
  menuContainer.innerHTML = '';
  if (menuProductos.length === 0) {
    menuContainer.innerHTML = `<p class="empty-msg">No hay productos en el menú aún.</p>`;
    return;
  }
  const categorias = [...new Set(menuProductos.map(p => p.categoria || 'Sin categoría'))];
  categorias.forEach(cat => {
    const titulo = document.createElement('h3');
    titulo.className = 'categoria-titulo';
    titulo.textContent = cat;
    menuContainer.appendChild(titulo);
    menuProductos.filter(p => (p.categoria || 'Sin categoría') === cat).forEach(prod => {
      const div = document.createElement('div');
      div.className = 'producto';
      div.innerHTML = `
        ${prod.imagenURL
          ? `<img src="${prod.imagenURL}" alt="${prod.nombre}" class="producto-img">`
          : `<div class="producto-img-placeholder">🍽️</div>`}
        <div class="producto-info">
          <h3>${prod.nombre}</h3>
          <p class="producto-precio">$${prod.precio.toLocaleString('es-CO')}</p>
        </div>
        <button class="btn-agregar btn-primary">Agregar</button>
      `;
      div.querySelector('.btn-agregar').addEventListener('click', () => agregarProductoALaComanda(prod));
      menuContainer.appendChild(div);
    });
  });
}

// ─── COMANDA ─────────────────────────────────────────────────
function agregarProductoALaComanda(prod) {
  comandaActual.push({ ...prod, itemId: Date.now() });
  renderizarComanda();
}

function eliminarProductoDeLaComanda(itemId) {
  comandaActual = comandaActual.filter(i => i.itemId !== itemId);
  renderizarComanda();
}

function renderizarComanda() {
  listaPedidosUI.innerHTML = '';
  let total = 0;
  comandaActual.forEach(item => {
    const li = document.createElement('li');
    li.style.cssText = 'display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;';
    li.innerHTML = `
      <span>${item.nombre} — $${item.precio.toLocaleString('es-CO')}</span>
      <button class="btn-icon" style="color:#c0392b; font-weight:bold;">✕</button>
    `;
    li.querySelector('button').onclick = () => eliminarProductoDeLaComanda(item.itemId);
    listaPedidosUI.appendChild(li);
    total += item.precio;
  });
  if (comandaActual.length > 0) {
    const liTotal = document.createElement('li');
    liTotal.style.cssText = 'border-top:2px solid var(--primary); margin-top:10px; padding-top:10px;';
    liTotal.innerHTML = `<strong>Total: $${total.toLocaleString('es-CO')}</strong>`;
    listaPedidosUI.appendChild(liTotal);
  }
}

btnEnviarComanda.addEventListener('click', async () => {
  if (comandaActual.length === 0) return mostrarToast('Agrega productos primero', 'error');
  btnEnviarComanda.disabled = true;
  try {
    await guardarComanda({
      items: comandaActual.map(i => ({ nombre: i.nombre, precio: i.precio })),
      meseroEmail: auth.currentUser?.email || 'Mesero'
    });
    comandaActual = [];
    renderizarComanda();
    mostrarToast('✅ Pedido enviado a cocina');
  } catch (e) {
    mostrarToast('Error al enviar el pedido', 'error');
  } finally {
    btnEnviarComanda.disabled = false;
  }
});

// ─── COCINA ───────────────────────────────────────────────────
function iniciarEscuchaCocina() {
  if (unsubscribeCocina) unsubscribeCocina();
  unsubscribeCocina = escucharComandasPendientes((pedidos) => {
    pedidosPendientes.innerHTML = '';
    if (pedidos.length === 0) {
      pedidosPendientes.innerHTML = `
        <div class="cocina-vacia"><span>👨‍🍳</span><p>Sin pedidos pendientes</p></div>`;
      return;
    }
    pedidos.forEach(pedido => {
      const div = document.createElement('div');
      div.className = 'pedido-card';
      let hora = 'Ahora';
      if (pedido.creadoEn) {
        hora = new Date(pedido.creadoEn.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      div.innerHTML = `
        <div class="pedido-header">
          <strong>Orden #${pedido.firestoreId.slice(-4).toUpperCase()}</strong>
          <span class="pedido-hora">${hora}</span>
        </div>
        <p class="pedido-mesero">📱 ${pedido.meseroEmail || 'Mesero'}</p>
        <ul class="pedido-items">${pedido.items.map(i => `<li>${i.nombre}</li>`).join('')}</ul>
      `;
      const btnListo = document.createElement('button');
      btnListo.textContent = '✅ Marcar listo';
      btnListo.className = 'btn-primary';
      btnListo.style.cssText = 'width:100%; margin-top:12px;';
      btnListo.onclick = async () => {
        div.style.opacity = '0.4';
        div.style.pointerEvents = 'none';
        try {
          await actualizarEstadoComanda(pedido.firestoreId, 'completado');
          mostrarToast('Pedido despachado ✅');
        } catch (e) {
          mostrarToast('Error al procesar', 'error');
          div.style.opacity = '1';
          div.style.pointerEvents = 'auto';
        }
      };
      div.appendChild(btnListo);
      pedidosPendientes.appendChild(div);
    });
  });
}

// ─── MODAL MENÚ ───────────────────────────────────────────────
btnGestionarMenu.addEventListener('click', () => { modalMenu.style.display = 'flex'; renderizarMenuModal(); });
btnCerrarModal.addEventListener('click', () => { modalMenu.style.display = 'none'; limpiarFormularioModal(); });
window.addEventListener('click', (e) => {
  if (e.target === modalMenu) { modalMenu.style.display = 'none'; limpiarFormularioModal(); }
});

inputImagen.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => { previewImagen.src = ev.target.result; previewImagen.style.display = 'block'; };
    reader.readAsDataURL(file);
  } else { previewImagen.style.display = 'none'; }
});

btnGuardarProducto.addEventListener('click', async () => {
  const nombre    = inputNombre.value.trim();
  const precio    = parseFloat(inputPrecio.value);
  const categoria = inputCategoria.value.trim();
  const archivo   = inputImagen.files[0];
  if (!nombre || isNaN(precio) || precio <= 0) return mostrarToast('Ingresa nombre y precio válidos', 'error');
  btnGuardarProducto.disabled = true;
  btnGuardarProducto.textContent = 'Guardando...';
  try {
    let imagenBase64 = null;
    if (archivo) {
      imagenBase64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(archivo);
      });
    }
    await agregarProducto({ nombre, precio, categoria }, imagenBase64);
    mostrarToast('✅ Producto agregado al menú');
    limpiarFormularioModal();
  } catch (e) {
    mostrarToast('Error al guardar el producto', 'error');
  } finally {
    btnGuardarProducto.disabled = false;
    btnGuardarProducto.textContent = 'Agregar producto';
  }
});

function renderizarMenuModal() {
  if (!listaProductosModal) return;
  listaProductosModal.innerHTML = '';
  if (menuProductos.length === 0) {
    listaProductosModal.innerHTML = `<p class="empty-msg">No hay productos aún.</p>`;
    return;
  }
  menuProductos.forEach(prod => {
    const div = document.createElement('div');
    div.className = 'modal-producto-item';
    div.innerHTML = `
      ${prod.imagenURL
        ? `<img src="${prod.imagenURL}" alt="${prod.nombre}" class="modal-producto-img">`
        : `<div class="modal-producto-img modal-img-placeholder">🍽️</div>`}
      <div class="modal-producto-info">
        <strong>${prod.nombre}</strong>
        <span>$${prod.precio.toLocaleString('es-CO')} · ${prod.categoria || 'Sin categoría'}</span>
      </div>
      <button class="btn-icon btn-eliminar-prod" title="Eliminar">🗑️</button>
    `;
    div.querySelector('.btn-eliminar-prod').onclick = async () => {
      if (confirm(`¿Eliminar "${prod.nombre}"?`)) {
        try { await eliminarProducto(prod.firestoreId); mostrarToast('Producto eliminado'); }
        catch (e) { mostrarToast('Error al eliminar', 'error'); }
      }
    };
    listaProductosModal.appendChild(div);
  });
}

function limpiarFormularioModal() {
  inputNombre.value = '';
  inputPrecio.value = '';
  inputCategoria.value = '';
  inputImagen.value = '';
  previewImagen.style.display = 'none';
  previewImagen.src = '';
}

// ─── ADMIN: USUARIOS ─────────────────────────────────────────
async function cargarUsuariosAdmin() {
  const usuarios = await obtenerTodosLosUsuarios();
  listaUsuariosAdmin.innerHTML = '';
  if (usuarios.length === 0) {
    listaUsuariosAdmin.innerHTML = `<p class="empty-msg">No hay usuarios registrados.</p>`;
    return;
  }
  usuarios.forEach(u => {
    const div = document.createElement('div');
    div.className = 'usuario-item';
    const nombreActual   = u.nombre || '';
    const apellidoActual = u.apellido || '';
    const nombreCompleto = nombreActual ? `${nombreActual} ${apellidoActual}`.trim() : 'Sin nombre';
    const inicial = nombreCompleto !== 'Sin nombre' ? nombreCompleto.charAt(0).toUpperCase() : 'U';

    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; flex:1;">
        <div class="usuario-avatar">${inicial}</div>
        <div style="flex:1;">
          <div class="vista-texto">
            <strong style="display:block; font-size:0.9rem;">
              ${nombreCompleto}
              <button class="btn-icon btn-editar-nombre" title="Editar" style="font-size:0.85rem; margin-left:5px;">✏️</button>
            </strong>
            <span style="font-size:0.78rem; color:var(--text-muted);">${u.email}</span>
          </div>
          <div class="vista-edicion" style="display:none; align-items:center; gap:5px; margin-bottom:5px;">
            <input type="text" class="edit-nombre" value="${nombreActual}" placeholder="Nombre" style="width:40%; padding:4px; font-size:0.8rem;">
            <input type="text" class="edit-apellido" value="${apellidoActual}" placeholder="Apellido" style="width:40%; padding:4px; font-size:0.8rem;">
            <button class="btn-icon btn-guardar-nombre" title="Guardar" style="font-size:1.1rem;">💾</button>
            <button class="btn-icon btn-cancelar-nombre" title="Cancelar" style="font-size:1.1rem;">✖️</button>
          </div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:12px;">
        <span class="rol-badge rol-${u.rol}">${u.rol}</span>
        <button class="btn-icon btn-eliminar-usuario" title="Eliminar" style="color:var(--danger); font-size:1.1rem;">🗑️</button>
      </div>
    `;

    // Editar nombre
    const vistaTexto   = div.querySelector('.vista-texto');
    const vistaEdicion = div.querySelector('.vista-edicion');
    div.querySelector('.btn-editar-nombre').onclick  = () => { vistaTexto.style.display = 'none'; vistaEdicion.style.display = 'flex'; };
    div.querySelector('.btn-cancelar-nombre').onclick = () => { vistaTexto.style.display = 'block'; vistaEdicion.style.display = 'none'; };
    div.querySelector('.btn-guardar-nombre').onclick  = async () => {
      const nn = div.querySelector('.edit-nombre').value.trim();
      const na = div.querySelector('.edit-apellido').value.trim();
      if (!nn) return mostrarToast('El nombre es obligatorio', 'error');
      try {
        await guardarUsuario(u.uid, { nombre: nn, apellido: na });
        mostrarToast('✅ Nombre actualizado');
        cargarUsuariosAdmin();
      } catch { mostrarToast('Error al actualizar', 'error'); }
    };

    // Eliminar usuario — Firestore únicamente (Auth requiere backend)
    div.querySelector('.btn-eliminar-usuario').onclick = async () => {
      if (!confirm(`¿Eliminar el acceso de "${nombreCompleto}"?\nSe eliminará su perfil del sistema.`)) return;
      try {
        await eliminarDatosUsuario(u.uid);
        mostrarToast('✅ Usuario eliminado del sistema');
        cargarUsuariosAdmin();
      } catch { mostrarToast('Error al eliminar usuario', 'error'); }
    };

    listaUsuariosAdmin.appendChild(div);
  });
}

// ─── ADMIN: CREAR USUARIO ─────────────────────────────────────
btnCrearUsuario.addEventListener('click', async () => {
  const nombre   = nuevoNombre.value.trim();
  const apellido = nuevoApellido.value.trim();
  const email    = nuevoEmail.value.trim();
  const pass     = nuevaPassword.value.trim();
  const rol      = nuevoRol.value;

  if (!nombre || !email || !pass) return mostrarError(adminError, 'Completa nombre, email y contraseña.');
  if (pass.length < 6) return mostrarError(adminError, 'Contraseña mínima de 6 caracteres.');

  btnCrearUsuario.disabled = true;
  btnCrearUsuario.textContent = 'Creando...';
  try {
    const { createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
    const config = auth.app.options;
    const appSec = initializeApp(config, `Temp-${Date.now()}`);
    const authSec = getAuth(appSec);
    const cred = await createUserWithEmailAndPassword(authSec, email, pass);
    await guardarUsuario(cred.user.uid, { email, rol, nombre, apellido });
    await authSec.signOut();
    nuevoNombre.value = nuevoApellido.value = nuevoEmail.value = nuevaPassword.value = '';
    adminError.textContent = '';
    mostrarToast(`✅ Usuario "${rol}" creado: ${email}`);
    cargarUsuariosAdmin();
  } catch (e) {
    let msg = 'No se pudo crear el usuario.';
    if (e.code === 'auth/email-already-in-use') msg = 'Este correo ya está registrado.';
    if (e.code === 'auth/invalid-email') msg = 'Formato de correo inválido.';
    if (e.code === 'auth/weak-password') msg = 'La contraseña es muy débil.';
    mostrarError(adminError, msg);
  } finally {
    btnCrearUsuario.disabled = false;
    btnCrearUsuario.textContent = 'Crear usuario';
  }
});

// ─── ADMIN: REPORTE ───────────────────────────────────────────
async function cargarReporte() {
  const comandas = await obtenerTodasLasComandas();
  const completados = comandas.filter(c => c.estado === 'completado');
  const total = completados.reduce((sum, c) => sum + (c.items?.reduce((s, i) => s + i.precio, 0) || 0), 0);
  reporteContainer.innerHTML = `
    <div class="reporte-cards">
      <div class="reporte-card">
        <span class="reporte-label">Total pedidos</span>
        <span class="reporte-valor">${comandas.length}</span>
      </div>
      <div class="reporte-card">
        <span class="reporte-label">Completados</span>
        <span class="reporte-valor">${completados.length}</span>
      </div>
      <div class="reporte-card">
        <span class="reporte-label">Ingresos totales</span>
        <span class="reporte-valor">$${total.toLocaleString('es-CO')}</span>
      </div>
    </div>
  `;
}

// ─── ADMIN: HISTORIAL ─────────────────────────────────────────
async function cargarHistorial() {
  historialContainer.innerHTML = `<p class="empty-msg">Cargando historial...</p>`;
  historialCompleto = await obtenerHistorialComandas();
  renderizarHistorial(historialCompleto);
}

function renderizarHistorial(pedidos) {
  historialContainer.innerHTML = '';
  if (pedidos.length === 0) {
    historialContainer.innerHTML = `<p class="empty-msg">No hay pedidos en el historial.</p>`;
    return;
  }
  pedidos.forEach(pedido => {
    const div = document.createElement('div');
    div.className = 'historial-item';
    const fecha = pedido.creadoEn
      ? new Date(pedido.creadoEn.seconds * 1000).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
      : 'Sin fecha';
    const total = pedido.items?.reduce((s, i) => s + i.precio, 0) || 0;
    const esCompletado = pedido.estado === 'completado';
    div.innerHTML = `
      <div class="historial-info">
        <div class="historial-top">
          <strong>Orden #${pedido.firestoreId.slice(-4).toUpperCase()}</strong>
          <span class="historial-badge ${esCompletado ? 'badge-completado' : 'badge-pendiente'}">
            ${esCompletado ? '✅ Completado' : '⏳ Pendiente'}
          </span>
        </div>
        <span class="historial-meta">📅 ${fecha} · 👤 ${pedido.meseroEmail || 'N/A'}</span>
        <span class="historial-items">${pedido.items?.map(i => i.nombre).join(', ') || ''}</span>
      </div>
      <div class="historial-total">$${total.toLocaleString('es-CO')}</div>
    `;
    historialContainer.appendChild(div);
  });
}

// Filtros del historial
[btnFiltroTodos, btnFiltroPendiente, btnFiltroCompletado].forEach(btn => {
  btn.addEventListener('click', () => {
    [btnFiltroTodos, btnFiltroPendiente, btnFiltroCompletado].forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (btn === btnFiltroTodos)       renderizarHistorial(historialCompleto);
    if (btn === btnFiltroPendiente)   renderizarHistorial(historialCompleto.filter(p => p.estado === 'pendiente'));
    if (btn === btnFiltroCompletado)  renderizarHistorial(historialCompleto.filter(p => p.estado === 'completado'));
  });
});

// ─── BOTONES NAV ──────────────────────────────────────────────
btnNavPedidos.addEventListener('click', () => { cambiarVista('vista-mesero'); btnNavPedidos.classList.add('active'); });
btnNavCocina.addEventListener('click', ()  => { cambiarVista('vista-cocina'); btnNavCocina.classList.add('active'); iniciarEscuchaCocina(); });
btnNavAdmin.addEventListener('click', ()   => { cambiarVista('vista-admin'); btnNavAdmin.classList.add('active'); cargarUsuariosAdmin(); cargarReporte(); cargarHistorial(); });

// ─── INICIO ───────────────────────────────────────────────────
cambiarVista('vista-login');