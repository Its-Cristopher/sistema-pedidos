import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { initializeFirestore, persistentLocalCache } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCW0zqhr3DQdb_exKD-5V86OKj6i9itoUg",
  authDomain: "sistema-pedidos-37bbe.firebaseapp.com",
  projectId: "sistema-pedidos-37bbe",
  storageBucket: "sistema-pedidos-37bbe.firebasestorage.app",
  messagingSenderId: "412079643858",
  appId: "1:412079643858:web:3f52e41f92a4c60b66210b"
};

const app = initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const storage = getStorage(app);

// persistentLocalCache reemplaza enableIndexedDbPersistence (deprecado en v10)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});