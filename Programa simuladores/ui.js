/**
 * ui.js
 * =========================================================
 * CAPA DE INTERFAZ
 * Funciones puras de renderizado DOM.
 * No tienen lógica de negocio ni llaman a la API.
 * =========================================================
 */

const UI = {

  // -------------------------------------------------------
  // PANTALLAS (router SPA)
  // -------------------------------------------------------
  screens: ['loading', 'home', 'simulator', 'history', 'detail'],

  showScreen(name) {
    UI.screens.forEach(s => {
      const el = document.getElementById(`screen-${s}`);
      if (el) el.classList.toggle('active', s === name);
    });
    window.scrollTo(0, 0);
  },

  // -------------------------------------------------------
  // TOAST
  // -------------------------------------------------------
  _toastTimer: null,

  toast(msg, type = 'default', duration = 3000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast show${type !== 'default' ? ' ' + type : ''}`;
    clearTimeout(UI._toastTimer);
    UI._toastTimer = setTimeout(() => {
      el.classList.remove('show');
    }, duration);
  },

  // -------------------------------------------------------
  // MODAL DE CONFIRMACIÓN
  // -------------------------------------------------------
  confirm(msg) {
    return new Promise(resolve => {
      document.getElementById('modal-message').textContent = msg;
      document.getElementById('modal-overlay').style.display = 'flex';
      const btnOk  = document.getElementById('modal-confirm');
      const btnNo  = document.getElementById('modal-cancel');
      const close  = val => {
        document.getElementById('modal-overlay').style.display = 'none';
        btnOk.onclick = null; btnNo.onclick = null;
        resolve(val);
      };
      btnOk.onclick = () => close(true);
      btnNo.onclick = () => close(false);
    });
  },

  // -------------------------------------------------------
  // PANTALLA: HOME — grid de programas
  // -------------------------------------------------------
  renderPrograms(programas, onSelect) {
    const grid = document.getElementById('programs-grid');
    grid.innerHTML = '';

    if (!programas.length) {
      grid.innerHTML = '<p style="color:#888;font-size:14px;grid-column:1/-1">No hay programas activos.</p>';
      return;
    }

    programas.forEach(prog => {
      const icon = prog.icono || UI._guessIcon(prog.nombre);
      const card = document.createElement('div');
      card.className = 'program-card';
      card.innerHTML = `
        <div class="program-card-icon">${icon}</div>
        <div class="program-card-name">${prog.nombre}</div>
        <div class="program-card-motor">${UI._motorLabel(prog.tipoMotor)}</div>
      `;
      card.addEventListener('click', () => onSelect(prog));
      grid.appendChild(card);
    });
  },

  _guessIcon(nombre) {
    const n = nombre.toLowerCase();
    if (n.includes('cirug'))    return '🏥';
    if (n.includes('viaje'))    return '✈️';
    if (n.includes('auto'))     return '🚗';
    if (n.includes('moto'))     return '🏍️';
    if (n.includes('dental'))   return '🦷';
    if (n.includes('escol'))    return '📚';
    if (n.includes('funera'))   return '🌸';
    return '💳';
  },

  _motorLabel(m) {
    return m === 'motor_autos' ? 'Autos' : 'Crédito';
  },

  // -------------------------------------------------------
  // PANTALLA: SIMULADOR — cargar datos de un programa
  // -------------------------------------------------------
  loadProgram(prog) {
    // Nombre
    document.getElementById('sim-program-name').textContent = prog.nombre;

    // Logo del programa en el header
    const logoSim = document.getElementById('header-logo-sim');
    if (prog.logoBase64) {
      logoSim.innerHTML = `<img src="${prog.logoBase64}" alt="logo">`;
    } else {
      logoSim.innerHTML = '';
    }

    // Parámetros de solo lectura
    const paramsDiv = document.getElementById('params-display');
    paramsDiv.innerHTML = '';

    const addParam = (label, value) => {
      const item = document.createElement('div');
      item.className = 'param-item';
      item.innerHTML = `<div class="param-label">${label}</div><div class="param-value">${value}</div>`;
      paramsDiv.appendChild(item);
    };

    if (prog.tipoMotor === 'motor_autos') {
      if (prog.precioContado > 0)
        addParam('Precio Contado', MOTORS.formatMoney(prog.precioContado));
      if (prog.precioFinanciamiento > 0)
        addParam('Precio Financiamiento', MOTORS.formatMoney(prog.precioFinanciamiento));
      addParam('Plazo máx.', `${prog.plazoMaximo} ${UI._periodicidadLabel(prog.periodicidad)}`);
    } else {
      if (prog.precioContado > 0)
        addParam('Precio de Contado', MOTORS.formatMoney(prog.precioContado));
      addParam('Gastos Admin', MOTORS.formatMoney(prog.gastosAdmin));
      addParam('Seguro Argos', MOTORS.formatMoney(prog.seguroArgos));
      addParam('Plazo máx.', `${prog.plazoMaximo} quincenas`);
    }

    // Sub-tipo de fondo (solo motor_standard)
    const cardFondo = document.getElementById('card-fondo');
    if (prog.tipoMotor === 'motor_standard') {
      cardFondo.style.display = '';
      document.getElementById('label-caja-chica-pct').textContent  =
        `${MOTORS.formatPct(prog.interesCajaChica)} quincenal`;
      document.getElementById('label-sutiexpress-pct').textContent =
        `${MOTORS.formatPct(prog.interesSuptiexpress)} quincenal`;
      // Limpiar selección
      document.querySelectorAll('input[name="fondo"]').forEach(r => r.checked = false);
    } else {
      cardFondo.style.display = 'none';
    }

    // Campo enganche
    const groupEnganche = document.getElementById('group-enganche');
    if (prog.tipoMotor === 'motor_autos' && prog.precioFinanciamiento > 0 && prog.precioContado === 0) {
      // Autos sin precio contado: enganche sobre precio financiamiento
      document.getElementById('label-enganche').textContent = 'Enganche (opcional)';
    } else if (prog.tipoMotor === 'motor_standard' && prog.precioContado > 0) {
      document.getElementById('label-enganche').textContent = 'Enganche *';
    }

    // Mostrar/ocultar precio contado
    const groupPrecio = document.getElementById('group-precio-contado');
    if (prog.precioContado > 0) {
      groupPrecio.style.display = '';
      document.getElementById('display-precio-contado').textContent =
        MOTORS.formatMoney(prog.precioContado);
    } else {
      groupPrecio.style.display = 'none';
    }

    // Mostrar precio financiamiento para motor_autos
    const groupPF = document.getElementById('group-precio-financiamiento');
    if (prog.tipoMotor === 'motor_autos' && prog.precioFinanciamiento > 0) {
      groupPF.style.display = '';
      document.getElementById('display-precio-financiamiento').textContent =
        MOTORS.formatMoney(prog.precioFinanciamiento);
    } else {
      groupPF.style.display = 'none';
    }

    // Plazo hint
    const perioLabel = UI._periodicidadLabel(prog.periodicidad || 'quincenal');
    document.getElementById('label-plazo').textContent = `Plazo (${perioLabel})`;
    document.getElementById('plazo-unit-label').textContent = perioLabel;
    document.getElementById('hint-plazo').textContent =
      `Máximo ${prog.plazoMaximo} ${perioLabel}`;
    document.getElementById('input-plazo').max   = prog.plazoMaximo;
    document.getElementById('input-plazo').value = '';

    // Hint enganche
    const hintEng = document.getElementById('hint-enganche');
    if (prog.engancheMinimo > 0) {
      hintEng.textContent = `Mínimo: ${MOTORS.formatMoney(prog.engancheMinimo)}`;
    } else {
      hintEng.textContent = '';
    }

    // Resetear resultados
    document.getElementById('card-resumen').style.display      = 'none';
    document.getElementById('card-amortizacion').style.display = 'none';
    document.getElementById('actions-bar').style.display       = 'none';
    document.getElementById('input-nombre').value = '';
    document.getElementById('input-enganche').value = '';
    document.getElementById('input-plazo').value = '';

    // Fecha default = hoy
    const hoy = new Date();
    document.getElementById('input-fecha').valueAsDate = hoy;
  },

  _periodicidadLabel(p) {
    return CONFIG.PERIODICIDADES[p]?.label || 'quincenas';
  },

  // -------------------------------------------------------
  // PANTALLA: SIMULADOR — mostrar resumen calculado
  // -------------------------------------------------------
  renderResumen(resumen, tipoMotor, periodicidad) {
    const div = document.getElementById('resumen-display');
    div.innerHTML = '';

    const f = MOTORS.formatMoney;
    const p = MOTORS.formatPct;
    const perioLabel = UI._periodicidadLabel(periodicidad);

    const rows = tipoMotor === 'motor_autos'
      ? [
          { label: 'Precio de Financiamiento', value: f(resumen.precioFinanciamiento) },
          { label: 'Enganche',                 value: f(resumen.enganche) },
          { label: 'Monto a Financiar',        value: f(resumen.montoFinanciamiento) },
          { label: `Plazo (${perioLabel})`,    value: resumen.plazos },
          { label: 'Cuota Fija',               value: f(resumen.cuotaFija), highlight: true },
          { label: 'Total Intereses',          value: f(0) },
          { label: 'TOTAL A PAGAR',            value: f(resumen.totalAPagar), total: true },
        ]
      : [
          { label: 'Precio de Contado',         value: f(resumen.precioContado) },
          { label: 'Enganche',                  value: f(resumen.enganche) },
          { label: 'Monto de Financiamiento',   value: f(resumen.montoFinanciamiento) },
          { label: 'Gastos de Admin',           value: f(resumen.gastosAdmin) },
          { label: 'Seguro Argos',              value: f(resumen.seguroArgos) },
          { label: 'Total de Financiamiento',   value: f(resumen.totalFinanciamiento) },
          { label: '% Interés / período',       value: p(resumen.porcentajeInteres) },
          { label: 'Interés por período',       value: f(resumen.interesXPeriodo) },
          { label: `Plazo (${perioLabel})`,     value: resumen.plazos },
          { label: 'Total Intereses',           value: f(resumen.totalIntereses) },
          { label: 'Cuota Fija',                value: f(resumen.cuotaFija), highlight: true },
          { label: 'TOTAL A PAGAR',             value: f(resumen.totalAPagar), total: true },
        ];

    rows.forEach(row => {
      const div2 = document.createElement('div');
      div2.className = 'resumen-row' +
        (row.total ? ' total' : '') +
        (row.highlight ? ' highlight' : '');
      div2.innerHTML = `
        <span class="resumen-label">${row.label}</span>
        <span class="resumen-value text-money">${row.value}</span>
      `;
      div.appendChild(div2);
    });

    document.getElementById('card-resumen').style.display = '';
  },

  // -------------------------------------------------------
  // PANTALLA: SIMULADOR — tabla de amortización
  // -------------------------------------------------------
  renderAmortizacion(amortizacion, tipoMotor, headId, bodyId, footId) {
    headId = headId || 'tabla-head';
    bodyId = bodyId || 'tabla-body';
    footId = footId || 'tabla-foot';

    const thead = document.getElementById(headId);
    const tbody = document.getElementById(bodyId);
    const tfoot = document.getElementById(footId);

    const f = MOTORS.formatMoney;
    const esAutos = tipoMotor === 'motor_autos';

    // HEAD
    if (esAutos) {
      thead.innerHTML = `<tr>
        <th>#</th><th>Fecha</th><th>Cuota</th><th>Saldo</th>
      </tr>`;
    } else {
      thead.innerHTML = `<tr>
        <th>#</th><th>Fecha</th><th>Interés</th><th>Capital</th><th>Pago</th><th>Saldo</th>
      </tr>`;
    }

    // BODY
    tbody.innerHTML = '';
    amortizacion.forEach(row => {
      const tr = document.createElement('tr');
      const fecha = MOTORS.formatDate(new Date(row.fecha));
      if (esAutos) {
        tr.innerHTML = `
          <td>${row.periodo}</td>
          <td>${fecha}</td>
          <td>${f(row.pagoTotal)}</td>
          <td>${f(row.saldo)}</td>
        `;
      } else {
        tr.innerHTML = `
          <td>${row.periodo}</td>
          <td>${fecha}</td>
          <td>${f(row.interes)}</td>
          <td>${f(row.capital)}</td>
          <td>${f(row.pagoTotal)}</td>
          <td>${f(row.saldo)}</td>
        `;
      }
      tbody.appendChild(tr);
    });

    // FOOT
    const totalPagos   = amortizacion.reduce((s, r) => s + r.pagoTotal, 0);
    const totalInteres = amortizacion.reduce((s, r) => s + r.interes, 0);
    const totalCapital = amortizacion.reduce((s, r) => s + r.capital, 0);

    if (esAutos) {
      tfoot.innerHTML = `<tr>
        <td colspan="2">TOTAL</td>
        <td>${f(totalPagos)}</td>
        <td></td>
      </tr>`;
    } else {
      tfoot.innerHTML = `<tr>
        <td colspan="2">TOTAL</td>
        <td>${f(totalInteres)}</td>
        <td>${f(totalCapital)}</td>
        <td>${f(totalPagos)}</td>
        <td></td>
      </tr>`;
    }

    document.getElementById('card-amortizacion').style.display = '';
  },

  // -------------------------------------------------------
  // PANTALLA: HISTORIAL
  // -------------------------------------------------------
  renderHistorial(simulaciones, onSelect) {
    const list = document.getElementById('history-list');
    list.innerHTML = '';

    if (!simulaciones.length) {
      list.innerHTML = '<div class="history-empty">No hay simulaciones guardadas.</div>';
      return;
    }

    simulaciones.forEach(sim => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <div class="history-item-header">
          <span class="history-name">${sim.nombre || '—'}</span>
          <span class="history-date">${sim.fechaStr || ''}</span>
        </div>
        <span class="history-program">${sim.programa || ''}</span>
        <div class="history-amounts">
          <span class="history-amount-item">Cuota: <strong>${MOTORS.formatMoney(sim.cuotaFija)}</strong></span>
          <span class="history-amount-item">Total: <strong>${MOTORS.formatMoney(sim.totalAPagar)}</strong></span>
        </div>
      `;
      item.addEventListener('click', () => onSelect(sim));
      list.appendChild(item);
    });
  },

  // -------------------------------------------------------
  // PANTALLA: DETALLE DE SIMULACIÓN
  // -------------------------------------------------------
  renderDetalle(sim, programa) {
    document.getElementById('detail-title').textContent = sim.nombre || 'Simulación';

    const resumenDiv = document.getElementById('detail-resumen');
    resumenDiv.innerHTML = `
      <h3 class="card-title">Resumen</h3>
      <div class="resumen-grid">
        <div class="resumen-row"><span class="resumen-label">Solicitante</span><span class="resumen-value">${sim.nombre}</span></div>
        <div class="resumen-row"><span class="resumen-label">Programa</span><span class="resumen-value">${sim.programa}</span></div>
        <div class="resumen-row"><span class="resumen-label">Fecha</span><span class="resumen-value">${sim.fechaStr}</span></div>
        <div class="resumen-row"><span class="resumen-label">Enganche</span><span class="resumen-value text-money">${MOTORS.formatMoney(sim.enganche)}</span></div>
        <div class="resumen-row highlight"><span class="resumen-label">Cuota Fija</span><span class="resumen-value text-money">${MOTORS.formatMoney(sim.cuotaFija)}</span></div>
        <div class="resumen-row total"><span class="resumen-label">TOTAL A PAGAR</span><span class="resumen-value text-money">${MOTORS.formatMoney(sim.totalAPagar)}</span></div>
      </div>
    `;
  },

  // -------------------------------------------------------
  // Email del usuario
  // -------------------------------------------------------
  getUserEmail() {
    return (document.getElementById('input-user-email').value || '').trim();
  },

  setUserEmail(email) {
    document.getElementById('input-user-email').value = email || '';
  },
};
