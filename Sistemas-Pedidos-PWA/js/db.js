import { db, storage } from './firebase.js';
import {
  collection, addDoc, getDocs, deleteDoc, doc,
  onSnapshot, query, where, serverTimestamp, setDoc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ─── HELPERS ─────────────────────────────────────────────────
const col  = (nombre) => collection(db, nombre);
const docR = (nombre, id) => doc(db, nombre, id);

// ─── COMANDAS ────────────────────────────────────────────────
export const guardarComanda = (comanda) =>
  addDoc(col('comandas'), { ...comanda, estado: 'pendiente', creadoEn: serverTimestamp() });

export const actualizarEstadoComanda = (id, estado) =>
  updateDoc(docR('comandas', id), { estado });

export const eliminarComanda = (id) => deleteDoc(docR('comandas', id));

export function escucharComandasPendientes(callback) {
  return onSnapshot(
    query(col('comandas'), where('estado', '==', 'pendiente')),
    snap => callback(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })))
  );
}

export async function obtenerTodasLasComandas() {
  const snap = await getDocs(col('comandas'));
  return snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
}

export async function obtenerHistorialComandas() {
  const todas = await obtenerTodasLasComandas();
  return todas.sort((a, b) => (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0));
}

// ─── MENÚ ────────────────────────────────────────────────────
export function escucharMenu(callback) {
  return onSnapshot(col('menu'),
    snap => callback(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })))
  );
}

export async function agregarProducto(producto, imagenBase64 = null) {
  let imagenURL = null;
  if (imagenBase64) {
    const storageRef = ref(storage, `menu/${Date.now()}_${producto.nombre.replace(/\s/g, '_')}`);
    await uploadString(storageRef, imagenBase64, 'data_url');
    imagenURL = await getDownloadURL(storageRef);
  }
  return addDoc(col('menu'), {
    nombre: producto.nombre,
    precio: parseFloat(producto.precio),
    categoria: producto.categoria,
    imagenURL,
    creadoEn: serverTimestamp()
  });
}

export const eliminarProducto = (id) => deleteDoc(docR('menu', id));

// ─── USUARIOS ────────────────────────────────────────────────
export async function obtenerRolUsuario(uid, completo = false) {
  const snap = await getDoc(docR('usuarios', uid));
  if (!snap.exists()) return null;
  return completo ? snap.data() : snap.data().rol;
}

export async function obtenerTodosLosUsuarios() {
  const snap = await getDocs(col('usuarios'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

export const guardarUsuario    = (uid, datos) => setDoc(docR('usuarios', uid), datos, { merge: true });
export const eliminarDatosUsuario = (uid) => deleteDoc(docR('usuarios', uid));