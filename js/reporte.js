// js/reporte.js - Dashboard con Gráfico (Versión Limpia)

document.addEventListener("DOMContentLoaded", async () => {
    // --- Verificar Rol de Admin y Mostrar Info Usuario ---
    let isAdmin = false; let currentUser = null; const userInfoSpan = document.getElementById('userInfo'); const adminLink = document.getElementById('adminUsersLink'); const reporteContainer = document.getElementById('reportePrincipalContainer');
    if (reporteContainer) reporteContainer.style.display = 'none'; // Ocultar hasta verificar
    try { const dS=sessionStorage.getItem('loggedInUser'); if(dS){ currentUser=JSON.parse(dS); if(userInfoSpan) userInfoSpan.textContent=`Usuario: ${currentUser.username} (${currentUser.role})`; if(currentUser.role==='admin'){isAdmin=true; if(adminLink) adminLink.style.display='inline-block';} else {if(adminLink)adminLink.style.display='none';}} else {if(userInfoSpan)userInfoSpan.textContent='No Identificado';}}catch(e){console.error('Error al mostrar datos de usuario:', e);if(userInfoSpan)userInfoSpan.textContent='Error';}
    if (!isAdmin) { if(reporteContainer){reporteContainer.innerHTML='<div class="contenedor"><h1>Acceso Denegado</h1><p>Permisos insuficientes.</p><a href="index.html"><button>Inicio</button></a></div>'; reporteContainer.style.display='block';} return; } else { if(reporteContainer) reporteContainer.style.display='block';}
    // --- Fin Verificación Rol ---


    // --- Lógica de Reportes ---
    // Referencias a elementos KPI
    const kpiVehiculosHoy = document.getElementById("kpi-vehiculos-hoy"); const ingresosDiaSpan = document.getElementById("ingresos-dia"); const kpiVehiculosTotal = document.getElementById("kpi-vehiculos-total"); const ingresosMesSpan = document.getElementById("ingresos-mes"); const ingresosAnioSpan = document.getElementById("ingresos-anio"); const kpiTotalAuto = document.getElementById("kpi-total-auto"); const kpiTotalMoto = document.getElementById("kpi-total-moto"); const kpiTotalCamion = document.getElementById("kpi-total-camion");
    const listaVehiculosHoyDiv = document.getElementById("listaVehiculosHoy");
    const tituloListaHoy = document.getElementById("tituloListaHoy");
    const ctxPie = document.getElementById('tiposVehiculoChart')?.getContext('2d');

    // Validar todos los elementos
    if (!kpiVehiculosHoy || !ingresosDiaSpan || !kpiVehiculosTotal || !kpiTotalAuto || !kpiTotalMoto || !kpiTotalCamion || !ingresosMesSpan || !ingresosAnioSpan || !listaVehiculosHoyDiv || !tituloListaHoy || !ctxPie) {
        console.error("Error: Faltan elementos del DOM para el dashboard/gráfico.");
         if (reporteContainer) reporteContainer.innerHTML = '<h1>Error</h1><p>Faltan componentes.</p>';
        return;
    }

    let registros = [];

    // --- Cargar TODOS los registros desde IndexedDB ---
    try {
        let retries = 5; while (!db && retries > 0) { await new Promise(r => setTimeout(r, 300)); retries--; } if (!db) throw new Error("DB no inicializada.");
        registros = await getAllVehiculosFromDB();
        // Log esencial que podemos dejar:
        console.log(`Registros totales cargados para reporte: ${registros.length}`);
    } catch (error) {
        console.error("Error crítico al cargar registros para reporte:", error);
        reporteContainer.innerHTML = `<h1>Error</h1><p>No se pudieron cargar datos: ${error.message}</p>`;
        return;
    }


    // --- Calcular KPIs y filtrar datos ---
    const hoyFiltro = new Date();
    const diaActual = hoyFiltro.getDate();
    const mesActual = hoyFiltro.getMonth();
    const anioActual = hoyFiltro.getFullYear();
    const fechaHoyString = hoyFiltro.toDateString();

    let totalDia = 0, totalMes = 0, totalAnio = 0;
    const vehiculosHoy = [];
    let countAuto = 0, countMoto = 0, countCamion = 0, countOtro = 0;

    registros.forEach(registro => {
        if (!registro || !registro.fecha || typeof registro.precio !== 'number') return;
        const fechaRegistro = new Date(registro.fecha);
        if (isNaN(fechaRegistro.getTime())) return;

        const precio = registro.precio;
        const fechaRegistroString = fechaRegistro.toDateString();

        // Sumas por periodo
        if (fechaRegistro.getFullYear() === anioActual) {
            totalAnio += precio;
            if (fechaRegistro.getMonth() === mesActual) {
                totalMes += precio;
                 if (fechaRegistro.getDate() === diaActual) {
                     totalDia += precio;
                 }
            }
        }
        // Filtrar vehículos de HOY
        if (fechaRegistroString === fechaHoyString) {
             vehiculosHoy.push(registro);
        }
        // Contar por tipo de vehículo
         const tipoVehiculo = registro.tipo || 'Otro';
         switch (tipoVehiculo) {
             case 'Auto': countAuto++; break;
             case 'Moto': countMoto++; break;
             case 'Camion': countCamion++; break;
             default: countOtro++; break;
         }
    });
    if(countOtro > 0) console.warn(`Se encontraron ${countOtro} vehículos de tipo desconocido/otro.`);


    // --- Actualizar KPIs en el HTML ---
    kpiVehiculosHoy.textContent = vehiculosHoy.length;
    ingresosDiaSpan.textContent = `$${totalDia.toLocaleString("es-CO")}`;
    kpiVehiculosTotal.textContent = registros.length;
    kpiTotalAuto.textContent = countAuto;
    kpiTotalMoto.textContent = countMoto;
    kpiTotalCamion.textContent = countCamion;
    ingresosMesSpan.textContent = `$${totalMes.toLocaleString("es-CO")}`;
    ingresosAnioSpan.textContent = `$${totalAnio.toLocaleString("es-CO")}`;


    // --- Renderizar Lista de Vehículos de Hoy ---
    function renderizarVehiculosHoy(lista) {
         try {
             if(!tituloListaHoy || !listaVehiculosHoyDiv) { return; } // Salir si faltan elementos

             const fechaTitulo = hoyFiltro.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric'});
             tituloListaHoy.textContent = `Vehículos Atendidos Hoy (${fechaTitulo})`;
             listaVehiculosHoyDiv.innerHTML = ''; // Limpiar

             if (!lista || lista.length === 0) {
                 listaVehiculosHoyDiv.innerHTML = '<p>No hay vehículos registrados hoy.</p>';
                 return;
             }

             const ul = document.createElement('ul');
             lista.forEach((v) => {
                 if (!v) return;
                 const li = document.createElement('li');
                 const precioStr = typeof v.precio === 'number' ? `$${v.precio.toLocaleString('es-CO')}` : 'N/A';
                 const servicioMostrado = v.serviceName || (v.tipo === 'Moto' ? (v.tipoServicio === 'lavadaBrillada' ? 'L y B' : 'Solo L') : 'Básico') || 'N/A';
                 li.innerHTML = `
                    <span><strong>Placa:</strong> ${v.placa || 'N/A'}</span>
                    <span><strong>Tipo:</strong> ${v.tipo || 'N/A'}</span>
                    <span><strong>Servicio:</strong> ${servicioMostrado}</span>
                    <span class="precio">${precioStr}</span>
                    <span><strong>Personal:</strong> ${v.personalAsignado || 'N/A'}</span>
                 `;
                 ul.appendChild(li);
             });
             listaVehiculosHoyDiv.appendChild(ul);

         } catch (renderError) {
             console.error("Error DENTRO de renderizarVehiculosHoy:", renderError);
             if(listaVehiculosHoyDiv) listaVehiculosHoyDiv.innerHTML = '<p class="message error">Error al mostrar lista de hoy.</p>';
         }
    }
    renderizarVehiculosHoy(vehiculosHoy);


    // --- Crear Gráfico de Pastel con Chart.js ---
    try {
        // Log esencial
        console.log("Creando gráfico de pastel...");
        const pieChartData = {
            labels: ['Autos', 'Motos', 'Camiones'],
            datasets: [{
                label: 'Total Atendidos', data: [countAuto, countMoto, countCamion],
                backgroundColor: [ 'rgb(255, 205, 86)', 'rgb(255, 159, 64)', 'rgb(201, 203, 207)' ],
                borderColor: '#fff', borderWidth: 1, hoverOffset: 6
            }]
        };
        const pieChartConfig = {
            type: 'pie', data: pieChartData,
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 15 } }, title: { display: false }, tooltip: { callbacks: { label: function(context) { let label = context.label || ''; if (label) { label += ': '; } if (context.parsed !== null) { const total = context.dataset.data.reduce((a, b) => a + b, 0); const value = context.parsed; const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%'; label += `${value} (${percentage})`; } return label; } } } } }
        };
        new Chart(ctxPie, pieChartConfig);
        console.log("Gráfico de pastel inicializado."); // Log esencial
    } catch(chartError) {
        console.error("Error al crear el gráfico de pastel:", chartError);
         const chartContainer = document.getElementById('tiposVehiculoChart')?.parentElement;
         if(chartContainer) chartContainer.innerHTML = "<p class='message error'>Error al generar gráfico.</p>";
    }
    // --- Fin Crear Gráfico ---

}); // Fin DOMContentLoaded

