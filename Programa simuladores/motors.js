/**
 * motors.js
 * =========================================================
 * MOTORES DE CÁLCULO FINANCIERO
 * Toda la lógica matemática vive aquí.
 * NO depende de Sheets ni de ninguna API externa.
 * Se ejecuta 100% en el navegador del usuario.
 *
 * MOTORES DISPONIBLES:
 *   - motor_standard : Cirugías, Viajes (interés flat quincenal)
 *   - motor_autos    : Autos (capital puro, sin interés)
 * =========================================================
 */

const MOTORS = {

  /**
   * =========================================================
   * MOTOR STANDARD
   * Usado por: Cirugías, Viajes
   *
   * LÓGICA (replicada exactamente de los Excel):
   *
   *   MontoFinanciamiento  = PrecioContado - Enganche
   *   TotalFinanciamiento  = MontoFinanciamiento + GastosAdmin + SeguroArgos
   *   InteresQuincenal     = TotalFinanciamiento × PorcentajeInteres
   *   TotalIntereses       = InteresQuincenal × Plazos
   *   TotalAPagar          = TotalFinanciamiento + TotalIntereses
   *   CuotaFija            = TotalAPagar / Plazos
   *
   * AMORTIZACIÓN:
   *   Saldo[0]     = TotalAPagar
   *   Saldo[n]     = Saldo[n-1] - CuotaFija
   *   (El interés es FLAT, no sobre saldo — se aplica igual cada quincena)
   *
   * @param {object} params
   * @param {number}  params.precioContado
   * @param {number}  params.enganche
   * @param {number}  params.gastosAdmin
   * @param {number}  params.seguroArgos
   * @param {number}  params.porcentajeInteres  - ej: 0.03 (Caja Chica) | 0.05 (SutiExpress)
   * @param {number}  params.plazos             - número de quincenas
   * @param {string}  params.periodicidad       - 'quincenal' | 'mensual' | 'semanal'
   * @param {Date}    params.fechaInicio
   * @returns {object} { resumen, amortizacion }
   * =========================================================
   */
  motor_standard(params) {
    const {
      precioContado,
      enganche,
      gastosAdmin,
      seguroArgos,
      porcentajeInteres,
      plazos,
      periodicidad = 'quincenal',
      fechaInicio,
    } = params;

    // --- Cálculos base ---
    const montoFinanciamiento  = precioContado - enganche;
    const totalFinanciamiento  = montoFinanciamiento + gastosAdmin + seguroArgos;
    const interesXPeriodo      = totalFinanciamiento * porcentajeInteres;
    const totalIntereses       = interesXPeriodo * plazos;
    const totalAPagar          = totalFinanciamiento + totalIntereses;
    const cuotaFija            = totalAPagar / plazos;

    const resumen = {
      precioContado,
      enganche,
      montoFinanciamiento,
      gastosAdmin,
      seguroArgos,
      totalFinanciamiento,
      porcentajeInteres,
      interesXPeriodo,
      totalIntereses,
      totalAPagar,
      cuotaFija,
      plazos,
      periodicidad,
    };

    // --- Tabla de amortización ---
    const amortizacion = [];
    let saldo = totalAPagar;

    for (let i = 1; i <= plazos; i++) {
      const fechaPago = MOTORS._sumarPeriodos(fechaInicio, i - 1, periodicidad);
      const pago = i < plazos ? cuotaFija : saldo; // último pago cierra exacto
      saldo = saldo - pago;

      amortizacion.push({
        periodo:    i,
        fecha:      fechaPago,
        interes:    interesXPeriodo,
        capital:    pago - interesXPeriodo,
        pagoTotal:  pago,
        saldo:      Math.max(0, saldo),
      });
    }

    return { resumen, amortizacion };
  },

  /**
   * =========================================================
   * MOTOR AUTOS
   * Usado por: Autos
   *
   * LÓGICA (replicada exactamente del Excel AUTOS):
   *
   *   MontoFinanciamiento  = PrecioFinanciamiento - Enganche
   *   CuotaFija            = MontoFinanciamiento / Plazos
   *   NO hay intereses (financiamiento puro a capital)
   *
   * AMORTIZACIÓN:
   *   Saldo[0]     = MontoFinanciamiento
   *   Saldo[n]     = Saldo[n-1] - CuotaFija
   *
   * @param {object} params
   * @param {number}  params.precioFinanciamiento - precio total del auto
   * @param {number}  params.enganche             - puede ser 0
   * @param {number}  params.gastosAdmin          - puede ser 0
   * @param {number}  params.seguroArgos          - puede ser 0
   * @param {number}  params.plazos
   * @param {string}  params.periodicidad         - 'quincenal' | 'mensual' | 'semanal'
   * @param {Date}    params.fechaInicio
   * @returns {object} { resumen, amortizacion }
   * =========================================================
   */
  motor_autos(params) {
    const {
      precioFinanciamiento,
      enganche      = 0,
      gastosAdmin   = 0,
      seguroArgos   = 0,
      plazos,
      periodicidad  = 'quincenal',
      fechaInicio,
    } = params;

    // --- Cálculos base ---
    const montoFinanciamiento = precioFinanciamiento - enganche + gastosAdmin + seguroArgos;
    const cuotaFija           = montoFinanciamiento / plazos;
    const totalAPagar         = montoFinanciamiento; // sin intereses

    const resumen = {
      precioFinanciamiento,
      enganche,
      gastosAdmin,
      seguroArgos,
      montoFinanciamiento,
      totalIntereses: 0,
      totalAPagar,
      cuotaFija,
      plazos,
      periodicidad,
    };

    // --- Tabla de amortización ---
    const amortizacion = [];
    let saldo = montoFinanciamiento;

    for (let i = 1; i <= plazos; i++) {
      const fechaPago = MOTORS._sumarPeriodos(fechaInicio, i - 1, periodicidad);
      const pago = i < plazos ? cuotaFija : saldo;
      saldo = saldo - pago;

      amortizacion.push({
        periodo:   i,
        fecha:     fechaPago,
        interes:   0,
        capital:   pago,
        pagoTotal: pago,
        saldo:     Math.max(0, saldo),
      });
    }

    return { resumen, amortizacion };
  },

  // =========================================================
  // UTILIDADES INTERNAS
  // =========================================================

  /**
   * Suma N períodos a una fecha según la periodicidad.
   * @param {Date}   base         - Fecha de inicio
   * @param {number} n            - Cuántos períodos sumar
   * @param {string} periodicidad - 'quincenal' | 'mensual' | 'semanal'
   * @returns {Date}
   */
  _sumarPeriodos(base, n, periodicidad) {
    const d = new Date(base);
    switch (periodicidad) {
      case 'quincenal':
        d.setDate(d.getDate() + n * 15);
        break;
      case 'mensual':
        d.setMonth(d.getMonth() + n);
        break;
      case 'semanal':
        d.setDate(d.getDate() + n * 7);
        break;
      default:
        d.setDate(d.getDate() + n * 15);
    }
    return d;
  },

  /**
   * Formatea un número como moneda MXN.
   * @param {number} n
   * @returns {string}
   */
  formatMoney(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  },

  /**
   * Formatea una fecha como DD/MM/YYYY.
   * @param {Date} d
   * @returns {string}
   */
  formatDate(d) {
    if (!d) return '—';
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  },

  /**
   * Formatea un porcentaje para mostrar.
   * @param {number} p - ej: 0.03
   * @returns {string} - ej: '3%'
   */
  formatPct(p) {
    return `${(p * 100).toFixed(p * 100 % 1 === 0 ? 0 : 1)}%`;
  },

  /**
   * Punto de entrada universal.
   * Despacha al motor correcto según el tipo de programa.
   * @param {string} tipoMotor - 'motor_standard' | 'motor_autos'
   * @param {object} params
   * @returns {object} { resumen, amortizacion }
   */
  calcular(tipoMotor, params) {
    if (typeof MOTORS[tipoMotor] !== 'function') {
      throw new Error(`Motor desconocido: ${tipoMotor}`);
    }
    return MOTORS[tipoMotor](params);
  },
};
