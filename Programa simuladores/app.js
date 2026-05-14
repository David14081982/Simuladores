/**
 * app.js
 * =========================================================
 * CONTROLADOR PRINCIPAL
 * Orquesta pantallas, eventos y flujo de la app.
 * Depende de: config.js, api.js, motors.js, pdf.js, ui.js
 * =========================================================
 */

// Estado global de la sesión (solo en memoria, nunca en localStorage)
const STATE = {
  programas:          [],   // lista cargada desde Sheets
  programaActivo:     null, // programa seleccionado
  resultadoActivo:    null, // { resumen, amortizacion } del cálculo en curso
  email:              '',   // email del usuario en sesión
  historial:          [],   // simulaciones cargadas del historial
  simDetalleActiva:   null, // simulación abierta en pantalla detail
};

// =========================================================
// INICIALIZACIÓN
// =========================================================
document.addEventListener('DOMContentLoaded', async () => {
  UI.showScreen('loading');
  await APP.init();
});

const APP = {

  async init() {
    try {
      STATE.programas = await API.getProgramas();
    } catch (e) {
      // Si falla la carga (ej: URL no configurada), muestra igualmente la pantalla
      console.warn('No se pudieron cargar programas:', e.message);
      STATE.programas = [];
    }

    APP.bindEvents();
    APP.renderHome();
    UI.showScreen('home');
  },

  // =========================================================
  // BINDING DE EVENTOS
  // =========================================================
  bindEvents() {

    // --- HOME ---
    document.getElementById('btn-save-email').addEventListener('click', () => {
      STATE.email = UI.getUserEmail();
      UI.toast('Correo guardado', 'success');
    });

    document.getElementById('btn-go-history').addEventListener('click', () => APP.openHistory());

    // --- SIMULADOR ---
    document.getElementById('btn-back-sim').addEventListener('click', () => {
      UI.showScreen('home');
    });

    // Recalcular en tiempo real al cambiar cualquier input
    ['input-enganche', 'input-plazo'].forEach(id => {
      document.getElementById(id).addEventListener('input', APP.recalcular);
    });
    document.querySelectorAll('input[name="fondo"]').forEach(r => {
      r.addEventListener('change', APP.recalcular);
    });
    document.getElementById('input-fecha').addEventListener('change', APP.recalcular);

    document.getElementById('btn-guardar').addEventListener('click', APP.guardarSimulacion);
    document.getElementById('btn-pdf').addEventListener('click', APP.generarPDF);
    document.getElementById('btn-nueva').addEventListener('click', () => {
      STATE.resultadoActivo = null;
      UI.loadProgram(STATE.programaActivo);
    });

    // --- HISTORIAL ---
    document.getElementById('btn-back-hist').addEventListener('click', () => {
      UI.showScreen('home');
    });
    document.getElementById('input-search').addEventListener('input', APP.filtrarHistorial);

    // --- DETALLE ---
    document.getElementById('btn-back-detail').addEventListener('click', () => {
      UI.showScreen('history');
    });
    document.getElementById('btn-detail-pdf').addEventListener('click', () => {
      const sim  = STATE.simDetalleActiva;
      const prog = STATE.programas.find(p => p.nombre === sim.programa) || {};
      PDF.generar(prog, sim, sim.amortizacion || []);
    });
    document.getElementById('btn-detail-duplicar').addEventListener('click', () => {
      APP.duplicarSimulacion(STATE.simDetalleActiva);
    });
  },

  // =========================================================
  // HOME
  // =========================================================
  renderHome() {
    UI.renderPrograms(STATE.programas, APP.seleccionarPrograma);
    if (STATE.email) UI.setUserEmail(STATE.email);
  },

  // =========================================================
  // SELECCIONAR PROGRAMA
  // =========================================================
  seleccionarPrograma(prog) {
    STATE.programaActivo  = prog;
    STATE.resultadoActivo = null;
    UI.loadProgram(prog);
    UI.showScreen('simulator');
  },

  // =========================================================
  // RECÁLCULO EN TIEMPO REAL
  // =========================================================
  recalcular() {
    const prog = STATE.programaActivo;
    if (!prog) return;

    const nombre    = document.getElementById('input-nombre').value.trim();
    const enganche  = parseFloat(document.getElementById('input-enganche').value) || 0;
    const plazos    = parseInt(document.getElementById('input-plazo').value) || 0;
    const fechaVal  = document.getElementById('input-fecha').value;
    const fecha     = fechaVal ? new Date(fechaVal + 'T12:00:00') : new Date();

    // Validaciones básicas antes de calcular
    if (plazos <= 0) return APP.ocultarResultados();
    if (plazos > prog.plazoMaximo) {
      document.getElementById('hint-plazo').textContent =
        `⚠️ Máximo permitido: ${prog.plazoMaximo}`;
      document.getElementById('hint-plazo').classList.add('warn');
      return APP.ocultarResultados();
    } else {
      document.getElementById('hint-plazo').textContent =
        `Máximo ${prog.plazoMaximo} ${UI._periodicidadLabel(prog.periodicidad || 'quincenal')}`;
      document.getElementById('hint-plazo').classList.remove('warn');
    }

    // Validar enganche mínimo
    if (prog.engancheMinimo > 0 && enganche < prog.engancheMinimo) {
      document.getElementById('hint-enganche').textContent =
        `⚠️ Mínimo: ${MOTORS.formatMoney(prog.engancheMinimo)}`;
      document.getElementById('hint-enganche').classList.add('warn');
      return APP.ocultarResultados();
    } else {
      document.getElementById('hint-enganche').classList.remove('warn');
    }

    let resultado;

    try {
      if (prog.tipoMotor === 'motor_autos') {
        // motor_autos
        resultado = MOTORS.calcular('motor_autos', {
          precioFinanciamiento: prog.precioFinanciamiento || prog.precioContado || 0,
          enganche,
          gastosAdmin:  prog.gastosAdmin  || 0,
          seguroArgos:  prog.seguroArgos  || 0,
          plazos,
          periodicidad: prog.periodicidad || 'quincenal',
          fechaInicio:  fecha,
        });
      } else {
        // motor_standard — necesita tipo de fondo seleccionado
        const fondoSeleccionado = document.querySelector('input[name="fondo"]:checked');
        if (!fondoSeleccionado) return APP.ocultarResultados();

        const porcentaje = fondoSeleccionado.value === 'caja_chica'
          ? prog.interesCajaChica
          : prog.interesSuptiexpress;

        resultado = MOTORS.calcular('motor_standard', {
          precioContado:      prog.precioContado || 0,
          enganche,
          gastosAdmin:        prog.gastosAdmin   || 0,
          seguroArgos:        prog.seguroArgos   || 0,
          porcentajeInteres:  porcentaje,
          plazos,
          periodicidad:       prog.periodicidad  || 'quincenal',
          fechaInicio:        fecha,
        });
      }
    } catch (e) {
      console.error('Error en cálculo:', e);
      return APP.ocultarResultados();
    }

    STATE.resultadoActivo = resultado;

    // Render resumen
    UI.renderResumen(
      resultado.resumen,
      prog.tipoMotor,
      prog.periodicidad || 'quincenal',
    );

    // Render amortización
    UI.renderAmortizacion(
      resultado.amortizacion,
      prog.tipoMotor,
    );

    // Mostrar acciones
    document.getElementById('actions-bar').style.display = '';
  },

  ocultarResultados() {
    STATE.resultadoActivo = null;
    document.getElementById('card-resumen').style.display      = 'none';
    document.getElementById('card-amortizacion').style.display = 'none';
    document.getElementById('actions-bar').style.display       = 'none';
  },

  // =========================================================
  // GUARDAR SIMULACIÓN
  // =========================================================
  async guardarSimulacion() {
    if (!STATE.resultadoActivo) {
      UI.toast('Primero completa la simulación', 'warn');
      return;
    }

    const nombre = document.getElementById('input-nombre').value.trim();
    if (!nombre) {
      UI.toast('Ingresa el nombre del solicitante', 'warn');
      document.getElementById('input-nombre').classList.add('error');
      return;
    }
    document.getElementById('input-nombre').classList.remove('error');

    const email   = UI.getUserEmail() || STATE.email || '';
    const prog    = STATE.programaActivo;
    const res     = STATE.resultadoActivo.resumen;
    const amort   = STATE.resultadoActivo.amortizacion;
    const fechaVal = document.getElementById('input-fecha').value;

    const fondoEl = document.querySelector('input[name="fondo"]:checked');
    const fondo   = fondoEl ? fondoEl.value : null;

    const simulacion = {
      nombre,
      email,
      programa:           prog.nombre,
      tipoMotor:          prog.tipoMotor,
      fondo,
      fechaStr:           fechaVal,
      enganche:           res.enganche           || 0,
      precioContado:      res.precioContado       || 0,
      precioFinanciamiento: res.precioFinanciamiento || 0,
      montoFinanciamiento: res.montoFinanciamiento || 0,
      gastosAdmin:        res.gastosAdmin         || 0,
      seguroArgos:        res.seguroArgos         || 0,
      totalFinanciamiento: res.totalFinanciamiento || 0,
      porcentajeInteres:  res.porcentajeInteres   || 0,
      interesXPeriodo:    res.interesXPeriodo     || 0,
      totalIntereses:     res.totalIntereses      || 0,
      cuotaFija:          res.cuotaFija,
      totalAPagar:        res.totalAPagar,
      plazos:             res.plazos,
      periodicidad:       res.periodicidad        || 'quincenal',
      periodicidadLabel:  UI._periodicidadLabel(res.periodicidad || 'quincenal'),
    };

    // Confirmar antes de guardar
    const ok = await UI.confirm(`¿Guardar simulación para ${nombre}?`);
    if (!ok) return;

    const btnGuardar = document.getElementById('btn-guardar');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    try {
      const respuesta = await API.guardarSimulacion(simulacion, amort);
      UI.toast(`✓ Guardado — ID: ${respuesta.simId}`, 'success', 4000);
    } catch (e) {
      UI.toast('Error al guardar: ' + e.message, 'error', 5000);
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = '💾 Guardar Simulación';
    }
  },

  // =========================================================
  // GENERAR PDF
  // =========================================================
  generarPDF() {
    if (!STATE.resultadoActivo) {
      UI.toast('Primero completa la simulación', 'warn');
      return;
    }

    const nombre  = document.getElementById('input-nombre').value.trim() || 'Solicitante';
    const email   = UI.getUserEmail() || '';
    const prog    = STATE.programaActivo;
    const res     = STATE.resultadoActivo.resumen;
    const amort   = STATE.resultadoActivo.amortizacion;
    const fechaVal = document.getElementById('input-fecha').value;

    const fondoEl = document.querySelector('input[name="fondo"]:checked');
    const fondo   = fondoEl ? fondoEl.value : null;

    const simulacion = {
      ...res,
      nombre,
      email,
      fechaStr: fechaVal,
      fondo,
      periodicidadLabel: UI._periodicidadLabel(res.periodicidad || 'quincenal'),
    };

    try {
      PDF.generar(prog, simulacion, amort);
    } catch (e) {
      UI.toast('Error generando PDF: ' + e.message, 'error');
    }
  },

  // =========================================================
  // HISTORIAL
  // =========================================================
  async openHistory() {
    UI.showScreen('history');
    document.getElementById('input-search').value = '';
    document.getElementById('history-list').innerHTML =
      '<div class="history-empty">Cargando...</div>';

    try {
      const email = UI.getUserEmail() || STATE.email || '';
      STATE.historial = await API.getHistorial(email);
      UI.renderHistorial(STATE.historial, APP.openDetalle);
    } catch (e) {
      document.getElementById('history-list').innerHTML =
        '<div class="history-empty">Error al cargar historial.</div>';
    }
  },

  filtrarHistorial() {
    const query = document.getElementById('input-search').value.toLowerCase();
    const filtrado = STATE.historial.filter(s =>
      (s.nombre   || '').toLowerCase().includes(query) ||
      (s.programa || '').toLowerCase().includes(query),
    );
    UI.renderHistorial(filtrado, APP.openDetalle);
  },

  // =========================================================
  // DETALLE DE SIMULACIÓN
  // =========================================================
  async openDetalle(sim) {
    UI.showScreen('detail');
    const prog = STATE.programas.find(p => p.nombre === sim.programa) || { tipoMotor: sim.tipoMotor, nombre: sim.programa };

    // Si ya trae amortización (desde la memoria) la usamos directamente
    if (!sim.amortizacion || !sim.amortizacion.length) {
      try {
        sim.amortizacion = await API.getAmortizacion(sim.simId);
      } catch (e) {
        sim.amortizacion = [];
      }
    }

    STATE.simDetalleActiva = sim;

    UI.renderDetalle(sim, prog);
    UI.renderAmortizacion(
      sim.amortizacion,
      sim.tipoMotor,
      'detail-tabla-head',
      'detail-tabla-body',
      'detail-tabla-foot',
    );
  },

  // =========================================================
  // DUPLICAR SIMULACIÓN
  // =========================================================
  duplicarSimulacion(sim) {
    const prog = STATE.programas.find(p => p.nombre === sim.programa);
    if (!prog) {
      UI.toast('Programa no encontrado', 'warn');
      return;
    }
    APP.seleccionarPrograma(prog);
    // Pre-llenar datos
    setTimeout(() => {
      document.getElementById('input-nombre').value  = sim.nombre + ' (copia)';
      document.getElementById('input-enganche').value = sim.enganche || 0;
      document.getElementById('input-plazo').value    = sim.plazos   || '';
      if (sim.fondo) {
        const radio = document.querySelector(`input[name="fondo"][value="${sim.fondo}"]`);
        if (radio) { radio.checked = true; APP.recalcular(); }
      } else {
        APP.recalcular();
      }
    }, 100);
  },
};
