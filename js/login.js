// js/login.js - Lógica para el formulario de inicio de sesión

// Espera a que el HTML esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {

    // Obtener referencias a los elementos del formulario
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');

    // Asegurarse de que los elementos existen
    if (!loginForm || !usernameInput || !passwordInput || !loginError) {
        console.error('Error: No se encontraron los elementos del formulario de login.');
        // Mostrar error al usuario si es crítico
        if(loginError) loginError.textContent = 'Error interno al cargar el formulario.';
        return;
    }

    // Añadir listener para el evento 'submit' del formulario
    loginForm.addEventListener('submit', (event) => {
        // 1. Prevenir el envío por defecto (que recarga la página)
        event.preventDefault(); 
        console.log('Formulario enviado, previniendo recarga...');

        // 2. Limpiar errores previos
        loginError.textContent = '';
        loginError.style.display = 'none';

        // 3. Obtener valores de los inputs
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim(); // ¡IMPORTANTE! Contraseña en texto plano

        // 4. Validación básica (campos no vacíos)
        if (!username || !password) {
            showLoginError('Por favor, ingresa usuario y contraseña.');
            return;
        }

        // 5. Intentar verificar credenciales en IndexedDB
        // Verificar si la BD está lista (la variable 'db' viene de db.js)
        if (!db) {
            showLoginError('La base de datos no está lista. Intenta de nuevo en unos segundos.');
            console.error('Variable db no está inicializada.');
            return;
        }

        console.log(`Intentando buscar usuario: ${username}`);
        try {
            // Iniciar transacción de solo lectura en el almacén 'usuarios'
            const transaction = db.transaction([USER_STORE_NAME], 'readonly');
            const store = transaction.objectStore(USER_STORE_NAME);
            // Intentar obtener el usuario por su nombre de usuario (que es la keyPath)
            const request = store.get(username);

            request.onerror = (event) => {
                console.error('Error al buscar usuario en DB:', event.target.error);
                showLoginError('Error al verificar el usuario.');
            };

            request.onsuccess = (event) => {
                const user = event.target.result;
                console.log('Resultado de búsqueda de usuario:', user);

                if (user) {
                    // Usuario encontrado, ¡ahora verificar contraseña!
                    // **ADVERTENCIA DE SEGURIDAD:** Estamos comparando contraseñas en texto plano.
                    // En una aplicación real, NUNCA deberías hacer esto. Se debe comparar un HASH.
                    if (password === user.password) { 
                        // ¡Contraseña correcta!
                        handleLoginSuccess(user);
                    } else {
                        // Contraseña incorrecta
                        handleLoginFailure('Contraseña incorrecta.');
                    }
                } else {
                    // Usuario no encontrado
                    handleLoginFailure('Usuario no encontrado.');
                }
            };

        } catch (error) {
             console.error('Error al iniciar transacción o buscar usuario:', error);
             showLoginError('Ocurrió un error inesperado durante el inicio de sesión.');
        }
    }); // Fin del listener del submit

    // --- Funciones Auxiliares ---

    function handleLoginSuccess(userData) {
        console.log('Login exitoso para:', userData.username, 'Rol:', userData.role);
        // Guardar info del usuario en sessionStorage (se borra al cerrar navegador)
        try {
            sessionStorage.setItem('loggedInUser', JSON.stringify({ 
                username: userData.username, 
                role: userData.role 
            }));
            // Redirigir a la página principal
            window.location.href = 'index.html'; 
        } catch (e) {
            console.error("Error al guardar en sessionStorage: ", e);
             Swal.fire({ // Notificar al usuario
                icon: 'error',
                title: 'Error de Sesión',
                text: 'No se pudo iniciar la sesión correctamente.'
             });
        }
    }

    function handleLoginFailure(message) {
        console.warn('Fallo de login:', message);
        showLoginError(message);
        // Opcional: Usar SweetAlert para errores también
        // Swal.fire('Error', message, 'error');
    }

    function showLoginError(message) {
        loginError.textContent = message;
        loginError.style.display = 'block';
    }

}); // Fin del DOMContentLoaded


