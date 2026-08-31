'use client';
import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Calendar,
  Layers,
  DollarSign,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { Transaction } from '@/types';
import { getCurrentDateInfo } from '@/lib/formatters';
import { MESES_NOMBRES } from '@/lib/constants';
import {
  ExportFilterOptions,
  filtrarTransaccionesParaExportar,
  generarExcelProfesional,
} from '@/services/exportExcel';
import { useToast } from '@/components/ui/Toast';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transacciones: Transaction[];
  darkMode: boolean;
}

export function ExportModal({
  isOpen,
  onClose,
  transacciones,
  darkMode,
}: ExportModalProps) {
  const { mes: mesActual, anio: anioActual, isoString } = getCurrentDateInfo();
  const { toast } = useToast();

  // Estados del formulario de exportación
  const [periodo, setPeriodo] = useState<'actual' | 'mes' | 'rango' | 'todos'>('actual');
  const [mesSeleccionado, setMesSeleccionado] = useState<number>(mesActual);
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(anioActual);
  const [fechaDesde, setFechaDesde] = useState<string>(() => `${anioActual}-${String(mesActual).padStart(2, '0')}-01`);
  const [fechaHasta, setFechaHasta] = useState<string>(isoString);
  const [tipo, setTipo] = useState<'todos' | 'gasto' | 'ingreso'>('todos');
  const [moneda, setMoneda] = useState<'todas' | 'ARS' | 'USD'>('todas');
  const [generando, setGenerando] = useState(false);

  // Previsualizar registros coincidentes
  const { transaccionesFiltradas, descripcionPeriodo } = useMemo(() => {
    const opciones: ExportFilterOptions = {
      periodo,
      mes: mesSeleccionado,
      anio: anioSeleccionado,
      fechaDesde,
      fechaHasta,
      tipo,
      moneda,
    };
    return filtrarTransaccionesParaExportar(transacciones, opciones, mesActual, anioActual);
  }, [
    transacciones,
    periodo,
    mesSeleccionado,
    anioSeleccionado,
    fechaDesde,
    fechaHasta,
    tipo,
    moneda,
    mesActual,
    anioActual,
  ]);

  if (!isOpen) return null;

  const handleExportar = async () => {
    if (transaccionesFiltradas.length === 0) {
      toast('No hay movimientos que coincidan con los filtros seleccionados', 'warning');
      return;
    }

    setGenerando(true);
    try {
      // Cargar presupuestos guardados si existen
      let presupuestosObj: Record<string, number> = {};
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('finanzas_budgets');
        if (raw) presupuestosObj = JSON.parse(raw);
      }

      await generarExcelProfesional({
        transacciones: transaccionesFiltradas,
        presupuestos: presupuestosObj,
        descripcionPeriodo,
      });

      toast(`Reporte Excel generado con éxito (${transaccionesFiltradas.length} registros)`, 'success');
      onClose();
    } catch (err) {
      console.error(err);
      toast('Hubo un error al generar el archivo Excel', 'error');
    } finally {
      setGenerando(false);
    }
  };

  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputBg = darkMode
    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div
        className={`${cardBg} p-5 sm:p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl border text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto`}
      >
        {/* Header del Modal */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Exportar a Excel</h3>
              <p className="text-[11px] text-slate-400">Reporte profesional con resumen, KPIs y balances</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Selección de Período */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Calendar size={14} className="text-sky-500" />
            <span>Período de tiempo:</span>
          </label>

          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setPeriodo('actual')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                periodo === 'actual'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Mes Actual
            </button>
            <button
              type="button"
              onClick={() => setPeriodo('mes')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                periodo === 'mes'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Elegir Mes
            </button>
            <button
              type="button"
              onClick={() => setPeriodo('rango')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                periodo === 'rango'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Rango de Fechas
            </button>
            <button
              type="button"
              onClick={() => setPeriodo('todos')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                periodo === 'todos'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Todo el Historial
            </button>
          </div>

          {/* Subcontroles según el período */}
          {periodo === 'mes' && (
            <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
              <select
                value={mesSeleccionado}
                onChange={e => setMesSeleccionado(Number(e.target.value))}
                className={`p-2 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
              >
                {MESES_NOMBRES.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={anioSeleccionado}
                onChange={e => setAnioSeleccionado(Number(e.target.value))}
                className={`p-2 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
              >
                {[2024, 2025, 2026, 2027, 2028].map(a => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          )}

          {periodo === 'rango' && (
            <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Desde:</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={e => setFechaDesde(e.target.value)}
                  className={`w-full p-2 border rounded-xl text-xs font-medium outline-none ${inputBg}`}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Hasta:</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={e => setFechaHasta(e.target.value)}
                  className={`w-full p-2 border rounded-xl text-xs font-medium outline-none ${inputBg}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Filtros de Tipo y Moneda */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
              <Layers size={13} className="text-violet-500" />
              <span>Tipo:</span>
            </label>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value as 'todos' | 'gasto' | 'ingreso')}
              className={`w-full p-2 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
            >
              <option value="todos">Todos los Tipos</option>
              <option value="gasto">Solo Gastos</option>
              <option value="ingreso">Solo Ingresos</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
              <DollarSign size={13} className="text-emerald-500" />
              <span>Moneda:</span>
            </label>
            <select
              value={moneda}
              onChange={e => setMoneda(e.target.value as 'todas' | 'ARS' | 'USD')}
              className={`w-full p-2 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
            >
              <option value="todas">Bimonetario (ARS y USD)</option>
              <option value="ARS">Solo Pesos (ARS)</option>
              <option value="USD">Solo Dólares (USD)</option>
            </select>
          </div>
        </div>

        {/* Resumen de Previsualización */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
            <span>
              Período: <strong className="text-slate-800 dark:text-white">{descripcionPeriodo}</strong>
            </span>
          </div>
          <span className="font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
            {transaccionesFiltradas.length} mov.
          </span>
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExportar}
            disabled={generando || transaccionesFiltradas.length === 0}
            className={`flex-1 py-3 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 ${
              generando || transaccionesFiltradas.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Download size={15} />
            <span>{generando ? 'Generando...' : 'Descargar Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
