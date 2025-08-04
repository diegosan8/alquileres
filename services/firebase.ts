import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

<<<<<<< HEAD
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
=======
// IMPORTANTE: Reemplaza estos valores con la configuración de tu propio proyecto de Firebase.
// Puedes encontrar esta configuración en la consola de Firebase, en los ajustes de tu proyecto,
// después de registrar una "Aplicación Web" (</>).
const firebaseConfig = {

  apiKey: "AIzaSyCNUzjp4BzOgOKxHsWyPderkX_rdmn2xXQ",

  authDomain: "alquileres-2.firebaseapp.com",

  projectId: "alquileres-2",

  storageBucket: "alquileres-2.firebasestorage.app",

  messagingSenderId: "528026909910",

  appId: "1:528026909910:web:f31a3e4afb862fb6da5d77"

};


// Inicializar Firebase
>>>>>>> 2e12e770348c4360d07999b59baecd81bf9eaf6c
let app = null;
let db = null;
let storage = null;
let firebaseError = null;

try {
<<<<<<< HEAD
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
=======
    // Check if the config has been changed from placeholders
    if (firebaseConfig.projectId === "YOUR_PROJECT_ID" || firebaseConfig.apiKey === "YOUR_API_KEY") {
        throw new Error("La configuración de Firebase no ha sido actualizada. Por favor, edita `services/firebase.ts` con los datos de tu proyecto.");
    }
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("Firebase initialized successfully.");
} catch (error) {
    console.error("Firebase initialization error:", error);
    firebaseError = error;
}


>>>>>>> 2e12e770348c4360d07999b59baecd81bf9eaf6c
export { db, storage, firebaseError };
