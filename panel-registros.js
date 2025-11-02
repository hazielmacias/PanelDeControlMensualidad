// ===================================
// VARIABLES GLOBALES
// ===================================
let registrosGlobal = [];
let registroActualId = null;
let firestoreListener = null;
let mesesSeleccionados = [];

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
  inicializarSelectorMeses();
  configurarEventListeners();
  cargarRegistros();
  console.log('✅ Aplicación inicializada');
}

// ===================================
// INICIALIZAR SELECTOR DE MESES
// ===================================
function inicializarSelectorMeses() {
  const mesesGrid = document.getElementById('mesesGrid');
  const añoActual = new Date().getFullYear();
  
  document.getElementById('añoActual').textContent = añoActual;
  
  const meses = [
    { nombre: 'Enero', numero: 1, icono: '❄️' },
    { nombre: 'Febrero', numero: 2, icono: '💝' },
    { nombre: 'Marzo', numero: 3, icono: '🌸' },
    { nombre: 'Abril', numero: 4, icono: '🌼' },
    { nombre: 'Mayo', numero: 5, icono: '🌺' },
    { nombre: 'Junio', numero: 6, icono: '☀️' },
    { nombre: 'Julio', numero: 7, icono: '🏖️' },
    { nombre: 'Agosto', numero: 8, icono: '🌅' },
    { nombre: 'Septiembre', numero: 9, icono: '🍂' },
    { nombre: 'Octubre', numero: 10, icono: '🎃' },
    { nombre: 'Noviembre', numero: 11, icono: '🍁' },
    { nombre: 'Diciembre', numero: 12, icono: '🎄' }
  ];
  
  mesesGrid.innerHTML = meses.map(mes => `
    <div class="mes-card" data-mes="${mes.numero}" onclick="toggleMes(${mes.numero})">
      <div class="mes-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      <div class="mes-nombre">${mes.nombre}</div>
      <div class="mes-numero">Mes ${mes.numero}</div>
    </div>
  `).join('');
  
  console.log('📅 Selector de meses inicializado');
}

// ===================================
// TOGGLE MES
// ===================================
function toggleMes(numeroMes) {
  const mesCard = document.querySelector(`[data-mes="${numeroMes}"]`);
  
  if (mesesSeleccionados.includes(numeroMes)) {
    // Deseleccionar
    mesesSeleccionados = mesesSeleccionados.filter(m => m !== numeroMes);
    mesCard.classList.remove('seleccionado');
  } else {
    // Seleccionar
    mesesSeleccionados.push(numeroMes);
    mesCard.classList.add('seleccionado');
  }
  
  // Ordenar meses seleccionados
  mesesSeleccionados.sort((a, b) => a - b);
  
  // Actualizar badge
  actualizarBadgeMeses();
  
  // Filtrar registros
  filtrarRegistros();
  
  console.log('📅 Meses seleccionados:', mesesSeleccionados);
}

// ===================================
// ACTUALIZAR BADGE DE MESES
// ===================================
function actualizarBadgeMeses() {
  const badge = document.querySelector('.meses-seleccionados-badge');
  const cantidad = mesesSeleccionados.length;
  
  if (cantidad === 0) {
    badge.textContent = '0 meses seleccionados';
  } else if (cantidad === 1) {
    badge.textContent = '1 mes seleccionado';
  } else {
    badge.textContent = `${cantidad} meses seleccionados`;
  }
}

// ===================================
// LIMPIAR SELECCIÓN DE MESES
// ===================================
function limpiarSeleccionMeses() {
  mesesSeleccionados = [];
  document.querySelectorAll('.mes-card').forEach(card => {
    card.classList.remove('seleccionado');
  });
  actualizarBadgeMeses();
  filtrarRegistros();
  console.log('🧹 Selección de meses limpiada');
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
  
  // Botón limpiar filtros
  document.getElementById('btnLimpiarFiltros')?.addEventListener('click', limpiarFiltros);
  
  // Botón limpiar meses
  document.getElementById('btnLimpiarMeses')?.addEventListener('click', limpiarSeleccionMeses);
  
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
    // Obtener la fecha desde fechaPago
    let fechaMostrar = registro.fechaPago || 'N/A';
    
    // Obtener el nombre completo
    const nombre = registro.nombreCompleto || 'N/A';
    
    // Obtener el concepto
    const concepto = registro.conceptoPago || 'N/A';
    
    // Obtener categoría
    const categoria = registro.categoria || 'Sin categoría';
    
    // Tipo de pago
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
    
    // Filtro de meses
    let coincideMes = true;
    if (mesesSeleccionados.length > 0) {
      coincideMes = false;
      
      // Verificar fechaPago
      if (registro.fechaPago) {
        const fechaPago = new Date(registro.fechaPago);
        const mesPago = fechaPago.getMonth() + 1;
        if (mesesSeleccionados.includes(mesPago)) {
          coincideMes = true;
        }
      }
      
      // Verificar fechaAsignada si no coincidió con fechaPago
      if (!coincideMes && registro.fechaAsignada) {
        const fechaAsignada = new Date(registro.fechaAsignada);
        const mesAsignado = fechaAsignada.getMonth() + 1;
        if (mesesSeleccionados.includes(mesAsignado)) {
          coincideMes = true;
        }
      }
    }
    
    return coincideBusqueda && coincideCategoria && coincideTipoPago && coincideConcepto && coincideMes;
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
  
  limpiarSeleccionMeses();
  
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
  try {
    console.log('📄 Iniciando exportación a PDF...');
    
    // Verificar que jsPDF esté cargado
    if (typeof window.jspdf === 'undefined') {
      alert('Error: La biblioteca jsPDF no está cargada.');
      return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Obtener registros filtrados
    const registrosFiltrados = obtenerRegistrosFiltrados();
    
    if (registrosFiltrados.length === 0) {
      alert('No hay registros para exportar');
      return;
    }
    
    // Configurar documento
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Agregar logo (opcional - centrado)
    try {
      const logoUrl = 'https://cdn.shopify.com/s/files/1/0763/5392/9451/files/03_TEOTIHUACAN_-_Fuerzas_Basicas.png?v=1749841591';
      doc.addImage(logoUrl, 'PNG', pageWidth / 2 - 20, 10, 40, 15);
    } catch (error) {
      console.warn('No se pudo cargar el logo:', error);
    }
    
    // Título
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text('Panel de Registros - Mensualidades', pageWidth / 2, 35, { align: 'center' });
    
    // Subtítulo con fecha
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    const fechaExportacion = new Date().toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Exportado el: ${fechaExportacion}`, pageWidth / 2, 42, { align: 'center' });
    
    // Estadísticas resumidas
    let yPos = 52;
    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.text('Resumen:', 14, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    
    const totalEfectivo = registrosFiltrados
      .filter(r => r.tipoPago === 'Efectivo')
      .reduce((sum, r) => sum + (parseFloat(r.monto) || 0), 0);
    
    const totalTransferencias = registrosFiltrados
      .filter(r => r.tipoPago === 'Transferencia')
      .reduce((sum, r) => sum + (parseFloat(r.monto) || 0), 0);
    
    const totalPendientes = registrosFiltrados.filter(r => r.estado === 'pendiente').length;
    
    doc.text(`Total de Registros: ${registrosFiltrados.length}`, 14, yPos);
    yPos += 6;
    doc.text(`Total Efectivo: ${formatearMoneda(totalEfectivo)}`, 14, yPos);
    yPos += 6;
    doc.text(`Total Transferencias: ${formatearMoneda(totalTransferencias)}`, 14, yPos);
    yPos += 6;
    doc.text(`Pendientes: ${totalPendientes}`, 14, yPos);
    
    // Preparar datos de la tabla
    const tableData = registrosFiltrados.map(registro => [
      registro.fechaPago || 'N/A',
      registro.nombreCompleto || 'N/A',
      registro.categoria || 'N/A',
      registro.conceptoPago || 'N/A',
      formatearMoneda(registro.monto),
      registro.tipoPago || 'N/A',
      registro.folioComprobante || 'N/A',
      registro.estado || 'pendiente'
    ]);
    
    // Agregar tabla con autoTable
    doc.autoTable({
      startY: yPos + 10,
      head: [['Fecha', 'Nombre', 'Categoría', 'Concepto', 'Monto', 'Tipo Pago', 'Folio', 'Estado']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [230, 126, 34],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [55, 65, 81]
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      margin: { top: 10, left: 14, right: 14 },
      didDrawPage: function(data) {
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        const pageCount = doc.internal.getNumberOfPages();
        const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
        doc.text(
          `Página ${currentPage} de ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    });
    
    // Generar nombre del archivo
    const fechaActual = new Date();
    const nombreArchivo = `registros_${fechaActual.getFullYear()}_${obtenerNombreMes(fechaActual.getMonth())}.pdf`;
    
    // Guardar el PDF
    doc.save(nombreArchivo);
    
    console.log('✅ PDF exportado exitosamente:', nombreArchivo);
    
  } catch (error) {
    console.error('❌ Error al exportar PDF:', error);
    alert('Error al generar el PDF. Por favor, intenta de nuevo.');
  }
}

// ===================================
// OBTENER REGISTROS FILTRADOS
// ===================================
function obtenerRegistrosFiltrados() {
  const busqueda = document.getElementById('buscadorRegistros')?.value.toLowerCase() || '';
  const categoria = document.getElementById('filtroCategoria')?.value || '';
  const tipoPago = document.getElementById('filtroTipoPago')?.value || '';
  const concepto = document.getElementById('filtroConcepto')?.value || '';
  
  return registrosGlobal.filter(registro => {
    const coincideBusqueda = busqueda === '' || 
      (registro.nombreCompleto?.toLowerCase().includes(busqueda)) ||
      (registro.folioComprobante?.toLowerCase().includes(busqueda));
    
    const coincideCategoria = categoria === '' || registro.categoria === categoria;
    const coincideTipoPago = tipoPago === '' || registro.tipoPago === tipoPago;
    const coincideConcepto = concepto === '' || registro.conceptoPago === concepto;
    
    // Filtro de meses
    let coincideMes = true;
    if (mesesSeleccionados.length > 0) {
      coincideMes = false;
      
      if (registro.fechaPago) {
        const fechaPago = new Date(registro.fechaPago);
        const mesPago = fechaPago.getMonth() + 1;
        if (mesesSeleccionados.includes(mesPago)) {
          coincideMes = true;
        }
      }
      
      if (!coincideMes && registro.fechaAsignada) {
        const fechaAsignada = new Date(registro.fechaAsignada);
        const mesAsignado = fechaAsignada.getMonth() + 1;
        if (mesesSeleccionados.includes(mesAsignado)) {
          coincideMes = true;
        }
      }
    }
    
    return coincideBusqueda && coincideCategoria && coincideTipoPago && coincideConcepto && coincideMes;
  });
}

// ===================================
// OBTENER NOMBRE DEL MES
// ===================================
function obtenerNombreMes(numeroMes) {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return meses[numeroMes];
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

// ===================================
// HACER FUNCIONES GLOBALES
// ===================================
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;
window.toggleMes = toggleMes;
