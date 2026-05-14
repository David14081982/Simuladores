/**
 * config.js
 * Configuración global del simulador.
 * ÚNICO LUGAR donde cambiar la URL del backend.
 */

const CONFIG = {
  // ⚠️ CAMBIAR ESTA URL después de desplegar el Apps Script como Web App
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwTKjoCqcMcw9PqallY6TWcB4DWM8y2Uy52YiMfQFAt5N9iYsfRVReGTxBPUfMZIEogbw/exec',

  // Iconos por defecto para tipos de programa (el admin puede sobreescribir)
  PROGRAM_ICONS: {
    cirugia: '🏥',
    viaje: '✈️',
    auto: '🚗',
    moto: '🏍️',
    dental: '🦷',
    escolar: '📚',
    funerario: '🌸',
    default: '💳',
  },

  // Periodicidades soportadas
  PERIODICIDADES: {
    quincenal: { label: 'quincenas', diasPeriodo: 15 },
    mensual: { label: 'meses', diasPeriodo: 30 },
    semanal: { label: 'semanas', diasPeriodo: 7 },
  },

  // Versión del simulador (para logs)
  VERSION: '1.0.0',
};
