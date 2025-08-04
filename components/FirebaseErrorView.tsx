import React from 'react';

export const FirebaseErrorView = ({ error }) => {
    const isConfigError = error.message.includes("configuración de Firebase");

    return React.createElement('div', { className: "flex flex-col items-center justify-center h-screen bg-gray-900 text-gray-300 p-8" },
        React.createElement('div', { className: "bg-red-900 border border-red-700 rounded-lg p-8 max-w-2xl text-center" },
            React.createElement('h2', { className: "text-2xl font-bold text-white mb-4" }, "Error de Conexión con Firebase"),
            isConfigError
                ? React.createElement('div', { className: "text-left space-y-3" },
                    React.createElement('p', null, React.createElement('strong', null, "Acción Requerida:"), " Parece que estás usando la configuración de ejemplo de Firebase."),
                    React.createElement('p', null, "Para conectar la aplicación a tu base de datos, necesitas añadir tus propias credenciales de Firebase en el siguiente archivo:"),
                    React.createElement('code', { className: "block bg-gray-800 p-2 rounded-md text-amber-300 my-2" }, "services/firebase.ts"),
                    React.createElement('p', { className: "font-semibold mt-4" }, "Cómo obtener tus credenciales:"),
                    React.createElement('ol', { className: "list-decimal list-inside space-y-1" },
                        React.createElement('li', null, "Ve a la ", React.createElement('a', { href: "https://console.firebase.google.com/", target: "_blank", rel: "noopener noreferrer", className: "text-indigo-400 hover:underline" }, "Consola de Firebase"), "."),
                        React.createElement('li', null, "Crea un nuevo proyecto o selecciona uno existente."),
                        React.createElement('li', null, "En la configuración del proyecto (icono de engranaje), ve a la pestaña 'General'."),
                        React.createElement('li', null, "Bajo 'Tus aplicaciones', crea una nueva 'Aplicación web' (si aún no lo has hecho)."),
                        React.createElement('li', null, "Copia el objeto `firebaseConfig` que se muestra."),
                        React.createElement('li', null, "Pega este objeto en `services/firebase.ts`, reemplazando los valores de marcador de posición."),
                    ),
                    React.createElement('p', { className: "mt-4" }, "Después de actualizar el archivo, recarga la aplicación.")
                )
                : React.createElement('div', { className: "text-left" },
                    React.createElement('p', { className: "mb-4" }, "Servicio de Firestore no disponible"),
                    React.createElement('p', { className: "mb-4" }, "La base de datos Firestore no está habilitada para este proyecto en Firebase."),
                    React.createElement('p', { className: "font-semibold mb-2" }, "Para solucionarlo, por favor siga estos pasos:"),
                    React.createElement('ol', { className: "list-decimal list-inside space-y-1 mb-4" },
                        React.createElement('li', null, "Vaya a la consola de Firebase de su proyecto (", React.createElement('a', { href: "https://console.firebase.google.com/", target: "_blank", rel: "noopener noreferrer", className: "text-indigo-400 hover:underline" }, "https://console.firebase.google.com/"), ")."),
                        React.createElement('li', null, "En el menú de la izquierda, en la sección \"Compilación\", haga clic en \"Firestore Database\"."),
                        React.createElement('li', null, "Haga clic en el botón \"Crear base de datos\"."),
                        React.createElement('li', null, "Elija el modo de producción o prueba para empezar."),
                        React.createElement('li', null, "Seleccione una ubicación para sus datos."),
                        React.createElement('li', null, "Haga clic en \"Habilitar\"."),
                    ),
                    React.createElement('p', null, "Una vez habilitado, recargue esta aplicación."),
                ),
            React.createElement('p', { className: "text-xs text-gray-500 mt-6" },
                "Error original: ", error.message
            )
        )
    );
};
