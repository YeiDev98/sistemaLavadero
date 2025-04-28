// js/main.js - Versión con Servicios Dinámicos desde IndexedDB

// Definición de precios (¡OJO! Esto ya NO se usará para calcular, solo como referencia si acaso)
const preciosObsoletos = { Auto: 35000, Camion: 50000, Moto: { soloLavada: 12000, lavadaBrillada: 15000 } };

// Array en memoria para vehículos en la sesión actual
const vehiculos = [];
// NUEVO: Variable para guardar los servicios cargados para el tipo de vehículo actual
let currentServices = [];

// --- Listener para el cambio de Tipo de Vehículo y Lógica de UI post-carga ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Mostrar información del usuario y rol (sin cambios) ---
    const userInfoSpan = document.getElementById('userInfo');
    const adminLink = document.getElementById('adminUsersLink');
    if (userInfoSpan) { try { const d=sessionStorage.getItem('loggedInUser'); if(d){const u=JSON.parse(d); userInfoSpan.textContent=`Usuario: ${u.username} (${u.role})`; if(adminLink)adminLink.style.display=(u.role==='admin')?'inline-block':'none';}else{/*...*/} } catch(e){/*...*/} }
    // --- Fin Mostrar info ---


    // --- Listener para cambio de Tipo de Vehículo (MODIFICADO) ---
    const tipoSelectListener = document.getElementById('tipo');
    const servicioVehiculoSelect = document.getElementById('servicioVehiculo'); // Referencia al nuevo select

    if (tipoSelectListener && servicioVehiculoSelect) {
        tipoSelectListener.addEventListener('change', async function () { // Convertido a async
            const selectedType = this.value;
            currentServices = []; // Limpiar servicios anteriores
            servicioVehiculoSelect.innerHTML = ''; // Limpiar opciones anteriores
            servicioVehiculoSelect.disabled = true; // Deshabilitar mientras carga

            if (!selectedType) {
                // Si no hay tipo seleccionado, poner opción por defecto y salir
                const defaultOption = document.createElement('option');
                defaultOption.value = "";
                defaultOption.textContent = "-- Primero selecciona tipo --";
                servicioVehiculoSelect.appendChild(defaultOption);
                return;
            }

            // Añadir opción "Cargando..."
             const loadingOption = document.createElement('option');
             loadingOption.value = "";
             loadingOption.textContent = "Cargando servicios...";
             servicioVehiculoSelect.appendChild(loadingOption);

            try {
                 // Esperar a que DB esté lista (si es necesario)
                 let retries = 3;
                 while (!db && retries > 0) { await new Promise(r => setTimeout(r, 200)); retries--; }
                 if (!db) throw new Error("DB no lista para cargar servicios.");

                // Llamar a la función helper para obtener servicios de ESE tipo de vehículo
                const services = await getServiciosByVehicleType(selectedType);
                currentServices = services; // Guardar servicios cargados globalmente para usarlos al agregar

                servicioVehiculoSelect.innerHTML = ''; // Limpiar "Cargando..."

                if (services && services.length > 0) {
                    // Añadir opción por defecto para seleccionar
                    const defaultSelectOption = document.createElement('option');
                    defaultSelectOption.value = "";
                    defaultSelectOption.textContent = "-- Selecciona un servicio --";
                    defaultSelectOption.disabled = true; // Hacerla no seleccionable directamente
                    defaultSelectOption.selected = true; // Pre-seleccionarla
                    servicioVehiculoSelect.appendChild(defaultSelectOption);

                    // Añadir los servicios encontrados como opciones
                    services.forEach(service => {
                        const option = document.createElement('option');
                        option.value = service.id; // Guardar el ID del servicio como valor
                        // Mostrar nombre y precio en el texto
                        option.textContent = `${service.serviceName} ($${service.price.toLocaleString('es-CO')})`;
                        // Opcional: Guardar precio en data attribute para fácil acceso
                        // option.dataset.price = service.price;
                        servicioVehiculoSelect.appendChild(option);
                    });
                    servicioVehiculoSelect.disabled = false; // Habilitar el select
                } else {
                    // No se encontraron servicios para este tipo
                    const noServiceOption = document.createElement('option');
                    noServiceOption.value = "";
                    noServiceOption.textContent = "-- No hay servicios definidos --";
                    servicioVehiculoSelect.appendChild(noServiceOption);
                    // Mantener deshabilitado
                }

            } catch (error) {
                console.error(`Error al cargar servicios para ${selectedType}:`, error);
                servicioVehiculoSelect.innerHTML = ''; // Limpiar
                const errorOption = document.createElement('option');
                errorOption.value = "";
                errorOption.textContent = "-- Error al cargar servicios --";
                servicioVehiculoSelect.appendChild(errorOption);
                // Mantener deshabilitado
                 Swal.fire('Error', `No se pudieron cargar los servicios: ${error.message || error}`, 'error');
            }
        });

        // Disparar el evento change inicialmente por si hay un valor preseleccionado
        // al cargar la página (aunque usualmente empieza en 'Auto')
         tipoSelectListener.dispatchEvent(new Event('change'));

    } else {
        console.error("Elemento 'tipo' o 'servicioVehiculo' no encontrado para el listener.");
    }

}); // Fin DOMContentLoaded


// --- Función para Agregar Vehículo (MODIFICADA) ---
function agregarVehiculo() {
    // Obtener elementos (igual que antes, pero ahora incluye servicioVehiculoSelect)
    const tipoSelect = document.getElementById('tipo');
    const marcaInput = document.getElementById('marca');
    const placaInput = document.getElementById('placa');
    const propietarioInput = document.getElementById('propietario');
    const personalInput = document.getElementById('personalAsignado');
    const servicioVehiculoSelect = document.getElementById('servicioVehiculo'); // Referencia al nuevo select

    if (!tipoSelect || !marcaInput /* ...etc... */ || !servicioVehiculoSelect ) {
        /* ... (manejo de error si faltan elementos) ... */
        return;
    }

    // Obtener valores
    const tipo = tipoSelect.value;
    const marca = marcaInput.value.trim();
    const placa = placaInput.value.trim().toUpperCase();
    const propietario = propietarioInput.value.trim();
    const personalAsignado = personalInput.value;
    const selectedServiceId = servicioVehiculoSelect.value ? parseInt(servicioVehiculoSelect.value) : null; // Obtener ID del servicio seleccionado

    // Validación campos básicos (igual que antes)
    if (!marca || !placa || !propietario || !personalAsignado) { /* ... Swal ... */ return; }

    // NUEVO: Validar que se haya seleccionado un servicio válido
    if (!selectedServiceId || isNaN(selectedServiceId)) {
         Swal.fire({ icon: 'warning', title: 'Falta Servicio', text: 'Por favor, selecciona un servicio válido.', confirmButtonColor: '#2196f3' });
         return;
    }

    // NUEVO: Obtener nombre y precio del servicio seleccionado desde el array 'currentServices'
    const selectedService = currentServices.find(s => s.id === selectedServiceId);

    if (!selectedService) {
         console.error(`No se encontró el servicio con ID ${selectedServiceId} en currentServices`, currentServices);
         Swal.fire({ icon: 'error', title: 'Error Servicio', text: 'El servicio seleccionado no es válido o no se cargó correctamente.', confirmButtonColor: '#2196f3' });
         return;
    }

    const serviceName = selectedService.serviceName;
    const price = selectedService.price; // Precio REAL desde la base de datos

    // --- ELIMINADO: Bloque try/catch que calculaba precio basado en objeto 'precios' ---

    // Crear objeto vehículo con los datos correctos
     const nuevoVehiculo = {
        tipo: tipo,
        placa: placa,
        marca: marca,
        propietario: propietario || "No registrado",
        personalAsignado: personalAsignado || "No registrado",
        // Guardamos el *nombre* del servicio y el *precio* obtenido de la BD
        serviceName: serviceName, // Nuevo campo o renombra tipoServicio si prefieres
        precio: price, // Precio obtenido de la BD
        fecha: new Date().toISOString(),
        // Nota: tipoServicio (el de moto) ya no es tan relevante, usamos serviceName general
        // Podrías eliminarlo o mantenerlo si quieres diferenciar de forma especial
        tipoServicio: tipo === 'Moto' ? serviceName : null // Ejemplo si quieres mantenerlo solo para moto
    };
    console.log("Preparando para guardar:", nuevoVehiculo);


    // Añadir a memoria y guardar en BD (igual que antes)
    vehiculos.push(nuevoVehiculo);
    mostrarVehiculos(); // Mostrar en lista actual

    addVehiculoToDB(nuevoVehiculo)
        .then(vehiculoGuardadoConId => {
            console.log(`Vehículo guardado en DB ID: ${vehiculoGuardadoConId.id}`);
            const index = vehiculos.findIndex(v => v === nuevoVehiculo);
            if (index > -1) { vehiculos[index] = vehiculoGuardadoConId; }

            Swal.fire({ icon: 'success', title: '¡Vehículo Agregado!', text: `Servicio '${serviceName}' agregado para ${tipo} ${placa}.`, showConfirmButton: false, timer: 1800 });

            // Limpiar formulario
            marcaInput.value = ''; placaInput.value = ''; propietarioInput.value = '';
            personalInput.selectedIndex = 0;
            // Resetear selects y disparar evento para recargar servicios
            tipoSelect.value = 'Auto'; // O el valor por defecto que prefieras
            tipoSelect.dispatchEvent(new Event('change', { bubbles: true }));
            // Limpiar manualmente el select de servicio por si acaso
            servicioVehiculoSelect.innerHTML = '<option value="">-- Primero selecciona tipo --</option>';
            servicioVehiculoSelect.disabled = true;

        })
        .catch(error => {
            console.error("Error al guardar en BD:", error);
            Swal.fire({ icon: 'error', title: 'Error al Guardar BD', text: 'No se pudo guardar: ' + error.message });
            // Quitar de memoria si falla guardado BD
            const indexToRemove = vehiculos.findIndex(v => v === nuevoVehiculo);
            if (indexToRemove > -1) { vehiculos.splice(indexToRemove, 1); }
            mostrarVehiculos(); // Refrescar lista sin el vehículo fallido
            // Considerar si limpiar formulario aquí también
        });
} // Fin agregarVehiculo


// --- Función para Mostrar Vehículos (MODIFICADA para usar serviceName) ---
function mostrarVehiculos() {
    const contenedor = document.getElementById('listaVehiculos');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    vehiculos.forEach((v, i) => {
        const div = document.createElement('div');
        div.className = 'vehiculo';

        // Usar los datos guardados directamente (serviceName y precio)
        // Ya no necesitamos el objeto 'precios' global aquí
        const servicioMostrado = v.serviceName || 'N/A'; // Usar el nombre guardado
        const precioMostrado = typeof v.precio === 'number' ? v.precio.toLocaleString('es-CO') : 'N/A'; // Usar el precio guardado

        div.innerHTML = `
            <strong>${v.tipo || 'N/A'}</strong> | Marca: ${v.marca || 'N/A'} | Placa: ${v.placa || 'N/A'}<br>
            Propietario: ${v.propietario || 'N/A'} | Personal: ${v.personalAsignado || 'N/A'}<br>
            Servicio: ${servicioMostrado} - <strong>$${precioMostrado}</strong><br> 
            <button onclick="imprimirFactura(${i})">Factura</button>
        `;
        contenedor.appendChild(div);
    });
}


// --- Función para Imprimir Factura (MODIFICADA para usar serviceName) ---
function imprimirFactura(index) {
    if (index < 0 || index >= vehiculos.length) { Swal.fire('Error', 'Índice inválido.', 'error'); return; }
    const v = vehiculos[index];
    if (!v || typeof v !== 'object') { Swal.fire('Error', 'Datos inválidos.', 'error'); return; }
    const win = window.open('', '', 'width=800,height=600');
    if (!win) { Swal.fire('Error', 'Ventana bloqueada.', 'warning'); return; }

    // Usar los datos guardados directamente del objeto vehículo 'v'
    const servicio = v.serviceName || 'Servicio no especificado'; // Usar nombre guardado
    const precio = typeof v.precio === 'number' ? v.precio : 0; // Usar precio guardado
    const precioFormateado = precio.toLocaleString('es-CO');
    const fechaFormateada = v.fecha ? new Date(v.fecha).toLocaleString('es-CO',{dateStyle:'long',timeStyle:'short'}) : 'N/A';

    // --- HTML de la factura (sin cambios en la estructura) ---
    // Solo asegúrate que el CSS esté pegado dentro de <style>
    win.document.write(`
      <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Factura Lavadero - Placa ${v.placa || 'N/A'}</title>
      <style>
                /* ===== INICIO CSS FACTURA ===== */
        /* Estilos para la Factura Imprimible */
        
        /* Variables (opcional, puedes usar colores directos) */
        :root {
          --azul-factura: #1976d2;
          --gris-texto: #333;
          --gris-claro-fondo: #f8f8f8; /* Un gris muy claro para alternar filas si se usa tabla */
          --borde-color: #ccc; /* Borde un poco más visible */
        }
        
        html {
            box-sizing: border-box;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #fff; /* Fondo blanco esencial para impresión */
          color: var(--gris-texto);
          line-height: 1.5; /* Espaciado de línea legible */
          font-size: 10pt; /* Tamaño base para impresión */
        }
        
        /* Contenedor principal de la factura */
        .invoice-box {
          max-width: 750px; /* Ancho bueno para A4 */
          margin: 15px auto; /* Margen para visualización en pantalla */
          padding: 25px;
          border: 1px solid var(--borde-color);
          background-color: #fff;
        }
        
        /* Cabecera: Logo y Datos del Lavadero */
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 25px;
          padding-bottom: 10px;
          border-bottom: 2px solid var(--azul-factura); /* Línea azul bajo cabecera */
        }
        
        .invoice-header .logo {
          font-size: 1.6rem; /* Ajusta según necesidad */
          font-weight: bold;
          color: var(--azul-factura);
          /* Estilos para futura imagen: max-width: 150px; */
        }
        
        .invoice-header .company-details {
          text-align: right;
          font-size: 0.85rem;
          color: #555;
        }
        .invoice-header .company-details strong {
            display: block;
            font-size: 0.95rem;
            color: #333;
            margin-bottom: 3px;
        }
        
        /* Separador (usado entre secciones) */
        .separator {
          border: none;
          border-top: 1px dashed var(--borde-color); /* Línea punteada */
          margin: 20px 0;
        }
        
        /* Sección de Detalles (Cliente y Servicio) */
        .details-section {
          display: flex;
          justify-content: space-between;
          gap: 30px; /* Espacio entre las dos columnas */
          margin-bottom: 20px;
        }
        
        .client-details,
        .service-details {
          flex: 1; /* Ocupa mitad del espacio disponible */
        }
        
        .details-section h2 {
          font-size: 1rem; /* Tamaño más discreto para subtítulos */
          color: var(--azul-factura);
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
          margin-top: 0;
          margin-bottom: 10px;
          font-weight: 600;
        }
        
        .details-section p {
          margin: 4px 0;
          font-size: 0.9rem; /* Tamaño legible */
        }
        
        .details-section p strong {
          display: inline-block; /* Permite dar ancho si es necesario */
          /* min-width: 90px; /* Descomenta y ajusta si quieres alinear los ':' */
          font-weight: 600; /* Resaltar etiquetas */
          color: #000;
        }
        
        /* Sección del Total */
        .invoice-total {
          text-align: right;
          margin-top: 25px;
          padding-top: 15px;
          border-top: 2px solid var(--azul-factura); /* Línea azul sobre total */
        }
        
        .invoice-total p {
          margin: 0 0 5px 0;
          font-size: 0.9rem;
          font-weight: bold;
          text-transform: uppercase; /* TOTAL EN MAYÚSCULAS */
          color: #555;
        }
        
        .invoice-total span {
          font-size: 1.5rem; /* Tamaño grande para el total */
          font-weight: bold;
          color: var(--azul-factura); /* Color destacado */
        }
        
        /* Pie de página */
        .invoice-footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 10px;
          border-top: 1px solid var(--borde-color);
          font-size: 0.8rem;
          color: #888;
        }
        
        /* Estilos específicos para impresión */
        @media print {
          body {
            margin: 0;
            padding: 0;
            background-color: #fff;
            font-size: 9pt; /* Ligeramente más pequeño para imprimir */
            -webkit-print-color-adjust: exact; /* Fuerza impresión de colores/fondos en Chrome/Safari */
            print-color-adjust: exact; /* Estándar */
          }
          .invoice-box {
            max-width: 100%;
            margin: 0;
            padding: 10px; /* Menos padding al imprimir */
            border: none;
            box-shadow: none;
          }
          /* Ocultar elementos no necesarios para impresión (ej: botones si los hubiera) */
          /* .no-print { display: none; } */
        
           /* Asegurar que los fondos se impriman (si los hubiera y fueran necesarios) */
           /* Si usas colores de fondo en secciones, puede que necesites forzarlos */
        
           a[href]:after { /* Evitar que se muestren las URLs de los enlaces */
               content: none !important;
           }
        }
        
        /* Ajustes responsivos para pantalla (si se ve en pantalla antes de imprimir) */
        @media (max-width: 600px) {
          .invoice-box {
              margin: 10px;
              padding: 15px;
          }
          .details-section {
              flex-direction: column; /* Apilar detalles en pantallas pequeñas */
              gap: 15px;
          }
          .invoice-header {
             flex-direction: column;
             align-items: flex-start; /* Alinear a la izquierda en móvil */
             gap: 10px;
             text-align: left;
          }
          .invoice-header .company-details {
             text-align: left;
          }
           .invoice-total {
              text-align: left; /* Alinear total a la izquierda en móvil */
           }
           .invoice-total span {
               font-size: 1.3rem;
           }
        }
        
        /* ===== FIN CSS FACTURA ===== */

      </style>
    </head>
    <body>
      <div class="invoice-box">
         <header class="invoice-header"> <div class="logo">LOGO</div> <div class="company-details"><strong>Lavadero XYZ</strong><br>Dir...<br>Tel...</div> </header>
         <hr class="separator">
         <section class="details-section">
            <div class="client-details"><h2>Datos Cliente/Vehículo</h2><p><strong>Propietario:</strong> ${v.propietario || 'N/A'}</p><p><strong>Placa:</strong> ${v.placa || 'N/A'}</p><p><strong>Tipo:</strong> ${v.tipo || 'N/A'}</p><p><strong>Marca:</strong> ${v.marca || 'N/A'}</p></div>
            <div class="service-details"><h2>Detalles Servicio</h2><p><strong>Fecha/Hora:</strong> ${fechaFormateada}</p><p><strong>Servicio:</strong> ${servicio}</p><p><strong>Personal:</strong> ${v.personalAsignado || 'N/A'}</p></div>
         </section>
         <hr class="separator">
         <section class="invoice-total"><p>Total a Pagar:</p><span>$${precioFormateado}</span></section> <footer class="invoice-footer"><p>¡Gracias!</p></footer>
      </div>
      <script> setTimeout(() => { window.print(); }, 500); <\/script>
    </body>
    </html>
    `);
    win.document.close();
}
// --- Fin del Script main.js ---

