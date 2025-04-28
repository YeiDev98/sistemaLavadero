// js/historial.js - Con console.log para depurar datos leídos de BD

document.addEventListener('DOMContentLoaded', async function () { // Usar async para await
    // --- Mostrar información del usuario y rol ---
    const userInfoSpan = document.getElementById('userInfo');
    const adminLink = document.getElementById('adminUsersLink');
    if (userInfoSpan) {
        try {
            const userDataString = sessionStorage.getItem('loggedInUser');
            if (userDataString) {
                const userData = JSON.parse(userDataString);
                userInfoSpan.textContent = `Usuario: ${userData.username} (${userData.role})`;
                if (adminLink) { adminLink.style.display = (userData.role === 'admin') ? 'inline-block' : 'none'; }
            } else { userInfoSpan.textContent = 'No identificado'; }
        } catch (e) { console.error('Error al mostrar datos de usuario:', e); userInfoSpan.textContent = 'Error sesión'; }
    } else { console.warn("'userInfo' no encontrado."); }
    if (!adminLink) { console.warn("'adminUsersLink' no encontrado."); }
    // --- FIN: Mostrar información del usuario ---


    // --- Lógica de la página de historial ---
    const listaHistorial = document.getElementById('listaHistorial');
    const inputPlaca = document.getElementById('buscarPlaca');
    const selectTipo = document.getElementById('filtrarTipo');
    const inputFecha = document.getElementById('filtrarFecha');
    const btnLimpiar = document.getElementById('limpiarFiltros');

    if (!listaHistorial || !inputPlaca || !selectTipo || !inputFecha || !btnLimpiar) {
        console.error("Error: Faltan elementos esenciales en historial.html");
        if (listaHistorial) listaHistorial.innerHTML = '<p>Error al cargar componentes.</p>';
        return;
    }

    let historialOriginal = []; // Variable para guardar los datos de la BD

    // --- Cargar historial desde IndexedDB ---
    try {
        let retries = 5;
        while (!db && retries > 0) {
             console.warn("DB no lista aún, reintentando...");
             await new Promise(resolve => setTimeout(resolve, 300));
             retries--;
        }
        if (!db) throw new Error("DB no se inicializó después de esperar.");

        historialOriginal = await getAllVehiculosFromDB(); // Usa helper de db.js

        // --- INICIO: CONSOLE.LOG AÑADIDO PARA DEPURAR ---
        console.log("Historial cargado desde IndexedDB:", historialOriginal);
        // Revisa en la consola si este array contiene los vehículos que agregaste
        // y si cada objeto vehículo tiene todas las propiedades (marca, placa, propietario, etc.)
        // --- FIN: CONSOLE.LOG AÑADIDO ---

    } catch (error) {
        console.error("Error al cargar historial desde IndexedDB:", error);
        listaHistorial.innerHTML = `<p>Error al cargar el historial: ${error.message}.</p>`;
        inputPlaca.disabled = true; selectTipo.disabled = true; inputFecha.disabled = true; btnLimpiar.disabled = true;
        return;
    }
    // --- Fin Cargar historial ---


    // --- Función para mostrar el historial en la página ---
    function renderizarHistorial(filtrado) {
        listaHistorial.innerHTML = '';
        if (!filtrado || filtrado.length === 0) {
            if (historialOriginal.length === 0) { listaHistorial.innerHTML = '<p>No hay registros en el historial aún.</p>'; }
            else { listaHistorial.innerHTML = '<p>No se encontraron registros con los filtros aplicados.</p>'; }
            return;
        }
        filtrado.forEach((vehiculo) => {
             if (!vehiculo) { console.warn("Registro nulo encontrado."); return; }
             const tarjeta = document.createElement('div');
             tarjeta.className = 'tarjeta-historial';
             const fechaFormateada = vehiculo.fecha ? new Date(vehiculo.fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short'}) : 'N/A';
             const precioFormateado = typeof vehiculo.precio === 'number' ? `$${vehiculo.precio.toLocaleString('es-CO')}` : 'N/A';
             let servicioLegible = 'N/A';
             if (vehiculo.tipo === 'Moto') { servicioLegible = vehiculo.tipoServicio === 'lavadaBrillada' ? 'L y B' : (vehiculo.tipoServicio === 'soloLavada' ? 'Solo L' : 'Srv Inv.'); }
             else if (vehiculo.tipo === 'Auto' || vehiculo.tipo === 'Camion') { servicioLegible = 'Básico'; }

             // Asegurarse que el innerHTML sigue completo
             tarjeta.innerHTML = `
                <h3>${vehiculo.tipo || 'N/A'} - ${vehiculo.placa || 'N/A'}</h3>
                <p><strong>Marca:</strong> ${vehiculo.marca || 'N/A'}</p>
                <p><strong>Propietario:</strong> ${vehiculo.propietario || 'N/A'}</p>
                <p><strong>Personal:</strong> ${vehiculo.personalAsignado || 'N/A'}</p>
                <p><strong>Servicio:</strong> ${servicioLegible}</p>
                <p><strong>Precio:</strong> ${precioFormateado}</p>
                <p><strong>Fecha:</strong> ${fechaFormateada}</p>
             `;
             listaHistorial.appendChild(tarjeta);
        });
    }

    // --- Función para filtrar el historial (sin cambios internos) ---
    function filtrarHistorial() {
        const placa = inputPlaca.value.toLowerCase().trim();
        const tipo = selectTipo.value;
        const fecha = inputFecha.value;
        const filtrado = historialOriginal.filter(v => {
            if (!v) return false;
            const vPlaca = v.placa?.toLowerCase() || '';
            const vTipo = v.tipo || '';
            const vFecha = v.fecha ? v.fecha.split('T')[0] : '';
            const coincidePlaca = !placa || vPlaca.includes(placa);
            const coincideTipo = !tipo || vTipo === tipo;
            const coincideFecha = !fecha || vFecha === fecha;
            return coincidePlaca && coincideTipo && coincideFecha;
        });
        renderizarHistorial(filtrado);
    }

    // --- Añadir listeners (sin cambios) ---
    inputPlaca.addEventListener('input', filtrarHistorial);
    selectTipo.addEventListener('change', filtrarHistorial);
    inputFecha.addEventListener('change', filtrarHistorial);
    btnLimpiar.addEventListener('click', () => {
        inputPlaca.value = ''; selectTipo.value = ''; inputFecha.value = '';
        renderizarHistorial(historialOriginal);
    });

    // --- Renderizar el historial inicial ---
    renderizarHistorial(historialOriginal); // Llamar aquí después de cargar/filtrar

}); // Fin del DOMContentLoaded async

