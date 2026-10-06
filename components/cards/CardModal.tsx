'use client';
import React, { useState } from 'react';
import { CreditCard, CardNetwork, CardSkin } from '@/types';
import { CreditCardVisual } from './CreditCardVisual';
import { X, Check, Trash2, Calendar, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardToEdit?: CreditCard | null;
  onSave: (card: Omit<CreditCard, 'id' | 'creadaEn'>) => void;
  onDelete?: (id: string) => void;
  darkMode?: boolean;
}

export function CardModal(props: CardModalProps) {
  if (!props.isOpen) return null;
  return <CardModalForm key={props.cardToEdit?.id ?? 'new'} {...props} />;
}

function CardModalForm({
  onClose,
  cardToEdit,
  onSave,
  onDelete,
  darkMode = false,
}: CardModalProps) {
  const [alias, setAlias] = useState(cardToEdit?.alias || '');
  const [emisor, setEmisor] = useState(cardToEdit?.emisor || '');
  const [red, setRed] = useState<CardNetwork>(cardToEdit?.red || 'visa');
  const [skin, setSkin] = useState<CardSkin>(cardToEdit?.skin || 'black');
  const [ultimosDigitos, setUltimosDigitos] = useState(cardToEdit?.ultimosDigitos || '');
  const [titular, setTitular] = useState(cardToEdit?.titular || '');
  const [vencimientoTarjeta, setVencimientoTarjeta] = useState(cardToEdit?.vencimientoTarjeta || '12/28');
  const [diaCierre, setDiaCierre] = useState<number | ''>(
    typeof cardToEdit?.diaCierre === 'number' ? cardToEdit.diaCierre : 24
  );
  const [diaVencimiento, setDiaVencimiento] = useState<number | ''>(
    typeof cardToEdit?.diaVencimiento === 'number' ? cardToEdit.diaVencimiento : 5
  );
  const [limiteARS, setLimiteARS] = useState<number | ''>(
    typeof cardToEdit?.limiteARS === 'number' ? cardToEdit.limiteARS : ''
  );

  const { success, error } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alias.trim()) {
      error('Por favor ingresa un nombre o alias para la tarjeta.');
      return;
    }

    const cleanDigitos = ultimosDigitos.replace(/\D/g, '').slice(-4);

    onSave({
      alias: alias.trim(),
      emisor: emisor.trim() || undefined,
      red,
      skin,
      ultimosDigitos: cleanDigitos || '••••',
      titular: titular.trim() ? titular.trim().toUpperCase() : undefined,
      vencimientoTarjeta: vencimientoTarjeta.trim() || undefined,
      diaCierre: typeof diaCierre === 'number' ? diaCierre : undefined,
      diaVencimiento: typeof diaVencimiento === 'number' ? diaVencimiento : undefined,
      limiteARS: typeof limiteARS === 'number' && limiteARS > 0 ? limiteARS : undefined,
    });

    success(cardToEdit ? 'Tarjeta actualizada correctamente' : '¡Tarjeta agregada con éxito!');
    onClose();
  };

  const previewCard: CreditCard = {
    id: cardToEdit?.id || 'preview',
    alias: alias.trim() || 'Mi Tarjeta',
    emisor: emisor.trim() || 'BANCO EMISOR',
    red,
    skin,
    ultimosDigitos: ultimosDigitos.replace(/\D/g, '').slice(-4) || '••••',
    titular: titular.trim() ? titular.trim().toUpperCase() : 'NOMBRE TITULAR',
    vencimientoTarjeta: vencimientoTarjeta || 'MM/AA',
    diaCierre: typeof diaCierre === 'number' ? diaCierre : undefined,
    diaVencimiento: typeof diaVencimiento === 'number' ? diaVencimiento : undefined,
  };

  const modalBg = darkMode
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';

  const inputBg = darkMode
    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden my-auto ${modalBg}`}>
        {/* Cabecera */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {cardToEdit ? 'Editar Tarjeta' : 'Nueva Tarjeta de Crédito'}
              </h2>
              <p className="text-xs text-slate-400">Personaliza el diseño, red y fechas de cierre</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Vista previa en tiempo real de la tarjeta */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Vista Previa en Vivo
            </span>
            <div className="w-full max-w-[340px] sm:max-w-[360px]">
              <CreditCardVisual card={previewCard} isSelected={true} />
            </div>
          </div>

          {/* Selección de Skin / Gama */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              Skin de la Tarjeta (Acabado Metálico)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'comun', label: 'Común / Azul', bg: 'bg-indigo-950 border-indigo-500/40 text-blue-200' },
                  { id: 'dorada', label: 'Dorada / Gold', bg: 'bg-amber-900 border-amber-400/50 text-amber-200' },
                  { id: 'platino', label: 'Platino / Silver', bg: 'bg-slate-400 border-slate-200 text-slate-900' },
                  { id: 'black', label: 'Black / Carbón', bg: 'bg-black border-zinc-700 text-zinc-100' },
                ] as const
              ).map(s => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSkin(s.id)}
                  className={`p-2.5 rounded-2xl border font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    s.bg
                  } ${skin === s.id ? 'ring-2 ring-sky-400 scale-[1.03] shadow-lg' : 'opacity-70 hover:opacity-100'}`}
                >
                  <span>{s.label}</span>
                  {skin === s.id && <span className="text-[10px] text-sky-400 font-extrabold">✓ Activo</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Red / Empresa Emisora */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">Empresa / Red</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(
                [
                  { id: 'visa', label: 'Visa' },
                  { id: 'mastercard', label: 'Mastercard' },
                  { id: 'amex', label: 'Amex' },
                  { id: 'cabal', label: 'Cabal' },
                  { id: 'naranja', label: 'Naranja' },
                  { id: 'otra', label: 'Otra' },
                ] as const
              ).map(r => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setRed(r.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    red === r.id
                      ? 'bg-sky-500 text-white border-sky-400 shadow-md'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Datos de la Tarjeta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Nombre / Alias <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Visa Santander Black"
                value={alias}
                onChange={e => setAlias(e.target.value)}
                required
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-sky-500 ${inputBg}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Banco / Entidad Emisora</label>
              <input
                type="text"
                placeholder="Ej: Santander, BBVA, Mercado Pago, Galicia"
                value={emisor}
                onChange={e => setEmisor(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-sky-500 ${inputBg}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Últimos 4 Dígitos</label>
              <input
                type="text"
                maxLength={4}
                placeholder="Ej: 4821"
                value={ultimosDigitos}
                onChange={e => setUltimosDigitos(e.target.value.replace(/\D/g, ''))}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold tracking-widest focus:outline-none focus:border-sky-500 ${inputBg}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Titular de la Tarjeta</label>
              <input
                type="text"
                placeholder="Ej: NICOLAS PANADISI"
                value={titular}
                onChange={e => setTitular(e.target.value.toUpperCase())}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold uppercase focus:outline-none focus:border-sky-500 ${inputBg}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Vencimiento del Plástico (MM/AA)</label>
              <input
                type="text"
                maxLength={5}
                placeholder="MM/AA (Ej: 08/29)"
                value={vencimientoTarjeta}
                onChange={e => setVencimientoTarjeta(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none focus:border-sky-500 ${inputBg}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Límite de Crédito (Opcional $)</label>
              <input
                type="number"
                placeholder="Ej: 2500000"
                value={limiteARS}
                onChange={e => setLimiteARS(e.target.value ? parseFloat(e.target.value) : '')}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-sky-500 ${inputBg}`}
              />
            </div>
          </div>

          {/* Fechas de Resumen para Recordatorios */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-3">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <Calendar size={14} /> Fechas del Resumen Mensual (Para Recordatorios)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Día de Cierre (1 al 31)</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="Ej: 24"
                  value={diaCierre}
                  onChange={e => setDiaCierre(e.target.value ? parseInt(e.target.value) : '')}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:border-sky-500 ${inputBg}`}
                />
                <span className="text-[10px] text-slate-400">Día en que cierra la tarjeta cada mes</span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Día de Vencimiento de Pago (1 al 31)</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="Ej: 5"
                  value={diaVencimiento}
                  onChange={e => setDiaVencimiento(e.target.value ? parseInt(e.target.value) : '')}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:border-sky-500 ${inputBg}`}
                />
                <span className="text-[10px] text-slate-400">Te avisará cuántos días faltan para pagar</span>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800">
            {cardToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `¿Eliminar la tarjeta "${cardToEdit.alias}"? También se eliminarán los consumos en cuotas asociados a ella.`
                    )
                  ) {
                    onDelete(cardToEdit.id);
                    onClose();
                  }
                }}
                className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Eliminar Tarjeta</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
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
                <span>{cardToEdit ? 'Guardar Cambios' : 'Agregar Tarjeta'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
