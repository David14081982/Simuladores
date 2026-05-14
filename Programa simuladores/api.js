/**
 * api.js
 * Capa de comunicación con el backend Google Apps Script.
 * Toda llamada a Sheets pasa por aquí.
 * El frontend NUNCA llama directamente a Sheets.
 */

const API = {

  /**
   * Llamada genérica al Apps Script.
   * @param {string} action  - Nombre de la acción en el backend
   * @param {object} payload - Datos a enviar
   * @returns {Promise<object>}
   */
  async call(action, payload = {}) {
    const url = new URL(CONFIG.APPS_SCRIPT_URL);
    url.searchParams.set('action', action);

    const res = await fetch(url.toString(), {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' }, // Apps Script requiere text/plain para evitar CORS preflight
      body:    JSON.stringify({ action, ...payload }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  },

  // ---------------------------------------------------------
  // PROGRAMAS
  // ---------------------------------------------------------

  /**
   * Obtiene todos los programas activos desde la hoja PROGRAMAS.
   * @returns {Promise<Program[]>}
   */
  async getProgramas() {
    const data = await this.call('getProgramas');
    return data.programas || [];
  },

  // ---------------------------------------------------------
  // SIMULACIONES
  // ---------------------------------------------------------

  /**
   * Guarda una simulación completa (cabecera + amortización).
   * @param {object} simulacion - Objeto con datos del crédito
   * @param {object[]} amortizacion - Filas de la tabla
   * @returns {Promise<{simId: string}>}
   */
  async guardarSimulacion(simulacion, amortizacion) {
    const data = await this.call('guardarSimulacion', { simulacion, amortizacion });
    return data; // { simId, ok }
  },

  /**
   * Obtiene el historial de simulaciones.
   * Si se pasa email, filtra por ese usuario.
   * @param {string} [email]
   * @returns {Promise<Simulacion[]>}
   */
  async getHistorial(email = '') {
    const data = await this.call('getHistorial', { email });
    return data.simulaciones || [];
  },

  /**
   * Obtiene la amortización completa de una simulación guardada.
   * @param {string} simId
   * @returns {Promise<AmortRow[]>}
   */
  async getAmortizacion(simId) {
    const data = await this.call('getAmortizacion', { simId });
    return data.filas || [];
  },
};
