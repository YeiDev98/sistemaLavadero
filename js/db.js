// js/db.js - v7: Añadido store 'servicios', índices y helpers (incluido deleteUser)

const DB_NAME = 'lavaderoDB';
const DB_VERSION = 7; // Mantener versión 7 o la última que funcionó
const USER_STORE_NAME = 'usuarios';
const VEHICULO_STORE_NAME = 'vehiculos';
const CAJA_STORE_NAME = 'caja';
const SERVICIO_STORE_NAME = 'servicios';

let db;

// Función para inicializar la base de datos
function initDB() {
    console.log('Iniciando conexión a IndexedDB...');
    if (!('indexedDB' in window)) { console.error('IndexedDB no soportado!'); return; }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => { console.error(`Error DB [${DB_NAME} v${DB_VERSION}]:`, event.target.error); };
    request.onsuccess = (event) => { db = event.target.result; console.log(`DB [${DB_NAME} v${DB_VERSION}] abierta.`); };

    request.onupgradeneeded = (event) => {
        console.log(`Actualizando/Creando DB a v${DB_VERSION}...`);
        const dbInstance = event.target.result;
        const transaction = event.target.transaction;

        // Store Usuarios + Admin por defecto si es nuevo
        let userStore;
        if (!dbInstance.objectStoreNames.contains(USER_STORE_NAME)) {
            userStore = dbInstance.createObjectStore(USER_STORE_NAME, { keyPath: 'username' });
            console.log(`Store "${USER_STORE_NAME}" creado.`);
            try { const adminUser={username:'admin',password:'password123',role:'admin'}; const addReq=userStore.add(adminUser); addReq.onsuccess=()=>console.log('Admin añadido en upgrade.'); addReq.onerror=(e)=>console.error('Error add admin:',e.target.error); } catch(e){ console.error('Catch add admin:', e);}
        } else { userStore = transaction.objectStore(USER_STORE_NAME); }

        // Store Vehículos + Índice Fecha
        let vehiculoStore;
        if (!dbInstance.objectStoreNames.contains(VEHICULO_STORE_NAME)) { vehiculoStore = dbInstance.createObjectStore(VEHICULO_STORE_NAME, { keyPath: 'id', autoIncrement: true }); console.log(`Store "${VEHICULO_STORE_NAME}" creado.`); }
        else { vehiculoStore = transaction.objectStore(VEHICULO_STORE_NAME); }
        if (vehiculoStore && !vehiculoStore.indexNames.contains('fechaIndex')) { vehiculoStore.createIndex('fechaIndex', 'fecha', { unique: false }); console.log(`Índice "fechaIndex" creado/verificado.`); }

        // Store Caja + Índices
        let cajaStore;
        if (!dbInstance.objectStoreNames.contains(CAJA_STORE_NAME)) { cajaStore = dbInstance.createObjectStore(CAJA_STORE_NAME, { keyPath: 'id', autoIncrement: true }); console.log(`Store "${CAJA_STORE_NAME}" creado.`); }
        else { cajaStore = transaction.objectStore(CAJA_STORE_NAME); }
        if (cajaStore && !cajaStore.indexNames.contains('estadoIndex')) { cajaStore.createIndex('estadoIndex', 'estado', { unique: false }); console.log(`Índice "estadoIndex" creado/verificado.`); }
        if (cajaStore && !cajaStore.indexNames.contains('fechaAperturaIndex')) { cajaStore.createIndex('fechaAperturaIndex', 'fechaApertura', { unique: false }); console.log(`Índice "fechaAperturaIndex" creado/verificado.`); }

        // Store Servicios + Índice Tipo Vehículo
        let servicioStore;
        if (!dbInstance.objectStoreNames.contains(SERVICIO_STORE_NAME)) { servicioStore = dbInstance.createObjectStore(SERVICIO_STORE_NAME, { keyPath: 'id', autoIncrement: true }); console.log(`Store "${SERVICIO_STORE_NAME}" creado.`); }
        else { servicioStore = transaction.objectStore(SERVICIO_STORE_NAME); }
        if (servicioStore && !servicioStore.indexNames.contains('vehicleTypeIndex')) { servicioStore.createIndex('vehicleTypeIndex', 'vehicleType', { unique: false }); console.log(`Índice "vehicleTypeIndex" creado/verificado.`); }

        console.log('onupgradeneeded completado.');
    }; // Fin onupgradeneeded

     if (request.transaction) { request.transaction.onerror = (event) => { console.error("Error general tx upgrade:", event.target.error); }; }

} // Fin initDB


// --- Helper Functions (Vehículos, Usuarios, Servicios) ---
function addVehiculoToDB(d) { return new Promise((res, rej) => { if(!db) rej(new Error("BD")); try {const tx=db.transaction([VEHICULO_STORE_NAME],'readwrite'), st=tx.objectStore(VEHICULO_STORE_NAME), dt={...d}; delete dt.id; const r=st.add(dt); r.onsuccess=e=>{d.id=e.target.result;res(d);}; r.onerror=e=>rej(new Error("ErrBD:"+e.target.error.message)); tx.onerror=e=>rej(new Error("ErrTx:"+e.target.error.message));} catch(e){rej(e);} }); }
function getAllVehiculosFromDB() { return new Promise((res, rej) => { if(!db) rej(new Error("BD")); try {const tx=db.transaction([VEHICULO_STORE_NAME],'readonly'), st=tx.objectStore(VEHICULO_STORE_NAME), r=st.getAll(); r.onsuccess=e=>res(e.target.result); r.onerror=e=>rej(new Error("ErrBD:"+e.target.error.message)); tx.onerror=e=>rej(new Error("ErrTx:"+e.target.error.message));} catch(e){rej(e);} }); }
function getVehiculosBetweenDates(sd, ed) { return new Promise((res, rej) => { if(!db) rej(new Error("BD")); if(!(sd instanceof Date)||!(ed instanceof Date)) rej(new Error("Fechas")); try {const tx=db.transaction([VEHICULO_STORE_NAME],'readonly'), st=tx.objectStore(VEHICULO_STORE_NAME); if(!st.indexNames.contains('fechaIndex')) rej(new Error("NoIdx")); const idx=st.index('fechaIndex'), range=IDBKeyRange.bound(sd.toISOString(),ed.toISOString()), r=idx.getAll(range); r.onsuccess=e=>res(e.target.result); r.onerror=e=>rej(new Error("ErrBD:"+e.target.error.message)); tx.onerror=e=>rej(new Error("ErrTx:"+e.target.error.message));} catch(e){rej(e);} }); }
function getAllUsers() { return new Promise((res, rej) => { if(!db) rej(new Error("BD")); try {const tx=db.transaction([USER_STORE_NAME],'readonly'), st=tx.objectStore(USER_STORE_NAME), r=st.getAll(); r.onsuccess=e=>res(e.target.result); r.onerror=e=>rej(new Error("ErrBD:"+e.target.error.message)); tx.onerror=e=>rej(new Error("ErrTx:"+e.target.error.message));} catch(e){rej(e);} }); }
function addServicio(d) { return new Promise((res, rej) => { if(!db) rej(new Error("BD")); if(!d||!d.vehicleType||!d.serviceName||typeof d.price!=='number'||d.price<0) rej(new Error("Datos Srv")); try {const tx=db.transaction([SERVICIO_STORE_NAME],'readwrite'), st=tx.objectStore(SERVICIO_STORE_NAME), r=st.add(d); r.onsuccess=e=>res(e.target.result); r.onerror=e=>rej(new Error("ErrBD:"+e.target.error.message)); tx.onerror=e=>rej(new Error("ErrTx:"+e.target.error.message));} catch(e){rej(e);} }); }
function getAllServicios() { return new Promise((res, rej) => { if(!db) rej(new Error("BD")); try {const tx=db.transaction([SERVICIO_STORE_NAME],'readonly'), st=tx.objectStore(SERVICIO_STORE_NAME), r=st.getAll(); r.onsuccess=e=>res(e.target.result); r.onerror=e=>rej(new Error("ErrBD:"+e.target.error.message)); tx.onerror=e=>rej(new Error("ErrTx:"+e.target.error.message));} catch(e){rej(e);} }); }
function getServiciosByVehicleType(vt) { return new Promise((res, rej) => { if(!db) rej(new Error("BD")); if(!vt) rej(new Error("NoTipo")); try {const tx=db.transaction([SERVICIO_STORE_NAME],'readonly'), st=tx.objectStore(SERVICIO_STORE_NAME); if(!st.indexNames.contains('vehicleTypeIndex')) rej(new Error("NoIdx")); const idx=st.index('vehicleTypeIndex'), r=idx.getAll(vt); r.onsuccess=e=>res(e.target.result); r.onerror=e=>rej(new Error("ErrBD:"+e.target.error.message)); tx.onerror=e=>rej(new Error("ErrTx:"+e.target.error.message));} catch(e){rej(e);} }); }

// --- NUEVA Helper Function para Eliminar Usuario ---
function deleteUser(username) {
    return new Promise((resolve, reject) => {
        if (!db) return reject(new Error("Base de datos no inicializada."));
        if (!username) return reject(new Error("Nombre de usuario no proporcionado."));
        try {
            const transaction = db.transaction([USER_STORE_NAME], 'readwrite'); // Necesita 'readwrite' para borrar
            const store = transaction.objectStore(USER_STORE_NAME);
            const request = store.delete(username); // Elimina usando la clave (username)

            request.onsuccess = () => {
                console.log(`Usuario '${username}' eliminado de IndexedDB.`);
                resolve(); // Resuelve sin valor específico en éxito
            };
            request.onerror = (event) => {
                console.error(`Error en request deleteUser (${username}):`, event.target.error);
                reject(new Error("Error al eliminar usuario de BD: " + event.target.error.message));
            };
            transaction.oncomplete = () => {
                console.log(`Transacción deleteUser (${username}) completada.`);
            };
            transaction.onerror = (event) => {
                console.error(`Error en tx deleteUser (${username}):`, event.target.error);
                reject(new Error("Error en transacción al eliminar usuario: " + event.target.error.message));
            };
        } catch (error) {
            console.error("Error al iniciar tx deleteUser:", error);
            reject(error);
        }
    });
}

// --- Fin Helpers ---

initDB(); // Llamar a la inicialización

