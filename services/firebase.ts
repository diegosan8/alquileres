import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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
let app = null;
let db = null;
let storage = null;
let firebaseError = null;

try {
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


export { db, storage, firebaseError };
