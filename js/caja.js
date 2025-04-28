// js/caja.js

document.addEventListener('DOMContentLoaded', async () => { // 'async' necesario para await
    // --- Mostrar info usuario (sin cambios respecto a la versión funcional) ---
    const userInfoSpan = document.getElementById('userInfo');
    const adminLink = document.getElementById('adminUsersLink');
    let currentUser = null;
    if (userInfoSpan) {
        try {
            const userDataString = sessionStorage.getItem('loggedInUser');
            if (userDataString) {
                currentUser = JSON.parse(userDataString);
                userInfoSpan.textContent = `Usuario: ${currentUser.username} (${currentUser.role})`;
                if (adminLink) { adminLink.style.display = (currentUser.role === 'admin') ? 'inline-block' : 'none'; }
            } else { userInfoSpan.textContent = 'No identificado'; }
        } catch (e) { console.error('Error al mostrar datos de usuario:', e); userInfoSpan.textContent = 'Error sesión'; }
    } else { console.warn("'userInfo' no encontrado."); }
    if (!adminLink) { console.warn("'adminUsersLink' no encontrado."); }
    // --- Fin Mostrar info usuario ---


    // --- Referencias a elementos ---
    const cajaStatusDiv = document.getElementById('cajaStatus');
    const btnAbrirCaja = document.getElementById('btnAbrirCaja');
    const btnCerrarCaja = document.getElementById('btnCerrarCaja');

    if (!cajaStatusDiv || !btnAbrirCaja || !btnCerrarCaja) {
        console.error("Error CRÍTICO: Faltan elementos clave en caja.html.");
        if (cajaStatusDiv) cajaStatusDiv.textContent = 'Error al cargar la página.';
        return;
    }

    let turnoAbiertoActual = null;

    // --- Función para Verificar Estado Actual de la Caja ---
    async function verificarEstadoCaja() {
        console.log("Verificando estado de caja...");
        cajaStatusDiv.textContent = 'Verificando estado...';
        cajaStatusDiv.className = '';
        try {
            let retries = 5;
            while (!db && retries > 0) { console.warn("DB no lista, reintentando..."); await new Promise(r => setTimeout(r, 300)); retries--; }
            if (!db) throw new Error("DB no inicializada.");

            const transaction = db.transaction([CAJA_STORE_NAME], 'readonly');
            const store = transaction.objectStore(CAJA_STORE_NAME);
            const index = store.index('estadoIndex');
            const request = index.getAll('abierta');

            request.onerror = (event) => { throw new Error("Error BD verificando: " + event.target.error.message); };
            request.onsuccess = (event) => {
                const turnosAbiertos = event.target.result;
                console.log("Resultado búsqueda turnos abiertos:", turnosAbiertos);
                if (turnosAbiertos && turnosAbiertos.length > 1) { console.error("Múltiples turnos!", turnosAbiertos); actualizarUIEstado(null, 'Error Múltiple'); }
                else if (turnosAbiertos && turnosAbiertos.length === 1) { turnoAbiertoActual = turnosAbiertos[0]; actualizarUIEstado(turnoAbiertoActual); }
                else { turnoAbiertoActual = null; actualizarUIEstado(null); }
            };
        } catch (error) { console.error("Error al verificar estado:", error); actualizarUIEstado(null, `Error: ${error.message}`); }
    }

    // --- Función para Actualizar la UI (CON DETALLES) ---
    function actualizarUIEstado(turnoAbierto, mensajeError = null) {
        console.log("Actualizando UI. Turno:", turnoAbierto, "Error:", mensajeError);
        if (mensajeError) {
            cajaStatusDiv.textContent = mensajeError;
            cajaStatusDiv.className = 'cerrada'; // Estilo de error/cerrada
            btnAbrirCaja.disabled = true;
            btnCerrarCaja.disabled = true;
            return;
        }

        if (turnoAbierto) {
            // Turno ABIERTO - Mostrar Detalles
            const fechaApertura = turnoAbierto.fechaApertura ? new Date(turnoAbierto.fechaApertura).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : 'Fecha Inválida';
            const saldoInicial = typeof turnoAbierto.saldoInicial === 'number' ? turnoAbierto.saldoInicial.toLocaleString('es-CO') : 'N/A';
            const usuarioApertura = turnoAbierto.usuarioApertura || 'Desconocido';
            // Usar innerHTML para el formato con <br> y <strong>
            cajaStatusDiv.innerHTML = `Caja <strong>ABIERTA</strong> por <strong>${usuarioApertura}</strong><br>(${fechaApertura})<br>Saldo Inicial: $${saldoInicial}`;
            cajaStatusDiv.className = 'abierta'; // Clase para estilo verde
            btnAbrirCaja.disabled = true;
            btnCerrarCaja.disabled = false; // Habilitar cerrar
        } else {
            // Turno CERRADO
            turnoAbiertoActual = null;
            cajaStatusDiv.textContent = 'Caja CERRADA';
            cajaStatusDiv.className = 'cerrada'; // Clase para estilo rojo/gris
            btnAbrirCaja.disabled = false; // Habilitar abrir
            btnCerrarCaja.disabled = true;
        }
    }


    // --- Listener para el Botón Abrir Caja ---
    btnAbrirCaja.addEventListener('click', async () => {
         if (!currentUser || !db) { Swal.fire('Error','Usuario o BD no disponible','error'); return; }
         const { value: saldoInput } = await Swal.fire({
             title: 'Abrir Caja', input: 'number', inputLabel: 'Saldo Inicial ($)', inputPlaceholder: 'Ej: 50000',
             inputAttributes: { min: 0, step: 1 }, showCancelButton: true, confirmButtonText: 'Abrir Caja', cancelButtonText: 'Cancelar',
             inputValidator: (value) => { if (value === null || value === '' || value < 0 || isNaN(parseFloat(value))) { return 'Ingrese saldo válido (>= 0)!'; } }
         });
         if (saldoInput !== undefined && saldoInput !== null) {
              const saldoInicial = parseFloat(saldoInput);
              // Usar la estructura de datos consistente que definimos
              const nuevoTurno = {
                  fechaApertura: new Date(), // Guardar como objeto Date
                  usuarioApertura: currentUser.username,
                  saldoInicial: saldoInicial,
                  estado: 'abierta',
                  fechaCierre: null, usuarioCierre: null,
                  saldoFinalCalculado: null, saldoFinalReal: null,
                  totalVentas: null, totalEgresos: null, diferencia: null
               };
              try {
                  const transaction = db.transaction([CAJA_STORE_NAME], 'readwrite');
                  const store = transaction.objectStore(CAJA_STORE_NAME);
                  const request = store.add(nuevoTurno);
                  request.onerror = (e) => Swal.fire('Error',`BD Error Add: ${e.target.error.message}`,'error');
                  request.onsuccess = (e) => { Swal.fire({icon:'success',title:'Caja Abierta!',timer:2000, showConfirmButton: false}); verificarEstadoCaja(); };
              } catch(e) { Swal.fire('Error','Error inesperado al guardar turno','error'); }
         } else { console.log("Apertura cancelada."); }
    });


    // --- Listener para el Botón Cerrar Caja (CON CÁLCULOS) ---
    btnCerrarCaja.addEventListener('click', async () => {
        if (!turnoAbiertoActual) { Swal.fire('Error', 'No hay caja abierta.', 'warning'); return; }
        if (!currentUser || !db) { Swal.fire('Error', 'Usuario o BD no disponible.', 'error'); return; }

         // 1. Pedir Saldo Final Real
         const { value: saldoFinalInput } = await Swal.fire({
            title: 'Cerrar Caja', input: 'number', inputLabel: 'Saldo Final REAL Contado ($)', /* ... */
            inputValidator: (value) => { if (value === null || value === '' || value < 0 || isNaN(parseFloat(value))) { return 'Ingrese saldo final válido!'; } }
         });
         if (saldoFinalInput === undefined || saldoFinalInput === null) { console.log("Cierre cancelado."); return; }

         const saldoFinalReal = parseFloat(saldoFinalInput);
         const fechaCierre = new Date();
         const usuarioCierre = currentUser.username;
         const fechaApertura = new Date(turnoAbiertoActual.fechaApertura); // Es objeto Date
         const saldoInicial = turnoAbiertoActual.saldoInicial;

         // 2. Calcular Totales del Turno
         let totalVentas = 0, totalEgresos = 0, saldoFinalCalculado = 0, diferencia = 0;
         try {
             console.log(`Buscando vehículos entre ${fechaApertura.toISOString()} y ${fechaCierre.toISOString()}`);
             const vehiculosDelTurno = await getVehiculosBetweenDates(fechaApertura, fechaCierre); // Usa helper
             if (vehiculosDelTurno && vehiculosDelTurno.length > 0) {
                 totalVentas = vehiculosDelTurno.reduce((sum, v) => sum + (typeof v.precio === 'number' ? v.precio : 0), 0);
             }
             console.log(`Total Ventas: ${totalVentas}`);
             saldoFinalCalculado = saldoInicial + totalVentas - totalEgresos; // Asume egresos=0
             diferencia = saldoFinalReal - saldoFinalCalculado;
             console.log(`S.Inicial: ${saldoInicial}, S.Calc: ${saldoFinalCalculado}, S.Real: ${saldoFinalReal}, Dif: ${diferencia}`);
         } catch (error) {
              console.error("Error al calcular totales:", error);
              Swal.fire('Error', 'Error calculando ventas. Se cerrará sin totales.', 'warning');
              totalVentas = null; saldoFinalCalculado = null; diferencia = null; // Marcar como nulos si falla cálculo
         }

         // 3. Preparar Datos Actualizados
         const turnoActualizado = {
            ...turnoAbiertoActual, fechaCierre, usuarioCierre, saldoFinalReal, estado: 'cerrada',
            totalVentas, totalEgresos, saldoFinalCalculado, diferencia // Añadir calculados
         };
         console.log("Actualizando turno:", turnoActualizado);

         // 4. Actualizar en IndexedDB
         try {
            const transaction = db.transaction([CAJA_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(CAJA_STORE_NAME);
            const request = store.put(turnoActualizado); // PUT para actualizar
            request.onerror = (e) => { Swal.fire('Error', `BD Error Put: ${e.target.error.message}`, 'error'); };
            request.onsuccess = (e) => {
                 // 5. Mostrar Reporte Básico
                 const vStr = totalVentas !== null ? totalVentas.toLocaleString('es-CO') : 'Error';
                 const eStr = saldoFinalCalculado !== null ? saldoFinalCalculado.toLocaleString('es-CO') : 'Error';
                 const dStr = diferencia !== null ? diferencia.toLocaleString('es-CO') : 'Error';
                 const rStr = saldoFinalReal.toLocaleString('es-CO');
                 const iStr = saldoInicial.toLocaleString('es-CO');

                 Swal.fire({
                     icon: 'success', title: '¡Caja Cerrada!',
                     html: `Cerrada por: <strong>${usuarioCierre}</strong><br><br>` +
                           `Saldo Inicial: $${iStr}<br>` + `Total Ventas: $${vStr}<br>` +
                           `Total Egresos: $${totalEgresos.toLocaleString('es-CO')}<br>` +
                           `Saldo Esperado: $${eStr}<br><br>` +
                           `Saldo Real Contado: <strong>$${rStr}</strong><br>` +
                           `Diferencia: <strong>$${dStr}</strong>`,
                     confirmButtonText: 'Entendido'
                 });
                 turnoAbiertoActual = null; verificarEstadoCaja(); // Actualizar UI
            };
         } catch(error) { Swal.fire('Error', 'Error inesperado al cerrar turno.', 'error'); }
    }); // Fin listener btnCerrarCaja


    // --- Llamada inicial para verificar estado al cargar ---
    verificarEstadoCaja();

}); // Fin DOMContentLoaded
