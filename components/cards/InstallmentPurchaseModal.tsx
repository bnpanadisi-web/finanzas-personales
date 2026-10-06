'use client';
import React, { useState } from 'react';
import { CreditCard, InstallmentPurchase, Currency, Category } from '@/types';
import { X, Check, ShoppingBag } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface InstallmentPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tarjetas: CreditCard[];
  tarjetaSeleccionadaId?: string | null;
  compraToEdit?: InstallmentPurchase | null;
  categorias?: Category[];
  onSave: (compra: Omit<InstallmentPurchase, 'id' | 'creadaEn'>) => void;
  darkMode?: boolean;
}

export function InstallmentPurchaseModal(props: InstallmentPurchaseModalProps) {
  if (!props.isOpen) return null;
  return <InstallmentPurchaseModalForm key={props.compraToEdit?.id ?? 'new'} {...props} />;
}

function InstallmentPurchaseModalForm({
  onClose,
  tarjetas,
  tarjetaSeleccionadaId,
  compraToEdit,
  categorias = [],
  onSave,
  darkMode = false,
}: InstallmentPurchaseModalProps) {
  const hoyIso = new Date().toISOString().split('T')[0];
  const mesActualIso = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const [tarjetaId, setTarjetaId] = useState<string>(
    compraToEdit?.tarjetaId || tarjetaSeleccionadaId || (tarjetas.length > 0 ? tarjetas[0].id : '')
  );
  const [descripcion, setDescripcion] = useState(compraToEdit?.descripcion || '');
  const [montoTotal, setMontoTotal] = useState<number | ''>(
    typeof compraToEdit?.montoTotal === 'number' ? compraToEdit.montoTotal : ''
  );
  const [moneda, setMoneda] = useState<Currency>(compraToEdit?.moneda || 'ARS');
  const [cuotasTotales, setCuotasTotales] = useState<number>(compraToEdit?.cuotasTotales || 6);
  const [fechaCompra, setFechaCompra] = useState<string>(compraToEdit?.fechaCompra || hoyIso);
  const [mesPrimerCuota, setMesPrimerCuota] = useState<string>(compraToEdit?.mesPrimerCuota || mesActualIso);
  const [categoria, setCategoria] = useState<string>(
    compraToEdit?.categoria || (categorias.length > 0 ? categorias[0].nombre : '')
  );
  const [cuotasPagasManuales, setCuotasPagasManuales] = useState<number | ''>(
    typeof compraToEdit?.cuotasPagasManuales === 'number' ? compraToEdit.cuotasPagasManuales : ''
  );
  const [notas, setNotas] = useState(compraToEdit?.notas || '');

  const { success, error } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tarjetaId) {
      error('Por favor selecciona una tarjeta de crédito.');
      return;
    }
    if (!descripcion.trim()) {
      error('Por favor ingresa la descripción o comercio.');
      return;
    }
    const montoNum = typeof montoTotal === 'number' ? montoTotal : parseFloat(String(montoTotal));
    if (!montoNum || montoNum <= 0) {
      error('Por favor ingresa un monto válido.');
      return;
    }
    if (cuotasTotales < 1) {
      error('La cantidad de cuotas debe ser al menos 1.');
      return;
    }

    const pagas = typeof cuotasPagasManuales === 'number' ? cuotasPagasManuales : undefined;
    const estado = pagas !== undefined && pagas >= cuotasTotales ? 'finalizada' : 'activa';

    onSave({
      tarjetaId,
      descripcion: descripcion.trim(),
      montoTotal: montoNum,
      moneda,
      cuotasTotales,
      fechaCompra: fechaCompra || new Date().toISOString().split('T')[0],
      mesPrimerCuota: mesPrimerCuota || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      categoria: categoria.trim() || undefined,
      cuotasPagasManuales: pagas,
      estado,
      notas: notas.trim() || undefined,
    });

    success(compraToEdit ? 'Compra actualizada' : '¡Compra en cuotas agregada con éxito!');
    onClose();
  };

  const montoPorCuota =
    typeof montoTotal === 'number' && montoTotal > 0 && cuotasTotales > 0
      ? montoTotal / cuotasTotales
      : 0;

  const modalBg = darkMode
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';

  const inputBg = darkMode
    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden my-auto ${modalBg}`}>
        {/* Cabecera */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center justify-center">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {compraToEdit ? 'Editar Compra' : 'Cargar Compra en Cuotas'}
              </h2>
              <p className="text-xs text-slate-400">Registra un consumo y su plan de pagos</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Selector de Tarjeta */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Tarjeta Utilizada <span className="text-rose-400">*</span>
            </label>
            <select
              value={tarjetaId}
              onChange={e => setTarjetaId(e.target.value)}
              required
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:border-sky-500 cursor-pointer ${inputBg}`}
            >
              {tarjetas.map(t => (
                <option key={t.id} value={t.id}>
                  {t.alias} ({t.red.toUpperCase()} •••• {t.ultimosDigitos})
                </option>
              ))}
            </select>
          </div>

          {/* Comercio / Descripción */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Concepto / Comercio <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Zapatillas Adidas, Supermercado, Heladera..."
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              required
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-sky-500 ${inputBg}`}
            />
          </div>

          {/* Monto Total y Moneda */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Importe Total <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                  {moneda === 'ARS' ? '$' : 'US$'}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={montoTotal}
                  onChange={e => setMontoTotal(e.target.value ? parseFloat(e.target.value) : '')}
                  required
                  className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:border-sky-500 ${inputBg}`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Moneda</label>
              <select
                value={moneda}
                onChange={e => setMoneda(e.target.value as Currency)}
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:border-sky-500 cursor-pointer ${inputBg}`}
              >
                <option value="ARS">ARS ($)</option>
                <option value="USD">USD (US$)</option>
              </select>
            </div>
          </div>

          {/* Cantidad de Cuotas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">Cantidad de Cuotas</label>
              <span className="text-xs font-extrabold text-sky-400">
                {cuotasTotales} {cuotasTotales === 1 ? 'cuota' : 'cuotas'}
              </span>
            </div>

            {/* Accesos rápidos de cuotas */}
            <div className="grid grid-cols-7 gap-1.5">
              {[1, 3, 6, 9, 12, 18, 24].map(q => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setCuotasTotales(q)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    cuotasTotales === q
                      ? 'bg-sky-500 text-white border-sky-400 shadow-md scale-105'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Tarjeta de cálculo en vivo */}
          {montoPorCuota > 0 && (
            <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Valor de cada cuota
                </span>
                <span className="text-base font-black text-sky-400">
                  {moneda === 'ARS' ? '$' : 'US$'}{' '}
                  {montoPorCuota.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  <span className="text-xs font-normal text-slate-400">/ mes</span>
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Plan
                </span>
                <span className="text-xs font-extrabold text-white">
                  {cuotasTotales} pagos mensuales
                </span>
              </div>
            </div>
          )}

          {/* Fechas: Fecha de compra y Mes de inicio de la primera cuota */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Fecha de la Compra</label>
              <input
                type="date"
                value={fechaCompra}
                onChange={e => setFechaCompra(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-sky-500 ${inputBg}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Mes 1ra Cuota (Resumen)</label>
              <input
                type="month"
                value={mesPrimerCuota}
                onChange={e => setMesPrimerCuota(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:border-sky-500 ${inputBg}`}
              />
            </div>
          </div>

          {/* Categoría y Cuotas ya pagadas (opcional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Categoría (Opcional)</label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-sky-500 cursor-pointer ${inputBg}`}
              >
                <option value="">Sin categoría</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.nombre}>
                    {c.icono} {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Cuotas ya pagadas (Opcional)</label>
              <input
                type="number"
                min={0}
                max={cuotasTotales}
                placeholder="0 (Automático)"
                value={cuotasPagasManuales}
                onChange={e =>
                  setCuotasPagasManuales(e.target.value !== '' ? parseInt(e.target.value) : '')
                }
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-sky-500 ${inputBg}`}
              />
              <span className="text-[10px] text-slate-400">Déjalo vacío para cálculo automático</span>
            </div>
          </div>

          {/* Notas / Observaciones */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Notas / Observaciones (Opcional)</label>
            <input
              type="text"
              placeholder="Ej: Comprado en promoción, garantía extendida, etc."
              value={notas}
              onChange={e => setNotas(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-sky-500 ${inputBg}`}
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check size={16} />
              <span>{compraToEdit ? 'Guardar Cambios' : 'Registrar Compra'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
