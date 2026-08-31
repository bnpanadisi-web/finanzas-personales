import { Transaction } from '@/types';
import { formatMonthYear } from '@/lib/formatters';

export interface ExportFilterOptions {
  periodo: 'actual' | 'mes' | 'rango' | 'todos';
  mes?: number;
  anio?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  tipo: 'todos' | 'gasto' | 'ingreso';
  moneda: 'todas' | 'ARS' | 'USD';
}

/**
 * Filtra las transacciones según los criterios seleccionados para la exportación.
 */
export function filtrarTransaccionesParaExportar(
  transacciones: Transaction[],
  opciones: ExportFilterOptions,
  mesActual: number,
  anioActual: number
): { transaccionesFiltradas: Transaction[]; descripcionPeriodo: string } {
  let filtradas = [...transacciones];
  let descPeriodo = 'Todo el Historial';

  // 1. Filtro por Período
  if (opciones.periodo === 'actual') {
    descPeriodo = formatMonthYear(mesActual, anioActual);
    filtradas = filtradas.filter(t => {
      const d = new Date(t.fecha + 'T00:00:00');
      return d.getMonth() + 1 === mesActual && d.getFullYear() === anioActual;
    });
  } else if (opciones.periodo === 'mes' && opciones.mes && opciones.anio) {
    descPeriodo = formatMonthYear(opciones.mes, opciones.anio);
    filtradas = filtradas.filter(t => {
      const d = new Date(t.fecha + 'T00:00:00');
      return d.getMonth() + 1 === opciones.mes && d.getFullYear() === opciones.anio;
    });
  } else if (opciones.periodo === 'rango' && opciones.fechaDesde && opciones.fechaHasta) {
    descPeriodo = `${opciones.fechaDesde} al ${opciones.fechaHasta}`;
    filtradas = filtradas.filter(
      t => t.fecha >= opciones.fechaDesde! && t.fecha <= opciones.fechaHasta!
    );
  }

  // 2. Filtro por Tipo
  if (opciones.tipo !== 'todos') {
    filtradas = filtradas.filter(t => t.tipo === opciones.tipo);
  }

  // 3. Filtro por Moneda
  if (opciones.moneda !== 'todas') {
    filtradas = filtradas.filter(t => (t.moneda || 'ARS') === opciones.moneda);
  }

  // Ordenar cronológicamente (más recientes primero)
  filtradas.sort((a, b) => b.fecha.localeCompare(a.fecha));

  return { transaccionesFiltradas: filtradas, descripcionPeriodo: descPeriodo };
}

/**
 * Genera un archivo Excel (.xlsx) altamente profesional con Resumen Ejecutivo,
 * KPIs, tablas por categoría, por cuenta y detalle completo con balances (Ingresos - Gastos).
 */
export async function generarExcelProfesional({
  transacciones,
  presupuestos = {},
  descripcionPeriodo,
}: {
  transacciones: Transaction[];
  presupuestos?: Record<string, number>;
  descripcionPeriodo: string;
}): Promise<void> {
  const ExcelJSModule = await import('exceljs');
  const ExcelJS = (ExcelJSModule.default || ExcelJSModule) as typeof import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mis Finanzas Personales Web App';
  workbook.created = new Date();

  // ==========================================
  // CÁLCULOS PRINCIPALES
  // ==========================================
  const ingresosARS = transacciones
    .filter(t => t.tipo === 'ingreso' && (t.moneda || 'ARS') === 'ARS')
    .reduce((acc, t) => acc + Number(t.monto), 0);

  const gastosARS = transacciones
    .filter(t => t.tipo === 'gasto' && (t.moneda || 'ARS') === 'ARS')
    .reduce((acc, t) => acc + Number(t.monto), 0);

  const balanceARS = ingresosARS - gastosARS;

  const ingresosUSD = transacciones
    .filter(t => t.tipo === 'ingreso' && t.moneda === 'USD')
    .reduce((acc, t) => acc + Number(t.monto), 0);

  const gastosUSD = transacciones
    .filter(t => t.tipo === 'gasto' && t.moneda === 'USD')
    .reduce((acc, t) => acc + Number(t.monto), 0);

  const balanceUSD = ingresosUSD - gastosUSD;

  // Agrupación por Categorías (Gastos ARS)
  const gastosPorCatARS: Record<string, { total: number; cantidad: number }> = {};
  transacciones
    .filter(t => t.tipo === 'gasto' && (t.moneda || 'ARS') === 'ARS')
    .forEach(t => {
      if (!gastosPorCatARS[t.categoria]) {
        gastosPorCatARS[t.categoria] = { total: 0, cantidad: 0 };
      }
      gastosPorCatARS[t.categoria].total += Number(t.monto);
      gastosPorCatARS[t.categoria].cantidad += 1;
    });

  const categoriasGastosOrdenadas = Object.entries(gastosPorCatARS).sort(
    (a, b) => b[1].total - a[1].total
  );

  // Agrupación por Cuentas
  const cuentasUnicas = Array.from(
    new Set(transacciones.flatMap(t => [t.cuenta, t.cuentaDestino]).filter(Boolean))
  ) as string[];

  // ==========================================
  // HOJA 1: RESUMEN EJECUTIVO
  // ==========================================
  const sheetResumen = workbook.addWorksheet('📊 Resumen Ejecutivo', {
    views: [{ showGridLines: true }],
  });

  // Anchos de columnas
  sheetResumen.columns = [
    { width: 4 },  // A (Margen)
    { width: 28 }, // B
    { width: 18 }, // C
    { width: 16 }, // D
    { width: 24 }, // E (Barra Visual)
    { width: 16 }, // F
    { width: 16 }, // G
  ];

  // 1. Título Corporativo
  sheetResumen.mergeCells('B2:G2');
  const titleCell = sheetResumen.getCell('B2');
  titleCell.value = 'REPORTE FINANCIERO PERSONAL';
  titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheetResumen.getRow(2).height = 36;

  // Subtítulo
  sheetResumen.mergeCells('B3:G3');
  const subTitleCell = sheetResumen.getCell('B3');
  subTitleCell.value = `Período: ${descripcionPeriodo}  |  Generado: ${new Date().toLocaleDateString('es-AR')}  |  Total Movimientos: ${transacciones.length}`;
  subTitleCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FFCBD5E1' } };
  subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheetResumen.getRow(3).height = 20;

  // 2. Tarjetas de Métricas Principales (KPIs)
  sheetResumen.getRow(5).height = 14;

  // Encabezados KPI ARS
  sheetResumen.getCell('B6').value = '📈 TOTAL INGRESOS (ARS)';
  sheetResumen.getCell('B6').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF065F46' } };
  sheetResumen.getCell('B6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
  sheetResumen.getCell('B6').alignment = { horizontal: 'center', vertical: 'middle' };

  sheetResumen.getCell('C6').value = '📉 TOTAL GASTOS (ARS)';
  sheetResumen.getCell('C6').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF991B1B' } };
  sheetResumen.getCell('C6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
  sheetResumen.getCell('C6').alignment = { horizontal: 'center', vertical: 'middle' };

  sheetResumen.getCell('D6').value = '⚖️ BALANCE NETO (ARS)';
  sheetResumen.getCell('D6').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF1E40AF' } };
  sheetResumen.getCell('D6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  sheetResumen.getCell('D6').alignment = { horizontal: 'center', vertical: 'middle' };

  // Valores KPI ARS
  sheetResumen.getCell('B7').value = ingresosARS;
  sheetResumen.getCell('B7').numFmt = '$ #,##0.00';
  sheetResumen.getCell('B7').font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF047857' } };
  sheetResumen.getCell('B7').alignment = { horizontal: 'center', vertical: 'middle' };

  sheetResumen.getCell('C7').value = gastosARS;
  sheetResumen.getCell('C7').numFmt = '$ #,##0.00';
  sheetResumen.getCell('C7').font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFDC2626' } };
  sheetResumen.getCell('C7').alignment = { horizontal: 'center', vertical: 'middle' };

  sheetResumen.getCell('D7').value = balanceARS;
  sheetResumen.getCell('D7').numFmt = '$ #,##0.00';
  sheetResumen.getCell('D7').font = {
    name: 'Segoe UI',
    size: 13,
    bold: true,
    color: { argb: balanceARS >= 0 ? 'FF1E40AF' : 'FFDC2626' },
  };
  sheetResumen.getCell('D7').alignment = { horizontal: 'center', vertical: 'middle' };

  // Encabezados KPI USD
  sheetResumen.getCell('E6').value = '💵 INGRESOS (USD)';
  sheetResumen.getCell('E6').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF065F46' } };
  sheetResumen.getCell('E6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
  sheetResumen.getCell('E6').alignment = { horizontal: 'center', vertical: 'middle' };

  sheetResumen.getCell('F6').value = '💵 GASTOS (USD)';
  sheetResumen.getCell('F6').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF991B1B' } };
  sheetResumen.getCell('F6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
  sheetResumen.getCell('F6').alignment = { horizontal: 'center', vertical: 'middle' };

  sheetResumen.getCell('G6').value = '💵 BALANCE (USD)';
  sheetResumen.getCell('G6').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF1E40AF' } };
  sheetResumen.getCell('G6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  sheetResumen.getCell('G6').alignment = { horizontal: 'center', vertical: 'middle' };

  // Valores KPI USD
  sheetResumen.getCell('E7').value = ingresosUSD;
  sheetResumen.getCell('E7').numFmt = 'US$ #,##0.00';
  sheetResumen.getCell('E7').font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF047857' } };
  sheetResumen.getCell('E7').alignment = { horizontal: 'center', vertical: 'middle' };

  sheetResumen.getCell('F7').value = gastosUSD;
  sheetResumen.getCell('F7').numFmt = 'US$ #,##0.00';
  sheetResumen.getCell('F7').font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFDC2626' } };
  sheetResumen.getCell('F7').alignment = { horizontal: 'center', vertical: 'middle' };

  sheetResumen.getCell('G7').value = balanceUSD;
  sheetResumen.getCell('G7').numFmt = 'US$ #,##0.00';
  sheetResumen.getCell('G7').font = {
    name: 'Segoe UI',
    size: 12,
    bold: true,
    color: { argb: balanceUSD >= 0 ? 'FF1E40AF' : 'FFDC2626' },
  };
  sheetResumen.getCell('G7').alignment = { horizontal: 'center', vertical: 'middle' };

  sheetResumen.getRow(6).height = 22;
  sheetResumen.getRow(7).height = 28;

  // Bordes para los KPIs
  ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
    ['6', '7'].forEach(row => {
      sheetResumen.getCell(`${col}${row}`).border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    });
  });

  // 3. Tabla: Distribución de Gastos por Categoría
  let filaActual = 10;
  sheetResumen.mergeCells(`B${filaActual}:E${filaActual}`);
  sheetResumen.getCell(`B${filaActual}`).value = '🏷️ DISTRIBUCIÓN DE GASTOS POR CATEGORÍA (ARS)';
  sheetResumen.getCell(`B${filaActual}`).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  sheetResumen.getCell(`B${filaActual}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  sheetResumen.getCell(`B${filaActual}`).alignment = { vertical: 'middle', indent: 1 };
  sheetResumen.getRow(filaActual).height = 24;

  filaActual++;
  const headersCat = ['Categoría', 'Total Gastado (ARS)', '% del Total', 'Distribución Visual'];
  const colsCat = ['B', 'C', 'D', 'E'];
  headersCat.forEach((h, idx) => {
    const c = sheetResumen.getCell(`${colsCat[idx]}${filaActual}`);
    c.value = h;
    c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    c.alignment = { vertical: 'middle', horizontal: idx === 0 ? 'left' : 'center' };
    c.border = { bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } } };
  });
  sheetResumen.getRow(filaActual).height = 20;

  filaActual++;
  categoriasGastosOrdenadas.forEach(([cat, { total }]) => {
    const porcentaje = gastosARS > 0 ? total / gastosARS : 0;
    const barrasLlenas = Math.round(porcentaje * 20);
    const barraGrafica = '█'.repeat(barrasLlenas) + '░'.repeat(Math.max(0, 20 - barrasLlenas));

    sheetResumen.getCell(`B${filaActual}`).value = cat;
    sheetResumen.getCell(`B${filaActual}`).font = { name: 'Segoe UI', size: 10, bold: true };

    sheetResumen.getCell(`C${filaActual}`).value = total;
    sheetResumen.getCell(`C${filaActual}`).numFmt = '$ #,##0.00';
    sheetResumen.getCell(`C${filaActual}`).font = { name: 'Segoe UI', size: 10 };
    sheetResumen.getCell(`C${filaActual}`).alignment = { horizontal: 'right' };

    sheetResumen.getCell(`D${filaActual}`).value = porcentaje;
    sheetResumen.getCell(`D${filaActual}`).numFmt = '0.0%';
    sheetResumen.getCell(`D${filaActual}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF64748B' } };
    sheetResumen.getCell(`D${filaActual}`).alignment = { horizontal: 'center' };

    sheetResumen.getCell(`E${filaActual}`).value = `${barraGrafica} ${(porcentaje * 100).toFixed(1)}%`;
    sheetResumen.getCell(`E${filaActual}`).font = { name: 'Consolas', size: 9, color: { argb: 'FF0284C7' } };
    sheetResumen.getCell(`E${filaActual}`).alignment = { horizontal: 'left' };

    sheetResumen.getRow(filaActual).height = 19;
    filaActual++;
  });

  // Fila Total Categorías
  sheetResumen.getCell(`B${filaActual}`).value = 'TOTAL GASTOS:';
  sheetResumen.getCell(`B${filaActual}`).font = { name: 'Segoe UI', size: 10, bold: true };
  sheetResumen.getCell(`C${filaActual}`).value = gastosARS;
  sheetResumen.getCell(`C${filaActual}`).numFmt = '$ #,##0.00';
  sheetResumen.getCell(`C${filaActual}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } };
  sheetResumen.getCell(`C${filaActual}`).alignment = { horizontal: 'right' };
  sheetResumen.getCell(`D${filaActual}`).value = 1;
  sheetResumen.getCell(`D${filaActual}`).numFmt = '100.0%';
  sheetResumen.getCell(`D${filaActual}`).font = { name: 'Segoe UI', size: 10, bold: true };
  sheetResumen.getCell(`D${filaActual}`).alignment = { horizontal: 'center' };
  sheetResumen.getRow(filaActual).height = 22;

  // 4. Tabla: Flujo por Cuenta / Billetera
  filaActual += 3;
  sheetResumen.mergeCells(`B${filaActual}:E${filaActual}`);
  sheetResumen.getCell(`B${filaActual}`).value = '💳 MOVIMIENTOS POR BILLETERA / CUENTA';
  sheetResumen.getCell(`B${filaActual}`).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  sheetResumen.getCell(`B${filaActual}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  sheetResumen.getCell(`B${filaActual}`).alignment = { vertical: 'middle', indent: 1 };
  sheetResumen.getRow(filaActual).height = 24;

  filaActual++;
  const headersCuentas = ['Cuenta', 'Ingresos (ARS)', 'Gastos (ARS)', 'Balance Período'];
  headersCuentas.forEach((h, idx) => {
    const c = sheetResumen.getCell(`${colsCat[idx]}${filaActual}`);
    c.value = h;
    c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    c.alignment = { vertical: 'middle', horizontal: idx === 0 ? 'left' : 'center' };
    c.border = { bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } } };
  });
  sheetResumen.getRow(filaActual).height = 20;

  filaActual++;
  cuentasUnicas.forEach(cuenta => {
    const ing = transacciones
      .filter(t => t.tipo === 'ingreso' && t.cuenta === cuenta && (t.moneda || 'ARS') === 'ARS')
      .reduce((sum, t) => sum + Number(t.monto), 0);

    const gst = transacciones
      .filter(t => t.tipo === 'gasto' && t.cuenta === cuenta && (t.moneda || 'ARS') === 'ARS')
      .reduce((sum, t) => sum + Number(t.monto), 0);

    const bal = ing - gst;

    sheetResumen.getCell(`B${filaActual}`).value = cuenta;
    sheetResumen.getCell(`B${filaActual}`).font = { name: 'Segoe UI', size: 10, bold: true };

    sheetResumen.getCell(`C${filaActual}`).value = ing;
    sheetResumen.getCell(`C${filaActual}`).numFmt = '$ #,##0.00';
    sheetResumen.getCell(`C${filaActual}`).font = { name: 'Segoe UI', size: 10, color: { argb: 'FF047857' } };
    sheetResumen.getCell(`C${filaActual}`).alignment = { horizontal: 'right' };

    sheetResumen.getCell(`D${filaActual}`).value = gst;
    sheetResumen.getCell(`D${filaActual}`).numFmt = '$ #,##0.00';
    sheetResumen.getCell(`D${filaActual}`).font = { name: 'Segoe UI', size: 10, color: { argb: 'FFDC2626' } };
    sheetResumen.getCell(`D${filaActual}`).alignment = { horizontal: 'right' };

    sheetResumen.getCell(`E${filaActual}`).value = bal;
    sheetResumen.getCell(`E${filaActual}`).numFmt = '$ #,##0.00';
    sheetResumen.getCell(`E${filaActual}`).font = {
      name: 'Segoe UI',
      size: 10,
      bold: true,
      color: { argb: bal >= 0 ? 'FF1E40AF' : 'FFDC2626' },
    };
    sheetResumen.getCell(`E${filaActual}`).alignment = { horizontal: 'right' };

    sheetResumen.getRow(filaActual).height = 19;
    filaActual++;
  });

  // ==========================================
  // HOJA 2: DETALLE DE MOVIMIENTOS
  // ==========================================
  const sheetDetalle = workbook.addWorksheet('📝 Detalle de Movimientos', {
    views: [{ showGridLines: true }],
  });

  // Columnas sin "Modalidad / Cuotas"
  sheetDetalle.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Tipo', key: 'tipo', width: 15 },
    { header: 'Categoría', key: 'categoria', width: 22 },
    { header: 'Descripción', key: 'descripcion', width: 32 },
    { header: 'Cuenta Origen', key: 'cuenta', width: 20 },
    { header: 'Cuenta Destino', key: 'cuentaDestino', width: 20 },
    { header: 'Moneda', key: 'moneda', width: 10 },
    { header: 'Monto', key: 'monto', width: 18 },
    { header: 'Fijo / Recurrente', key: 'esRecurrente', width: 18 },
  ];

  // Estilo para el Header de Detalle
  const headerRow = sheetDetalle.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell(cell => {
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF38BDF8' } } };
  });

  // Carga de Filas de Movimientos
  transacciones.forEach((t, idx) => {
    const row = sheetDetalle.addRow({
      id: t.id,
      fecha: t.fecha,
      tipo: t.tipo.toUpperCase(),
      categoria: t.categoria,
      descripcion: t.descripcion || '-',
      cuenta: t.cuenta,
      cuentaDestino: t.cuentaDestino || '-',
      moneda: t.moneda || 'ARS',
      monto: Number(t.monto),
      esRecurrente: t.esRecurrente ? 'Sí (Gasto Fijo)' : 'No',
    });

    row.height = 20;

    // Zebra striping
    const isEven = idx % 2 === 0;
    const bgFill = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgFill } };
      cell.alignment = { vertical: 'middle' };

      // Formateo según columna
      if (colNumber === 1 || colNumber === 2 || colNumber === 8 || colNumber === 10) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNumber === 9) {
        cell.numFmt = (t.moneda || 'ARS') === 'USD' ? 'US$ #,##0.00' : '$ #,##0.00';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.font = {
          name: 'Segoe UI',
          size: 9,
          bold: true,
          color: {
            argb:
              t.tipo === 'ingreso'
                ? 'FF047857'
                : t.tipo === 'gasto'
                ? 'FFDC2626'
                : 'FF0284C7',
          },
        };
      } else if (colNumber === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = {
          name: 'Segoe UI',
          size: 9,
          bold: true,
          color: {
            argb:
              t.tipo === 'ingreso'
                ? 'FF047857'
                : t.tipo === 'gasto'
                ? 'FFDC2626'
                : 'FF0284C7',
          },
        };
      }
    });
  });

  // ==========================================
  // BALANCES COMPLETOS AL FINAL DEL DETALLE
  // ==========================================
  let rowFinDetalle = transacciones.length + 3;

  // 1. Total Ingresos ARS
  const rowIngresos = sheetDetalle.getRow(rowFinDetalle);
  rowIngresos.height = 22;
  sheetDetalle.getCell(`H${rowFinDetalle}`).value = '📈 TOTAL INGRESOS (ARS):';
  sheetDetalle.getCell(`H${rowFinDetalle}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF047857' } };
  sheetDetalle.getCell(`H${rowFinDetalle}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheetDetalle.getCell(`I${rowFinDetalle}`).value = ingresosARS;
  sheetDetalle.getCell(`I${rowFinDetalle}`).numFmt = '$ #,##0.00';
  sheetDetalle.getCell(`I${rowFinDetalle}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF047857' } };
  sheetDetalle.getCell(`I${rowFinDetalle}`).alignment = { horizontal: 'right', vertical: 'middle' };

  // 2. Total Gastos ARS
  rowFinDetalle++;
  const rowGastos = sheetDetalle.getRow(rowFinDetalle);
  rowGastos.height = 22;
  sheetDetalle.getCell(`H${rowFinDetalle}`).value = '📉 TOTAL GASTOS (ARS):';
  sheetDetalle.getCell(`H${rowFinDetalle}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } };
  sheetDetalle.getCell(`H${rowFinDetalle}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheetDetalle.getCell(`I${rowFinDetalle}`).value = gastosARS;
  sheetDetalle.getCell(`I${rowFinDetalle}`).numFmt = '$ #,##0.00';
  sheetDetalle.getCell(`I${rowFinDetalle}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } };
  sheetDetalle.getCell(`I${rowFinDetalle}`).alignment = { horizontal: 'right', vertical: 'middle' };

  // 3. Balance Neto ARS (Ingresos - Gastos)
  rowFinDetalle++;
  const rowBalance = sheetDetalle.getRow(rowFinDetalle);
  rowBalance.height = 25;
  sheetDetalle.getCell(`H${rowFinDetalle}`).value = '⚖️ BALANCE NETO ARS (Ingresos - Gastos):';
  sheetDetalle.getCell(`H${rowFinDetalle}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  sheetDetalle.getCell(`H${rowFinDetalle}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheetDetalle.getCell(`H${rowFinDetalle}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  sheetDetalle.getCell(`I${rowFinDetalle}`).value = balanceARS;
  sheetDetalle.getCell(`I${rowFinDetalle}`).numFmt = '$ #,##0.00';
  sheetDetalle.getCell(`I${rowFinDetalle}`).font = {
    name: 'Segoe UI',
    size: 11,
    bold: true,
    color: { argb: balanceARS >= 0 ? 'FF047857' : 'FFDC2626' },
  };
  sheetDetalle.getCell(`I${rowFinDetalle}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  sheetDetalle.getCell(`I${rowFinDetalle}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheetDetalle.getCell(`I${rowFinDetalle}`).border = {
    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'double', color: { argb: 'FF0F172A' } },
  };

  // Balances USD si existen
  if (ingresosUSD > 0 || gastosUSD > 0) {
    rowFinDetalle += 2;
    sheetDetalle.getCell(`H${rowFinDetalle}`).value = '💵 TOTAL INGRESOS (USD):';
    sheetDetalle.getCell(`H${rowFinDetalle}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF047857' } };
    sheetDetalle.getCell(`H${rowFinDetalle}`).alignment = { horizontal: 'right', vertical: 'middle' };
    sheetDetalle.getCell(`I${rowFinDetalle}`).value = ingresosUSD;
    sheetDetalle.getCell(`I${rowFinDetalle}`).numFmt = 'US$ #,##0.00';
    sheetDetalle.getCell(`I${rowFinDetalle}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF047857' } };

    rowFinDetalle++;
    sheetDetalle.getCell(`H${rowFinDetalle}`).value = '💵 TOTAL GASTOS (USD):';
    sheetDetalle.getCell(`H${rowFinDetalle}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } };
    sheetDetalle.getCell(`H${rowFinDetalle}`).alignment = { horizontal: 'right', vertical: 'middle' };
    sheetDetalle.getCell(`I${rowFinDetalle}`).value = gastosUSD;
    sheetDetalle.getCell(`I${rowFinDetalle}`).numFmt = 'US$ #,##0.00';
    sheetDetalle.getCell(`I${rowFinDetalle}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } };

    rowFinDetalle++;
    sheetDetalle.getCell(`H${rowFinDetalle}`).value = '💵 BALANCE NETO USD (Ingresos - Gastos):';
    sheetDetalle.getCell(`H${rowFinDetalle}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    sheetDetalle.getCell(`H${rowFinDetalle}`).alignment = { horizontal: 'right', vertical: 'middle' };
    sheetDetalle.getCell(`I${rowFinDetalle}`).value = balanceUSD;
    sheetDetalle.getCell(`I${rowFinDetalle}`).numFmt = 'US$ #,##0.00';
    sheetDetalle.getCell(`I${rowFinDetalle}`).font = {
      name: 'Segoe UI',
      size: 11,
      bold: true,
      color: { argb: balanceUSD >= 0 ? 'FF047857' : 'FFDC2626' },
    };
    sheetDetalle.getCell(`I${rowFinDetalle}`).border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
    };
  }

  // ==========================================
  // HOJA 3: PRESUPUESTOS Y METAS
  // ==========================================
  const entriesPresupuestos = Object.entries(presupuestos);
  if (entriesPresupuestos.length > 0) {
    const sheetPres = workbook.addWorksheet('🎯 Presupuestos y Metas', {
      views: [{ showGridLines: true }],
    });

    sheetPres.columns = [
      { header: 'Categoría', key: 'categoria', width: 24 },
      { header: 'Límite Presupuestado', key: 'limite', width: 22 },
      { header: 'Gasto Real (ARS)', key: 'gastado', width: 20 },
      { header: 'Saldo Disponible', key: 'disponible', width: 20 },
      { header: '% Ejecución', key: 'porcentaje', width: 16 },
      { header: 'Estado', key: 'estado', width: 18 },
    ];

    const presHeader = sheetPres.getRow(1);
    presHeader.height = 26;
    presHeader.eachCell(cell => {
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    entriesPresupuestos.forEach(([cat, limite]) => {
      const gastado = gastosPorCatARS[cat]?.total || 0;
      const disponible = limite - gastado;
      const porcentaje = limite > 0 ? gastado / limite : 0;
      let estado = '✅ En Meta';
      if (gastado > limite) estado = '🚨 Excedido';
      else if (porcentaje >= 0.8) estado = '⚠️ Cerca del Límite';

      const row = sheetPres.addRow({
        categoria: cat,
        limite: limite,
        gastado: gastado,
        disponible: disponible,
        porcentaje: porcentaje,
        estado: estado,
      });

      row.height = 20;
      row.getCell(2).numFmt = '$ #,##0.00';
      row.getCell(3).numFmt = '$ #,##0.00';
      row.getCell(4).numFmt = '$ #,##0.00';
      row.getCell(5).numFmt = '0.0%';

      row.getCell(6).alignment = { horizontal: 'center' };
      row.getCell(5).alignment = { horizontal: 'center' };
      row.getCell(4).font = { color: { argb: disponible >= 0 ? 'FF047857' : 'FFDC2626' }, bold: true };
    });
  }

  // ==========================================
  // DESCARGA EN EL NAVEGADOR
  // ==========================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const nombreLimpio = descripcionPeriodo.toLowerCase().replace(/[^a-z0-9]/g, '_');
  anchor.download = `reporte_finanzas_${nombreLimpio}_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
