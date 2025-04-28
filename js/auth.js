// js/auth.js - Funciones de Autenticación y Control de Acceso

function checkAuth() {
    console.log('Verificando autenticación...'); // Log para depuración
    const userDataString = sessionStorage.getItem('loggedInUser');

    if (!userDataString) {
        console.log('Usuario no autenticado. Redirigiendo a login...');
        // Si no hay datos de usuario en sessionStorage, redirigir a login.html
        // Asegúrate de que login.html NO incluya este script auth.js para evitar bucle infinito
        window.location.href = 'login.html';
    } else {
        try {
            // Intentar parsear para asegurar que son datos válidos (opcional pero bueno)
            const userData = JSON.parse(userDataString);
            // Si necesitas usar los datos del usuario en la página, puedes devolverlos:
            // return userData;
            console.log(`Usuario autenticado: ${userData.username}, Rol: ${userData.role}`);
        } catch (e) {
            // Si los datos están corruptos, limpiar y redirigir
            console.error('Error parseando datos de sesión, redirigiendo a login...', e);
            sessionStorage.removeItem('loggedInUser');
            window.location.href = 'login.html';
        }
    }
}

// Ejecutar la verificación inmediatamente al cargar este script
// Cualquier página que incluya este script estará protegida.
checkAuth();

// --- Función para Cerrar Sesión (La añadiremos al botón/enlace después) ---
function logout() {
    console.log('Cerrando sesión...');
    sessionStorage.removeItem('loggedInUser'); // Elimina los datos de sesión
    window.location.href = 'login.html'; // Redirige a la página de login
}

// Nota: El botón/enlace en el HTML llamará a esta función logout()
// Ejemplo: <a href="#" onclick="logout()">Cerrar Sesión</a>



