// ===================================
// VARIABLES GLOBALES
// ===================================
let registrosGlobal = [];
let registroActualId = null;
let firestoreListener = null;

// ===================================
// INICIALIZACIÓN
// ===================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM cargado, esperando Firebase...');
  
  // Esperar a que Firebase esté listo mediante evento
  window.addEventListener('firebaseReady', () => {
    console.log('✅ Firebase detectado, iniciando aplicación...');
    inicializarApp();
  });
  
  // Verificación alternativa por si el evento ya fue disparado
  const checkFirebase = setInterval(() => {
    if (window.firebaseDB) {
      console.log('✅ Firebase detectado (polling), iniciando aplicación...');
      clearInterval(checkFirebase);
      window.removeEventListener('firebaseReady', inicializarApp);
      inicializarApp();
    }
  }, 100);
  
  // Timeout de seguridad
  setTimeout(() => {
    if (!window.firebaseDB) {
      console.error('❌ Firebase no se cargó después de 10 segundos');
      clearInterval(checkFirebase);
      mostrarError('No se pudo conectar a Firebase. Por favor, recarga la página.');
      ocultarPantallaCarga();
    }
  }, 10000);
});

function inicializarApp() {
  console.log('🚀 Inicializando aplicación...');
  configurarEventListeners();
  cargarRegistros();
  console.log('✅ Aplicación inicializada');
}

// ===================================
// CONFIGURAR EVENT LISTENERS
// ===================================
function configurarEventListeners() {
  // Buscador
  document.getElementById('buscadorRegistros')?.addEventListener('input', filtrarRegistros);
  
  // Filtros
  document.getElementById('filtroCategoria')?.addEventListener('change', filtrarRegistros);
  document.getElementById('filtroTipoPago')?.addEventListener('change', filtrarRegistros);
  document.getElementById('filtroConcepto')?.addEventListener('change', filtrarRegistros);
  document.getElementById('fechaDesde')?.addEventListener('change', filtrarRegistros);
  document.getElementById('fechaHasta')?.addEventListener('change', filtrarRegistros);
  
  // Botón limpiar filtros
  document.getElementById('btnLimpiarFiltros')?.addEventListener('click', limpiarFiltros);
  
  // Botón exportar PDF
  document.getElementById('btnExportarPDF')?.addEventListener('click', exportarAPDF);
  
  // Modal
  document.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', cerrarModal);
  });
  
  // Tabs del modal
  document.querySelectorAll('.registro-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => cambiarTab(e.currentTarget.dataset.tab));
  });
  
  // Acciones del modal
  document.getElementById('btnAprobar')?.addEventListener('click', () => cambiarEstado('aprobado'));
  document.getElementById('btnRechazar')?.addEventListener('click', () => cambiarEstado('rechazado'));
  document.getElementById('btnEliminar')?.addEventListener('click', eliminarRegistro);
}

// ===================================
// CARGAR REGISTROS DESDE FIREBASE
// ===================================
function cargarRegistros() {
  try {
    console.log('📡 Iniciando carga de registros...');
    
    const registrosRef = window.firebaseCollection(window.firebaseDB, 'registros');
    const q = window.firebaseQuery(registrosRef, window.firebaseOrderBy('fechaRegistro', 'desc'));
    
    // Usar onSnapshot para tiempo real
    firestoreListener = window.firebaseOnSnapshot(q, (querySnapshot) => {
      console.log('📊 Snapshot recibido, procesando datos...');
      registrosGlobal = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        registrosGlobal.push({
          id: doc.id,
          ...data
        });
      });
      
      console.log(`✅ ${registrosGlobal.length} registros cargados`);
      
      // Mostrar datos en consola para debug
      if (registrosGlobal.length > 0) {
        console.log('📝 Primer registro:', registrosGlobal[0]);
      } else {
        console.warn('⚠️ No se encontraron registros en la colección');
      }
      
      actualizarEstadisticas();
      renderizarTabla(registrosGlobal);
      
      // Ocultar pantalla de carga solo la primera vez
      ocultarPantallaCarga();
      
    }, (error) => {
      console.error('❌ Error al cargar registros:', error);
      mostrarError(`Error al cargar registros: ${error.message}`);
      ocultarPantallaCarga();
    });
    
  } catch (error) {
    console.error('❌ Error al configurar listener:', error);
    mostrarError('Error al cargar registros. Verifica la configuración de Firebase.');
    ocultarPantallaCarga();
  }
}

// ===================================
// ACTUALIZAR ESTADÍSTICAS
// ===================================
function actualizarEstadisticas() {
  const totalRegistros = registrosGlobal.length;
  
  // Calcular total en efectivo
  const totalEfectivo = registrosGlobal
    .filter(r => r.tipoPago === 'Efectivo')
    .reduce((sum, r) => sum + (parseFloat(r.monto) || 0), 0);
  
  // Calcular total en transferencias
  const totalTransferencias = registrosGlobal
    .filter(r => r.tipoPago === 'Transferencia')
    .reduce((sum, r) => sum + (parseFloat(r.monto) || 0), 0);
  
  // Contar pendientes
  const totalPendientes = registrosGlobal.filter(r => r.estado === 'pendiente').length;
  
  // Actualizar el DOM
  document.getElementById('totalRegistros').textContent = totalRegistros;
  document.getElementById('totalEfectivo').textContent = formatearMoneda(totalEfectivo);
  document.getElementById('totalTransferencias').textContent = formatearMoneda(totalTransferencias);
  document.getElementById('totalPendientes').textContent = totalPendientes;
  
  console.log('📈 Estadísticas actualizadas:', { 
    totalRegistros, 
    totalEfectivo, 
    totalTransferencias, 
    totalPendientes 
  });
}

// ===================================
// RENDERIZAR TABLA
// ===================================
function renderizarTabla(registros) {
  const tbody = document.getElementById('registrosTabla');
  const countElement = document.getElementById('registrosCount');
  
  if (!tbody || !countElement) {
    console.error('❌ Elementos de tabla no encontrados');
    return;
  }
  
  if (registros.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="9" class="no-registros">No se encontraron registros</td></tr>
    `;
    countElement.textContent = 'No hay registros para mostrar';
    return;
  }
  
  countElement.textContent = `Mostrando ${registros.length} registro${registros.length !== 1 ? 's' : ''}`;
  
  tbody.innerHTML = registros.map(registro => {
    console.log('Procesando registro:', registro); // Debug
    
    // Obtener la fecha desde fechaPago
    let fechaMostrar = registro.fechaPago || 'N/A';
    
    // Obtener el nombre completo
    const nombre = registro.nombreCompleto || 'N/A';
    
    // Obtener el concepto
    const concepto = registro.conceptoPago || 'N/A';
    
    // Obtener categoría
    const categoria = registro.categoria || 'Sin categoría';
    
    // Tipo de pago - CORREGIDO
    const tipoPago = registro.tipoPago || 'N/A';
    
    // Folio del comprobante
    const folio = registro.folioComprobante || 'N/A';
    
    // Estado
    const estado = registro.estado || 'pendiente';
    
    return `
      <tr>
        <td data-label="Fecha">${fechaMostrar}</td>
        <td data-label="Nombre">${nombre}</td>
        <td data-label="Categoría">${categoria}</td>
        <td data-label="Concepto">${concepto}</td>
        <td data-label="Monto">${formatearMoneda(registro.monto)}</td>
        <td data-label="Tipo Pago">${tipoPago}</td>
        <td data-label="Folio">${folio}</td>
        <td data-label="Estado"><span class="estado-badge ${estado}">${estado}</span></td>
        <td data-label="Acciones">
          <button class="btn-ver" onclick="abrirModal('${registro.id}')">Ver Detalle</button>
        </td>
      </tr>
    `;
  }).join('');
  
  console.log(`✅ Tabla renderizada con ${registros.length} registros`);
}

// ===================================
// FILTRAR REGISTROS
// ===================================
function filtrarRegistros() {
  const busqueda = document.getElementById('buscadorRegistros')?.value.toLowerCase() || '';
  const categoria = document.getElementById('filtroCategoria')?.value || '';
  const tipoPago = document.getElementById('filtroTipoPago')?.value || '';
  const concepto = document.getElementById('filtroConcepto')?.value || '';
  const fechaDesde = document.getElementById('fechaDesde')?.value || '';
  const fechaHasta = document.getElementById('fechaHasta')?.value || '';
  
  let registrosFiltrados = registrosGlobal.filter(registro => {
    // Filtro de búsqueda
    const coincideBusqueda = busqueda === '' || 
      (registro.nombreCompleto?.toLowerCase().includes(busqueda)) ||
      (registro.folioComprobante?.toLowerCase().includes(busqueda));
    
    // Filtro de categoría
    const coincideCategoria = categoria === '' || registro.categoria === categoria;
    
    // Filtro de tipo de pago
    const coincideTipoPago = tipoPago === '' || registro.tipoPago === tipoPago;
    
    // Filtro de concepto
    const coincideConcepto = concepto === '' || registro.conceptoPago === concepto;
    
    // Filtro de fecha
    let coincideFecha = true;
    if (fechaDesde || fechaHasta) {
      const fechaRegistro = registro.fechaPago;
      if (fechaDesde && fechaRegistro < fechaDesde) coincideFecha = false;
      if (fechaHasta && fechaRegistro > fechaHasta) coincideFecha = false;
    }
    
    return coincideBusqueda && coincideCategoria && coincideTipoPago && coincideConcepto && coincideFecha;
  });
  
  renderizarTabla(registrosFiltrados);
  
  // Actualizar estadísticas con registros filtrados
  actualizarEstadisticasFiltradas(registrosFiltrados);
}

// ===================================
// ACTUALIZAR ESTADÍSTICAS FILTRADAS
// ===================================
function actualizarEstadisticasFiltradas(registros) {
  const totalRegistros = registros.length;
  
  const totalEfectivo = registros
    .filter(r => r.tipoPago === 'Efectivo')
    .reduce((sum, r) => sum + (parseFloat(r.monto) || 0), 0);
  
  const totalTransferencias = registros
    .filter(r => r.tipoPago === 'Transferencia')
    .reduce((sum, r) => sum + (parseFloat(r.monto) || 0), 0);
  
  const totalPendientes = registros.filter(r => r.estado === 'pendiente').length;
  
  document.getElementById('totalRegistros').textContent = totalRegistros;
  document.getElementById('totalEfectivo').textContent = formatearMoneda(totalEfectivo);
  document.getElementById('totalTransferencias').textContent = formatearMoneda(totalTransferencias);
  document.getElementById('totalPendientes').textContent = totalPendientes;
}

// ===================================
// LIMPIAR FILTROS
// ===================================
function limpiarFiltros() {
  document.getElementById('buscadorRegistros').value = '';
  document.getElementById('filtroCategoria').value = '';
  document.getElementById('filtroTipoPago').value = '';
  document.getElementById('filtroConcepto').value = '';
  document.getElementById('fechaDesde').value = '';
  document.getElementById('fechaHasta').value = '';
  
  actualizarEstadisticas();
  renderizarTabla(registrosGlobal);
}

// ===================================
// MODAL
// ===================================
function abrirModal(id) {
  registroActualId = id;
  const registro = registrosGlobal.find(r => r.id === id);
  
  if (!registro) {
    console.error('Registro no encontrado:', id);
    return;
  }
  
  // Actualizar título y estado
  document.getElementById('registroModalTitulo').textContent = `Registro de ${registro.nombreCompleto || 'Sin nombre'}`;
  
  const estadoBadge = document.getElementById('registroEstadoBadge');
  estadoBadge.textContent = registro.estado || 'Pendiente';
  estadoBadge.className = `estado-badge ${registro.estado || 'pendiente'}`;
  
  // Llenar datos
  const datosGrid = document.getElementById('registroDatosGrid');
  datosGrid.innerHTML = `
    <div class="dato-item">
      <div class="dato-label">Nombre Completo</div>
      <div class="dato-valor">${registro.nombreCompleto || 'N/A'}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Concepto</div>
      <div class="dato-valor">${registro.conceptoPago || 'N/A'}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Monto</div>
      <div class="dato-valor">${formatearMoneda(registro.monto)}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Tipo de Pago</div>
      <div class="dato-valor">${registro.tipoPago || 'N/A'}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Fecha de Pago</div>
      <div class="dato-valor">${registro.fechaPago || 'N/A'}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Fecha Asignada</div>
      <div class="dato-valor">${registro.fechaAsignada || 'N/A'}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Folio Comprobante</div>
      <div class="dato-valor">${registro.folioComprobante || 'N/A'}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Contacto</div>
      <div class="dato-valor">${registro.contacto || 'N/A'}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Categoría</div>
      <div class="dato-valor">${registro.categoria || 'Sin categoría'}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Ciudad</div>
      <div class="dato-valor">${registro.ciudad || 'N/A'}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Recibió</div>
      <div class="dato-valor">${registro.recibio || 'N/A'}</div>
    </div>
    <div class="dato-item">
      <div class="dato-label">Estado</div>
      <div class="dato-valor">${registro.estado || 'Pendiente'}</div>
    </div>
  `;
  
  // Mostrar el modal
  document.getElementById('registroModal').setAttribute('aria-hidden', 'false');
}

function cerrarModal() {
  document.getElementById('registroModal').setAttribute('aria-hidden', 'true');
  registroActualId = null;
}

function cambiarTab(tabName) {
  // Actualizar botones
  document.querySelectorAll('.registro-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  // Actualizar contenido
  document.querySelectorAll('.registro-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ===================================
// CAMBIAR ESTADO
// ===================================
async function cambiarEstado(nuevoEstado) {
  if (!registroActualId) return;
  
  try {
    const docRef = window.firebaseDoc(window.firebaseDB, 'registros', registroActualId);
    await window.firebaseUpdateDoc(docRef, {
      estado: nuevoEstado
    });
    
    alert(`Estado cambiado a: ${nuevoEstado}`);
    cerrarModal();
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    alert('Error al cambiar el estado');
  }
}

// ===================================
// ELIMINAR REGISTRO
// ===================================
async function eliminarRegistro() {
  if (!registroActualId) return;
  
  if (!confirm('¿Estás seguro de eliminar este registro?')) return;
  
  try {
    const docRef = window.firebaseDoc(window.firebaseDB, 'registros', registroActualId);
    await window.firebaseDeleteDoc(docRef);
    
    alert('Registro eliminado');
    cerrarModal();
  } catch (error) {
    console.error('Error al eliminar:', error);
    alert('Error al eliminar el registro');
  }
}

// ===================================
// EXPORTAR A PDF
// ===================================
async function exportarAPDF() {
  alert('Función de exportar PDF - En desarrollo');
}

// ===================================
// UTILIDADES
// ===================================
function formatearMoneda(monto) {
  const numero = parseFloat(monto) || 0;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(numero);
}

function mostrarError(mensaje) {
  const tbody = document.getElementById('registrosTabla');
  if (tbody) {
    tbody.innerHTML = `
      <tr><td colspan="9" class="no-registros">${mensaje}</td></tr>
    `;
  }
}

function ocultarPantallaCarga() {
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
    }, 500);
  }
}

// Hacer funciones disponibles globalmente
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;