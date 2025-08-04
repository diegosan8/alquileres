import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuración de Firebase proporcionada para el proyecto.
const firebaseConfig = {
  apiKey: "AIzaSyCNUzjp4BzOgOKxHsWyPderkX_rdmn2xXQ",
  authDomain: "alquileres-2.firebaseapp.com",
  projectId: "alquileres-2",
  storageBucket: "alquileres-2.firebasestorage.app",
  messagingSenderId: "528026909910",
  appId: "1:528026909910:web:f31a3e4afb862fb6da5d77"
};

// Se inicializan las variables para la app, la base de datos y el almacenamiento.
let app = null;
let db = null;
let storage = null;
let firebaseError = null;

try {
  // Se inicializa Firebase con la configuración.
  app = initializeApp(firebaseConfig);
  // Se obtienen las instancias de Firestore y Storage.
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("Firebase se ha inicializado correctamente.");
} catch (error) {
  // Se captura y registra cualquier error durante la inicialización.
  console.error("Error en la inicialización de Firebase:", error);
  firebaseError = error;
}

// Se exportan las instancias para ser usadas en otras partes de la aplicación.
export { db, storage, firebaseError };
