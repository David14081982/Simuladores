/**
 * =========================================================
 * SIMULADOR DE CRÉDITOS — GOOGLE APPS SCRIPT BACKEND
 * =========================================================
 * Archivo: Code.gs
 *
 * Estructura de hojas requerida en el Spreadsheet:
 *   - PROGRAMAS
 *   - SIMULACIONES
 *   - AMORTIZACIONES
 *
 * Desplegar como: Web App
 *   Execute as:   Me
 *   Who has access: Anyone  (Glide necesita acceso sin login)
 * =========================================================
 */

// =========================================================
// CONFIGURACIÓN
// =========================================================
const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI'; // ← Reemplazar
const ALLOWED_ORIGIN = '*'; // Puedes restringir a tu dominio de Glide

// Nombres de hojas
const SHEET = {
  PROGRAMAS:     'PROGRAMAS',
  SIMULACIONES:  'SIMULACIONES',
  AMORTIZACIONES: 'AMORTIZACIONES',
};

// =========================================================
// ROUTER PRINCIPAL
// Recibe todas las peticiones del frontend
// =========================================================
function doPost(e) {
  const headers = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Content-Type': 'application/json',
  };

  try {
    const payload = JSON.parse(e.postData.contents);
    const action  = payload.action;

    let result;
    switch (action) {
      case 'getProgramas':
        result = getProgramas();
        break;
      case 'guardarSimulacion':
        result = guardarSimulacion(payload.simulacion, payload.amortizacion);
        break;
      case 'getHistorial':
        result = getHistorial(payload.email || '');
        break;
      case 'getAmortizacion':
        result = getAmortizacion(payload.simId);
        break;
      default:
        result = { error: `Acción desconocida: ${action}` };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// CORS preflight
function doGet(e) {
  const action = e.parameter.action || '';
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, version: '1.0.0' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// =========================================================
// ACCIÓN: getProgramas
// Lee la hoja PROGRAMAS y devuelve solo los activos
// =========================================================
function getProgramas() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET.PROGRAMAS);

  if (!sheet) return { programas: [] };

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { programas: [] };

  const headers = data[0].map(h => String(h).trim().toLowerCase());

  // Índices de columnas (robustos, no dependen de orden)
  const col = {
    id:                   headers.indexOf('id'),
    nombre:               headers.indexOf('nombre'),
    tipoMotor:            headers.indexOf('tipomotor'),
    encabezado:           headers.indexOf('encabezado'),
    icono:                headers.indexOf('icono'),
    logoBase64:           headers.indexOf('logobase64'),
    precioContado:        headers.indexOf('preciocontado'),
    precioFinanciamiento: headers.indexOf('preciofinanciamiento'),
    gastosAdmin:          headers.indexOf('gastosadmin'),
    seguroArgos:          headers.indexOf('seguroargos'),
    interesCajaChica:     headers.indexOf('interescajachica'),
    interesSuptiexpress:  headers.indexOf('interessutiexpress'),
    plazoMaximo:          headers.indexOf('plazomaximo'),
    periodicidad:         headers.indexOf('periodicidad'),
    engancheMinimo:       headers.indexOf('engancheminimo'),
    activo:               headers.indexOf('activo'),
  };

  const programas = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Saltar filas inactivas o vacías
    const activo = String(row[col.activo] || '').toLowerCase();
    if (activo === 'false' || activo === 'no' || activo === '0') continue;
    if (!row[col.nombre]) continue;

    programas.push({
      id:                   String(row[col.id]                   || i),
      nombre:               String(row[col.nombre]               || ''),
      tipoMotor:            String(row[col.tipoMotor]            || 'motor_standard'),
      encabezado:           String(row[col.encabezado]           || ''),
      icono:                String(row[col.icono]                || ''),
      logoBase64:           String(row[col.logoBase64]           || ''),
      precioContado:        Number(row[col.precioContado]        || 0),
      precioFinanciamiento: Number(row[col.precioFinanciamiento] || 0),
      gastosAdmin:          Number(row[col.gastosAdmin]          || 0),
      seguroArgos:          Number(row[col.seguroArgos]          || 0),
      interesCajaChica:     Number(row[col.interesCajaChica]     || 0.03),
      interesSuptiexpress:  Number(row[col.interesSuptiexpress]  || 0.05),
      plazoMaximo:          Number(row[col.plazoMaximo]          || 24),
      periodicidad:         String(row[col.periodicidad]         || 'quincenal'),
      engancheMinimo:       Number(row[col.engancheMinimo]       || 0),
    });
  }

  return { programas };
}

// =========================================================
// ACCIÓN: guardarSimulacion
// Escribe cabecera en SIMULACIONES y filas en AMORTIZACIONES
// =========================================================
function guardarSimulacion(simulacion, amortizacion) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Generar ID único
  const simId = 'SIM-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
  const ahora = new Date();

  // --- SIMULACIONES ---
  const sheetSim = ss.getSheetByName(SHEET.SIMULACIONES);

  // Crear hoja si no existe
  const sheetSimFinal = sheetSim || _crearHojaSimulaciones(ss);

  sheetSimFinal.appendRow([
    simId,                            // SimID
    Utilities.formatDate(ahora, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'), // Fecha
    simulacion.nombre        || '',   // Solicitante
    simulacion.email         || '',   // Email
    simulacion.programa      || '',   // Programa
    simulacion.tipoMotor     || '',   // TipoMotor
    simulacion.fondo         || '',   // Fondo (CajaChica/SutiExpress)
    simulacion.fechaStr      || '',   // FechaInicio
    simulacion.enganche      || 0,    // Enganche
    simulacion.precioContado || 0,    // PrecioContado
    simulacion.precioFinanciamiento || 0, // PrecioFinanciamiento
    simulacion.montoFinanciamiento  || 0, // MontoFinanciamiento
    simulacion.gastosAdmin          || 0, // GastosAdmin
    simulacion.seguroArgos          || 0, // SeguroArgos
    simulacion.totalFinanciamiento  || 0, // TotalFinanciamiento
    simulacion.porcentajeInteres    || 0, // PorcentajeInteres
    simulacion.interesXPeriodo      || 0, // InteresXPeriodo
    simulacion.totalIntereses       || 0, // TotalIntereses
    simulacion.cuotaFija,                 // CuotaFija
    simulacion.totalAPagar,               // TotalAPagar
    simulacion.plazos,                    // Plazos
    simulacion.periodicidad  || '',       // Periodicidad
  ]);

  // --- AMORTIZACIONES ---
  const sheetAmort      = ss.getSheetByName(SHEET.AMORTIZACIONES);
  const sheetAmortFinal = sheetAmort || _crearHojaAmortizaciones(ss);

  if (amortizacion && amortizacion.length) {
    const rows = amortizacion.map(row => [
      simId,
      row.periodo,
      row.fecha ? new Date(row.fecha) : '',
      row.interes   || 0,
      row.capital   || 0,
      row.pagoTotal || 0,
      row.saldo     || 0,
    ]);
    // Escribir todo de una vez (más eficiente)
    const lastRow = sheetAmortFinal.getLastRow() + 1;
    sheetAmortFinal.getRange(lastRow, 1, rows.length, 7).setValues(rows);
  }

  return { ok: true, simId };
}

// =========================================================
// ACCIÓN: getHistorial
// Devuelve simulaciones filtradas por email (o todas)
// =========================================================
function getHistorial(email) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET.SIMULACIONES);

  if (!sheet || sheet.getLastRow() < 2) return { simulaciones: [] };

  const data = sheet.getDataRange().getValues();
  // Columnas fijas (coinciden con appendRow de guardarSimulacion)
  // 0=SimID, 1=Fecha, 2=Nombre, 3=Email, 4=Programa, ...
  // 18=CuotaFija, 19=TotalAPagar, 20=Plazos

  const simulaciones = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // fila vacía

    // Filtrar por email si se especificó
    if (email && row[3] && String(row[3]).toLowerCase() !== email.toLowerCase()) continue;

    simulaciones.push({
      simId:               String(row[0]  || ''),
      fechaStr:            String(row[1]  || ''),
      nombre:              String(row[2]  || ''),
      email:               String(row[3]  || ''),
      programa:            String(row[4]  || ''),
      tipoMotor:           String(row[5]  || ''),
      fondo:               String(row[6]  || ''),
      enganche:            Number(row[8]  || 0),
      precioContado:       Number(row[9]  || 0),
      precioFinanciamiento:Number(row[10] || 0),
      montoFinanciamiento: Number(row[11] || 0),
      gastosAdmin:         Number(row[12] || 0),
      seguroArgos:         Number(row[13] || 0),
      totalFinanciamiento: Number(row[14] || 0),
      porcentajeInteres:   Number(row[15] || 0),
      interesXPeriodo:     Number(row[16] || 0),
      totalIntereses:      Number(row[17] || 0),
      cuotaFija:           Number(row[18] || 0),
      totalAPagar:         Number(row[19] || 0),
      plazos:              Number(row[20] || 0),
      periodicidad:        String(row[21] || 'quincenal'),
    });
  }

  // Ordenar por fecha descendente (más reciente primero)
  simulaciones.sort((a, b) => new Date(b.fechaStr) - new Date(a.fechaStr));

  return { simulaciones };
}

// =========================================================
// ACCIÓN: getAmortizacion
// Devuelve todas las filas de amortización de un SimID
// =========================================================
function getAmortizacion(simId) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET.AMORTIZACIONES);

  if (!sheet || sheet.getLastRow() < 2) return { filas: [] };

  const data  = sheet.getDataRange().getValues();
  // 0=SimID, 1=Periodo, 2=Fecha, 3=Interes, 4=Capital, 5=PagoTotal, 6=Saldo

  const filas = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[0]) !== String(simId)) continue;
    filas.push({
      periodo:   Number(row[1] || 0),
      fecha:     row[2] ? new Date(row[2]).toISOString() : '',
      interes:   Number(row[3] || 0),
      capital:   Number(row[4] || 0),
      pagoTotal: Number(row[5] || 0),
      saldo:     Number(row[6] || 0),
    });
  }

  return { filas };
}

// =========================================================
// HELPERS: crear hojas con encabezados si no existen
// =========================================================
function _crearHojaSimulaciones(ss) {
  const sheet = ss.insertSheet(SHEET.SIMULACIONES);
  sheet.appendRow([
    'SimID', 'FechaRegistro', 'Solicitante', 'Email', 'Programa',
    'TipoMotor', 'Fondo', 'FechaInicio', 'Enganche',
    'PrecioContado', 'PrecioFinanciamiento', 'MontoFinanciamiento',
    'GastosAdmin', 'SeguroArgos', 'TotalFinanciamiento',
    'PorcentajeInteres', 'InteresXPeriodo', 'TotalIntereses',
    'CuotaFija', 'TotalAPagar', 'Plazos', 'Periodicidad',
  ]);
  // Congelar primera fila y formatear
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, 22)
    .setBackground('#1a73e8')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  return sheet;
}

function _crearHojaAmortizaciones(ss) {
  const sheet = ss.insertSheet(SHEET.AMORTIZACIONES);
  sheet.appendRow(['SimID', 'Periodo', 'Fecha', 'Interes', 'Capital', 'PagoTotal', 'Saldo']);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, 7)
    .setBackground('#1a73e8')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  return sheet;
}

// =========================================================
// FUNCIÓN DE SETUP INICIAL
// Ejecutar UNA SOLA VEZ desde el editor de Apps Script
// para crear todas las hojas con su estructura
// =========================================================
function setupInicial() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // --- PROGRAMAS ---
  let sheetProg = ss.getSheetByName(SHEET.PROGRAMAS);
  if (!sheetProg) {
    sheetProg = ss.insertSheet(SHEET.PROGRAMAS);
  }
  // Encabezados de PROGRAMAS
  sheetProg.getRange(1, 1, 1, 18).setValues([[
    'ID', 'Nombre', 'TipoMotor', 'Encabezado', 'Icono', 'LogoBase64',
    'PrecioContado', 'PrecioFinanciamiento', 'GastosAdmin', 'SeguroArgos',
    'InteresCajaChica', 'InteresSuptiexpress',
    'PlazoMaximo', 'Periodicidad', 'EngancheMinimo', 'Activo',
    'Notas', 'FechaUltimaEdicion',
  ]]);
  sheetProg.setFrozenRows(1);
  sheetProg.getRange(1, 1, 1, 18)
    .setBackground('#1a73e8')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  // Filas de ejemplo (los 3 programas actuales)
  const ejemplos = [
    ['1', 'Cirugías', 'motor_standard', 'Plan de Créditos - Cirugías', '🏥', '',
     87000, 0, 2500, 640, 0.03, 0.05, 24, 'quincenal', 0, 'TRUE', '', ''],
    ['2', 'Viajes', 'motor_standard', 'Plan de Créditos - Viajes', '✈️', '',
     28000, 0, 2500, 640, 0.03, 0.05, 24, 'quincenal', 0, 'TRUE', '', ''],
    ['3', 'Autos', 'motor_autos', 'Corrida Financiera - Adquisición de Automóvil', '🚗', '',
     0, 120000, 0, 0, 0, 0, 48, 'quincenal', 0, 'TRUE', '', ''],
  ];
  sheetProg.getRange(2, 1, ejemplos.length, 18).setValues(ejemplos);

  // --- SIMULACIONES ---
  let sheetSim = ss.getSheetByName(SHEET.SIMULACIONES);
  if (!sheetSim) _crearHojaSimulaciones(ss);

  // --- AMORTIZACIONES ---
  let sheetAmort = ss.getSheetByName(SHEET.AMORTIZACIONES);
  if (!sheetAmort) _crearHojaAmortizaciones(ss);

  Logger.log('✅ Setup completo. Hojas creadas: PROGRAMAS, SIMULACIONES, AMORTIZACIONES');
}
