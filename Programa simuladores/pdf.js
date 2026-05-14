/**
 * pdf.js
 * =========================================================
 * GENERACIÓN DE PDF
 * Usa jsPDF + jspdf-autotable (cargados desde CDN).
 * 100% cliente, sin servicios externos de pago.
 * =========================================================
 */

const PDF = {

  /**
   * Genera y descarga el PDF de una simulación.
   * @param {object} programa     - Datos del programa (nombre, encabezado, logo)
   * @param {object} simulacion   - Datos del solicitante y resumen
   * @param {object[]} amortizacion - Filas de la tabla
   */
  generar(programa, simulacion, amortizacion) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageW  = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = margin;

    // --- COLORES ---
    const colorPrimario = [26, 115, 232];   // azul
    const colorTexto    = [31, 41, 55];
    const colorMuted    = [107, 114, 128];

    // -------------------------------------------------------
    // ENCABEZADO
    // -------------------------------------------------------
    // Barra de color superior
    doc.setFillColor(...colorPrimario);
    doc.rect(0, 0, pageW, 22, 'F');

    // Logo (si existe)
    if (programa.logoBase64) {
      try {
        doc.addImage(programa.logoBase64, 'PNG', margin, 3, 16, 16);
      } catch (_) { /* logo inválido, se ignora */ }
    }

    // Nombre del programa (encabezado)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const encabezado = programa.encabezado || programa.nombre || 'Simulador de Créditos';
    doc.text(encabezado, pageW / 2, 13, { align: 'center' });

    y = 28;

    // Subtítulo — "CORRIDA FINANCIERA"
    doc.setTextColor(...colorPrimario);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CORRIDA FINANCIERA — PLAN DE DESCUENTOS POR VÍA NÓMINA', pageW / 2, y, { align: 'center' });
    y += 7;

    // Línea divisora
    doc.setDrawColor(...colorPrimario);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    // -------------------------------------------------------
    // DATOS DEL SOLICITANTE
    // -------------------------------------------------------
    doc.setTextColor(...colorTexto);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL SOLICITANTE', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const datosPersonales = [
      ['Solicitante:', simulacion.nombre || '—'],
      ['Programa:',   programa.nombre    || '—'],
      ['Fecha:',      simulacion.fechaStr || '—'],
      ['Email:',      simulacion.email   || '—'],
    ];

    const colW = (pageW - margin * 2) / 2;
    datosPersonales.forEach(([label, val], idx) => {
      const col = idx % 2;
      const xPos = margin + col * colW;
      if (col === 0 && idx > 0) y += 6;
      doc.setFont('helvetica', 'bold');
      doc.text(label, xPos, y);
      doc.setFont('helvetica', 'normal');
      doc.text(val, xPos + 28, y);
    });
    y += 10;

    // -------------------------------------------------------
    // RESUMEN FINANCIERO
    // -------------------------------------------------------
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...colorPrimario);
    doc.text('RESUMEN FINANCIERO', margin, y);
    y += 2;

    const resumenRows = PDF._buildResumenRows(programa, simulacion);

    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [],
      body: resumenRows,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: { top: 2, bottom: 2, left: 4, right: 4 },
        textColor: colorTexto,
      },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: colorMuted, cellWidth: 62 },
        1: { halign: 'right', fontStyle: 'bold' },
        2: { fontStyle: 'bold', textColor: colorMuted, cellWidth: 62 },
        3: { halign: 'right', fontStyle: 'bold' },
      },
      didDrawCell(data) {
        // Resaltar fila de total
        if (data.row.raw[0] === 'TOTAL A PAGAR:') {
          doc.setFillColor(232, 240, 254);
        }
      },
    });

    y = doc.lastAutoTable.finalY + 6;

    // -------------------------------------------------------
    // TABLA DE AMORTIZACIÓN
    // -------------------------------------------------------
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...colorPrimario);
    doc.text('TABLA DE AMORTIZACIÓN', margin, y);
    y += 2;

    const esAutos = programa.tipoMotor === 'motor_autos';
    const head    = esAutos
      ? [['#', 'Fecha', 'Cuota', 'Saldo']]
      : [['#', 'Fecha', 'Interés', 'Capital', 'Pago', 'Saldo']];

    const body = amortizacion.map(row => {
      if (esAutos) {
        return [
          row.periodo,
          MOTORS.formatDate(new Date(row.fecha)),
          MOTORS.formatMoney(row.pagoTotal),
          MOTORS.formatMoney(row.saldo),
        ];
      }
      return [
        row.periodo,
        MOTORS.formatDate(new Date(row.fecha)),
        MOTORS.formatMoney(row.interes),
        MOTORS.formatMoney(row.capital),
        MOTORS.formatMoney(row.pagoTotal),
        MOTORS.formatMoney(row.saldo),
      ];
    });

    // Fila de totales
    const totalPagos   = amortizacion.reduce((s, r) => s + r.pagoTotal, 0);
    const totalInteres = amortizacion.reduce((s, r) => s + r.interes, 0);
    const totalCapital = amortizacion.reduce((s, r) => s + r.capital, 0);

    const foot = esAutos
      ? [['', 'TOTAL', MOTORS.formatMoney(totalPagos), '']]
      : [['', 'TOTAL', MOTORS.formatMoney(totalInteres), MOTORS.formatMoney(totalCapital), MOTORS.formatMoney(totalPagos), '']];

    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head,
      body,
      foot,
      theme: 'grid',
      headStyles: {
        fillColor: colorPrimario,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'right',
      },
      bodyStyles: { fontSize: 7.5, halign: 'right', textColor: colorTexto },
      footStyles: {
        fillColor: [232, 240, 254],
        textColor: colorPrimario,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'right',
      },
      columnStyles: { 0: { halign: 'center' }, 1: { halign: 'center' } },
      alternateRowStyles: { fillColor: [248, 249, 252] },
    });

    y = doc.lastAutoTable.finalY + 8;

    // -------------------------------------------------------
    // PIE DE FIRMA
    // -------------------------------------------------------
    if (y > 250) { doc.addPage(); y = 20; }

    doc.setDrawColor(...colorMuted);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + 80, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...colorMuted);
    doc.text('Autorizo a descontar, acepto términos y condiciones', margin, y);
    y += 4;
    doc.text('Nombre y Firma', margin, y);

    // Número de página
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...colorMuted);
      doc.text(
        `Pág. ${i} / ${totalPages}`,
        pageW - margin,
        doc.internal.pageSize.getHeight() - 6,
        { align: 'right' },
      );
    }

    // -------------------------------------------------------
    // DESCARGAR
    // -------------------------------------------------------
    const nombreArchivo = `Simulacion_${(simulacion.nombre || 'cliente').replace(/\s+/g, '_')}_${programa.nombre.replace(/\s+/g, '_')}.pdf`;
    doc.save(nombreArchivo);
  },

  // -------------------------------------------------------
  // Helper: construir filas de resumen según motor
  // -------------------------------------------------------
  _buildResumenRows(programa, sim) {
    const f = MOTORS.formatMoney;
    const p = MOTORS.formatPct;

    if (programa.tipoMotor === 'motor_autos') {
      return [
        ['Precio de Financiamiento:',  f(sim.precioFinanciamiento), 'Plazo:',            `${sim.plazos} ${sim.periodicidadLabel}`],
        ['Enganche:',                  f(sim.enganche),             'Cuota Fija:',        f(sim.cuotaFija)],
        ['Gastos de Administración:',  f(sim.gastosAdmin),          'Total Intereses:',   f(0)],
        ['TOTAL A PAGAR:',             f(sim.totalAPagar),          '',                   ''],
      ];
    }

    // motor_standard
    return [
      ['Precio de Contado:',          f(sim.precioContado),        'Enganche:',                f(sim.enganche)],
      ['Monto de Financiamiento:',    f(sim.montoFinanciamiento),  'Gastos de Admin:',         f(sim.gastosAdmin)],
      ['Seguro Argos:',               f(sim.seguroArgos),          'Total de Financiamiento:', f(sim.totalFinanciamiento)],
      ['% Interés por período:',      p(sim.porcentajeInteres),    'Interés por período:',     f(sim.interesXPeriodo)],
      [`Plazo (${sim.periodicidadLabel}):`, String(sim.plazos),    'Total Intereses:',         f(sim.totalIntereses)],
      ['TOTAL A PAGAR:',              f(sim.totalAPagar),          'Cuota Fija:',              f(sim.cuotaFija)],
    ];
  },
};
