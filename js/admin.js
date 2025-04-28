// js/admin.js - Gestión de Usuarios y Servicios (Versión Limpia)

document.addEventListener('DOMContentLoaded', () => {

    // --- Verificar Rol de Admin ---
    let isAdmin = false; let loggedInUsername = null;
    try { const dS=sessionStorage.getItem('loggedInUser'); if(dS){ const u=JSON.parse(dS); loggedInUsername=u.username; if(u.role==='admin'){isAdmin=true;/*...*/ const ui=document.getElementById('userInfo'); if(ui) ui.textContent=`Admin: ${u.username}`; const al=document.getElementById('adminUsersLink'); if(al) al.style.display='inline-block'; }} } catch(e){console.error("Error verificando rol:", e);}
    if (!isAdmin) { const c=document.querySelector('.admin-container'); if(c){c.innerHTML='<h1>Acceso Denegado</h1><p>Permisos insuficientes.</p><a href="index.html">Inicio</a>';} return; }
    // --- Fin Verificación Rol ---


    // --- Referencias a Elementos ---
    // Usuarios
    const addUserForm = document.getElementById('addUserForm'); const newUsernameInput=document.getElementById('newUsername'); const newPasswordInput=document.getElementById('newPassword'); const newRoleSelect=document.getElementById('newRole'); const addUserMessage=document.getElementById('addUserMessage'); const userListContainer=document.getElementById('userListContainer');
    // Servicios
    const addServiceForm = document.getElementById('addServiceForm'); const serviceVehicleTypeSelect=document.getElementById('serviceVehicleType'); const serviceNameInput=document.getElementById('serviceName'); const servicePriceInput=document.getElementById('servicePrice'); const addServiceMessage=document.getElementById('addServiceMessage'); const serviceListContainer=document.getElementById('serviceListContainer');

    if (!addUserForm || !userListContainer || !addServiceForm || !serviceListContainer) { console.error('Error: Faltan elementos DOM.'); return; }

    // --- Lógica para Agregar Usuario ---
    addUserForm.addEventListener('submit', (event) => {
        event.preventDefault(); showUserMessage('', '');
        const u=newUsernameInput.value.trim(), p=newPasswordInput.value.trim(), r=newRoleSelect.value;
        if(!u||!p||!r){showUserMessage('Complete campos usuario.','error'); return;} if(p.length<6){showUserMessage('Passw mín 6 chars.','error'); return;} if(!db){showUserMessage('Error DB.','error'); return;}
        try{const tx=db.transaction([USER_STORE_NAME],'readwrite'), st=tx.objectStore(USER_STORE_NAME), getReq=st.get(u); getReq.onerror=e=>{showUserMessage('Error verificando.','error'); console.error(e.target.error);}; getReq.onsuccess=e=>{if(e.target.result){showUserMessage(`Usuario '${u}' ya existe.`,'error');}else{const nu={username:u,password:p,role:r},addReq=st.add(nu); addReq.onsuccess=()=>{showUserMessage(`Usuario '${u}' agregado.`,'success');addUserForm.reset();displayUsers();}; addReq.onerror=e=>{showUserMessage(`Error guardando. (${e.target.error.name})`,'error'); console.error(e.target.error);};}}; tx.onerror=e=>{showUserMessage('Error general DB.','error'); console.error(e.target.error);};}catch(err){showUserMessage('Error inesperado.','error'); console.error(err);}
    });

    // --- Función para Mostrar Lista de Usuarios ---
    async function displayUsers() {
       if (!userListContainer) return; userListContainer.innerHTML = ''; // Limpiar antes
       try {
           const users = await getAllUsers();
           if (!users || users.length === 0) { userListContainer.innerHTML = '<p>No hay usuarios registrados.</p>'; return; }
           const ul = document.createElement('ul');
           users.forEach(u => { /* ... (crear li, info, actions, botones edit/delete como antes) ... */
                const li=document.createElement('li'), info=document.createElement('span'), actions=document.createElement('span'), editBtn=document.createElement('button'), delBtn=document.createElement('button'); info.className='item-info'; info.textContent=`Usuario: ${u.username} - Rol: ${u.role}`; actions.className='item-actions'; editBtn.textContent='Editar'; editBtn.className='edit-btn'; editBtn.dataset.username=u.username; if(u.username===loggedInUsername) editBtn.disabled=true; delBtn.textContent='Eliminar'; delBtn.className='delete-btn'; delBtn.dataset.username=u.username; if(u.username===loggedInUsername) delBtn.disabled=true; actions.appendChild(editBtn); actions.appendChild(delBtn); li.appendChild(info); li.appendChild(actions); ul.appendChild(li);
           });
           userListContainer.appendChild(ul);
       } catch (error) { console.error("Error al mostrar usuarios:", error); userListContainer.innerHTML = `<p class="message error">Error: ${error.message}</p>`; }
    }

    // --- Listeners para botones Editar/Eliminar Usuario ---
     userListContainer.addEventListener('click', async (event) => {
        const target = event.target;
         if (target.classList.contains('edit-btn')) {
             const usernameToEdit = target.dataset.username;
             alert(`Funcionalidad EDITAR para '${usernameToEdit}' (no implementada).`);
         } else if (target.classList.contains('delete-btn')) {
             const usernameToDelete = target.dataset.username;
             if (!usernameToDelete) return;
             if (usernameToDelete === loggedInUsername) { Swal.fire('No permitido', 'No puedes eliminar tu propia cuenta.', 'warning'); return; }
             const result = await Swal.fire({ title: '¿Estás seguro?', text: `Eliminar usuario '${usernameToDelete}'? No se puede deshacer.`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonText: 'Cancelar', confirmButtonText: 'Sí, Eliminar' });
             if (result.isConfirmed) {
                 try { await deleteUser(usernameToDelete); await Swal.fire('Eliminado', `Usuario '${usernameToDelete}' eliminado.`, 'success'); displayUsers(); }
                 catch (error) { console.error(`Error al eliminar ${usernameToDelete}:`, error); Swal.fire( 'Error', `No se pudo eliminar: ${error.message || error}`, 'error'); }
             }
         }
     });

    // --- Función Auxiliar Mensajes de Usuario ---
    function showUserMessage(text, type) { if(!addUserMessage) return; addUserMessage.textContent=text; addUserMessage.className=`message ${type}`; addUserMessage.style.display=text?'block':'none';}


    // --- Lógica para Agregar Servicios ---
    addServiceForm.addEventListener('submit', async (event) => {
        event.preventDefault(); showServiceMessage('', '');
        const vehicleType=serviceVehicleTypeSelect.value, serviceName=serviceNameInput.value.trim(), priceString=servicePriceInput.value.trim(), price=parseFloat(priceString);
        if (!vehicleType||!serviceName||!priceString){ showServiceMessage('Complete campos servicio.','error'); return; } if (isNaN(price)||price<0){ showServiceMessage('Precio inválido.','error'); return; } if (!db){ showServiceMessage('Error DB.','error'); return; }
        const newServiceData = { vehicleType, serviceName, price };
         try { await addServicio(newServiceData); showServiceMessage(`Servicio '${serviceName}' agregado.`, 'success'); addServiceForm.reset(); displayServices(); }
         catch (error) { console.error("Error agregando servicio:", error); showServiceMessage(`Error: ${error.message || error}`, 'error'); }
    });

    // --- Función para Mostrar Lista de Servicios ---
    async function displayServices() {
        if (!serviceListContainer) return; serviceListContainer.innerHTML = ''; // Limpiar
        try {
            const services = await getAllServicios();
            if (!services || services.length === 0) { serviceListContainer.innerHTML = '<p>No hay servicios definidos.</p>'; return; }
            const ul = document.createElement('ul');
            services.forEach(s => { /* ... (crear li, info, actions, botones edit(disabled)/delete como antes) ... */
                 const li=document.createElement('li'), info=document.createElement('span'), actions=document.createElement('span'), editBtn=document.createElement('button'), delBtn=document.createElement('button'); info.className='item-info'; info.innerHTML=`<span>Veh:<strong>${s.vehicleType||'N/A'}</strong></span> <span>Srv:<strong>${s.serviceName||'N/A'}</strong></span> <span>$:<strong>${(typeof s.price==='number'?s.price.toLocaleString('es-CO'):'N/A')}</strong></span>`; actions.className='item-actions'; editBtn.textContent='Editar'; editBtn.className='edit-btn edit-service-btn'; editBtn.dataset.serviceId=s.id; editBtn.disabled=true; delBtn.textContent='Eliminar'; delBtn.className='delete-btn delete-service-btn'; delBtn.dataset.serviceId=s.id; actions.appendChild(editBtn); actions.appendChild(delBtn); li.appendChild(info); li.appendChild(actions); ul.appendChild(li);
            });
            serviceListContainer.appendChild(ul);
        } catch (error) { console.error("Error al mostrar servicios:", error); serviceListContainer.innerHTML = `<p class="message error">Error: ${error.message}</p>`; }
    }

    // --- Listener para botones de Eliminar Servicio ---
    serviceListContainer.addEventListener('click', async (event) => {
         const target = event.target;
         if (target.classList.contains('delete-service-btn')) {
             const serviceId = parseInt(target.dataset.serviceId);
             if (!serviceId || isNaN(serviceId)) return;
             const result = await Swal.fire({ title: '¿Estás seguro?', text: `Eliminar servicio ID ${serviceId}?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, Eliminar', cancelButtonText: 'Cancelar' });
             if (result.isConfirmed) {
                 try { await deleteServicio(serviceId); Swal.fire('Eliminado', 'Servicio eliminado.', 'success'); displayServices(); }
                 catch (error) { console.error(`Error eliminando servicio ${serviceId}:`, error); Swal.fire( 'Error', `No se pudo eliminar: ${error.message || error}`, 'error'); }
             }
         }
     });

    // --- Función Auxiliar Mensajes de Servicio ---
    function showServiceMessage(text, type) { if(!addServiceMessage) return; addServiceMessage.textContent=text; addServiceMessage.className=`message ${type}`; addServiceMessage.style.display=text?'block':'none'; }

    // --- Llamadas iniciales al cargar la página ---
    displayUsers();
    displayServices();

}); // Fin DOMContentLoaded

