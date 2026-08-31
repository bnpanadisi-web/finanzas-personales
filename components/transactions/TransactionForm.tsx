'use client';
import React, { useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  Plus,
  Repeat,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { Category, Currency, Transaction, TransactionType } from '@/types';
import { DEFAULT_ACCOUNTS } from '@/lib/constants';
import {
  formatInputNumber,
  parseCurrencyInput,
  numberToInputString,
  getCurrentDateInfo,
  formatCurrency,
} from '@/lib/formatters';

interface TransactionFormProps {
  categorias: Category[];
  modoViaje: boolean;
  editandoRegistro: Transaction | null;
  onCancelEdit: () => void;
  onSubmit: (t: Omit<Transaction, 'id'> | Transaction) => Promise<boolean>;
  onOpenCategoryModal: () => void;
  darkMode: boolean;
}

export function TransactionForm({
  categorias,
  modoViaje,
  editandoRegistro,
  onCancelEdit,
  onSubmit,
  onOpenCategoryModal,
  darkMode,
}: TransactionFormProps) {
  const { isoString } = getCurrentDateInfo();

  const [tipo, setTipo] = useState<TransactionType>(() => editandoRegistro?.tipo || 'gasto');
  const [montoInput, setMontoInput] = useState(() =>
    editandoRegistro ? numberToInputString(editandoRegistro.monto) : ''
  );
  const [moneda, setMoneda] = useState<Currency>(() => editandoRegistro?.moneda || 'ARS');
  const [categoria, setCategoria] = useState(() => {
    if (editandoRegistro) return editandoRegistro.categoria;
    const disponibles = categorias.filter(c => c.tipo === 'gasto');
    return disponibles[0]?.nombre || 'Supermercado';
  });
  const [cuenta, setCuenta] = useState(() => editandoRegistro?.cuenta || DEFAULT_ACCOUNTS[0]);
  const [cuentaDestino, setCuentaDestino] = useState(
    () => editandoRegistro?.cuentaDestino || DEFAULT_ACCOUNTS[1]
  );
  const [descripcion, setDescripcion] = useState(() => editandoRegistro?.descripcion || '');
  const [fecha, setFecha] = useState(() => editandoRegistro?.fecha || isoString);
  
  // Modo de pago para gastos: 'contado' o 'cuotas'
  const [modoPago, setModoPago] = useState<'contado' | 'cuotas'>(() =>
    editandoRegistro && (editandoRegistro.cuotas || 1) > 1 ? 'cuotas' : 'contado'
  );
  const [cuotas, setCuotas] = useState<number>(() => editandoRegistro?.cuotas || 3);
  const [esRecurrente, setEsRecurrente] = useState(() => !!editandoRegistro?.esRecurrente);
  const [enviando, setEnviando] = useState(false);

  const handleTipoChange = (nuevoTipo: TransactionType) => {
    setTipo(nuevoTipo);
    if (nuevoTipo !== 'transferencia') {
      const disponibles = categorias.filter(c => c.tipo === nuevoTipo);
      if (disponibles.length > 0) {
        setCategoria(disponibles[0].nombre);
      }
    } else {
      setCategoria('Transferencia');
    }
  };

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formateado = formatInputNumber(e.target.value);
    setMontoInput(formateado);
  };

  const montoNum = parseCurrencyInput(montoInput);
  const valorCuotaEstimado = modoPago === 'cuotas' && cuotas > 0 && montoNum > 0 ? montoNum / cuotas : 0;

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoLimpio = parseCurrencyInput(montoInput);
    if (!montoLimpio || montoLimpio <= 0) return;

    if (tipo === 'transferencia' && cuenta === cuentaDestino) {
      return; // No se puede transferir a la misma cuenta
    }

    setEnviando(true);

    const cuotasFinal = tipo === 'gasto' && modoPago === 'cuotas' && cuotas > 1 ? cuotas : undefined;

    const payload: Omit<Transaction, 'id'> | Transaction = editandoRegistro
      ? {
          id: editandoRegistro.id,
          tipo,
          monto: montoLimpio,
          moneda,
          categoria: tipo === 'transferencia' ? 'Transferencia' : categoria,
          cuenta,
          cuentaDestino: tipo === 'transferencia' ? cuentaDestino : undefined,
          descripcion: descripcion.trim(),
          fecha,
          cuotas: cuotasFinal,
          esRecurrente,
        }
      : {
          tipo,
          monto: montoLimpio,
          moneda,
          categoria: tipo === 'transferencia' ? 'Transferencia' : categoria,
          cuenta,
          cuentaDestino: tipo === 'transferencia' ? cuentaDestino : undefined,
          descripcion: descripcion.trim(),
          fecha,
          cuotas: cuotasFinal,
          esRecurrente,
        };

    const exito = await onSubmit(payload);
    setEnviando(false);

    if (exito && !editandoRegistro) {
      setMontoInput('');
      setDescripcion('');
      setModoPago('contado');
      setCuotas(3);
      setEsRecurrente(false);
      setFecha(getCurrentDateInfo().isoString);
    }
  };

  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs';
  const inputBg = darkMode
    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-slate-500'
    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:bg-white';

  return (
    <form
      onSubmit={handleSubmitForm}
      className={`${cardBg} p-4 sm:p-5 rounded-2xl space-y-3.5 mb-6 border w-full box-border transition-all`}
    >
      {/* Título de estado */}
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {editandoRegistro
            ? '✏️ Editando Movimiento'
            : modoViaje
            ? '✈️ Nuevo Gasto de Viaje'
            : '➕ Nuevo Movimiento'}
        </span>
        {editandoRegistro && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs text-rose-500 font-bold hover:underline"
          >
            Cancelar Edición
          </button>
        )}
      </div>

      {/* Selector de Tipo (Gasto / Ingreso / Transferencia) */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50">
        <button
          type="button"
          onClick={() => handleTipoChange('gasto')}
          className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
            tipo === 'gasto'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowDownCircle size={15} /> Gasto
        </button>
        <button
          type="button"
          onClick={() => handleTipoChange('ingreso')}
          className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
            tipo === 'ingreso'
              ? 'bg-emerald-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowUpCircle size={15} /> Ingreso
        </button>
        <button
          type="button"
          onClick={() => handleTipoChange('transferencia')}
          className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
            tipo === 'transferencia'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowRightLeft size={15} /> Transferir
        </button>
      </div>

      {/* Monto & Moneda */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={montoInput}
            onChange={handleMontoChange}
            className={`w-full p-3 border rounded-xl text-xl font-black text-center outline-none focus:ring-2 transition-all ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-white focus:ring-slate-600'
                : 'bg-white border-slate-200 text-slate-900 focus:ring-slate-400 shadow-2xs'
            }`}
            required
            autoComplete="off"
          />
        </div>

        <button
          type="button"
          onClick={() => setMoneda(moneda === 'ARS' ? 'USD' : 'ARS')}
          className={`px-4 border rounded-xl font-bold text-sm transition-all active:scale-95 shrink-0 ${
            moneda === 'USD'
              ? 'bg-emerald-600 border-emerald-500 text-white'
              : darkMode
              ? 'bg-slate-800 border-slate-700 text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {moneda}
        </button>
      </div>

      {/* Categoría y Cuentas */}
      {tipo !== 'transferencia' ? (
        <div className="grid grid-cols-2 gap-2">
          {/* Categoría */}
          <div className="flex gap-1">
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className={`p-2.5 border rounded-xl w-full text-xs font-bold outline-none ${inputBg}`}
            >
              {categorias
                .filter(c => c.tipo === tipo)
                .map(c => (
                  <option key={c.id} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={onOpenCategoryModal}
              title="Nueva categoría"
              className={`p-2.5 border rounded-xl shrink-0 transition-all ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Cuenta */}
          <select
            value={cuenta}
            onChange={e => setCuenta(e.target.value)}
            className={`p-2.5 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
          >
            {DEFAULT_ACCOUNTS.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      ) : (
        /* Modo Transferencia: Cuenta Origen y Destino */
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">Origen:</label>
            <select
              value={cuenta}
              onChange={e => setCuenta(e.target.value)}
              className={`p-2.5 border rounded-xl w-full text-xs font-bold outline-none ${inputBg}`}
            >
              {DEFAULT_ACCOUNTS.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">Destino:</label>
            <select
              value={cuentaDestino}
              onChange={e => setCuentaDestino(e.target.value)}
              className={`p-2.5 border rounded-xl w-full text-xs font-bold outline-none ${inputBg}`}
            >
              {DEFAULT_ACCOUNTS.filter(c => c !== cuenta).map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Opciones de Pago para Gastos: Contado vs Cuotas vs Recurrente */}
      {tipo === 'gasto' && !editandoRegistro && (
        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          {/* Selector Contado / Cuotas / Gasto Fijo */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50">
            {/* Opción Contado */}
            <button
              type="button"
              onClick={() => setModoPago('contado')}
              className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                modoPago === 'contado'
                  ? darkMode
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-white text-slate-800 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Banknote size={14} className="text-emerald-500" />
              <span>Contado</span>
            </button>

            {/* Opción Cuotas */}
            <button
              type="button"
              onClick={() => setModoPago('cuotas')}
              className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                modoPago === 'cuotas'
                  ? darkMode
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <CreditCard size={14} />
              <span>En Cuotas</span>
            </button>

            {/* Toggle Gasto Fijo / Recurrente */}
            <button
              type="button"
              onClick={() => setEsRecurrente(!esRecurrente)}
              className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                esRecurrente
                  ? darkMode
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Repeat size={14} />
              <span>{esRecurrente ? 'Fijo / Mes' : 'Ocasional'}</span>
            </button>
          </div>

          {/* Sub-selector de Cuotas si el modo es Cuotas */}
          {modoPago === 'cuotas' && (
            <div className="p-2.5 rounded-xl border bg-violet-50/50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-violet-700 dark:text-violet-300">
                  Cantidad de cuotas:
                </span>
                <select
                  value={cuotas}
                  onChange={e => setCuotas(Number(e.target.value))}
                  className="p-1.5 border rounded-lg text-xs font-bold outline-none bg-white dark:bg-slate-800 border-violet-200 dark:border-violet-700 text-slate-800 dark:text-white"
                >
                  <option value={2}>2 Cuotas</option>
                  <option value={3}>3 Cuotas</option>
                  <option value={6}>6 Cuotas</option>
                  <option value={9}>9 Cuotas</option>
                  <option value={12}>12 Cuotas</option>
                  <option value={18}>18 Cuotas</option>
                  <option value={24}>24 Cuotas</option>
                </select>
              </div>

              {valorCuotaEstimado > 0 && (
                <span className="text-xs font-extrabold text-violet-600 dark:text-violet-400">
                  {cuotas} cuotas de {formatCurrency(valorCuotaEstimado, moneda)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Descripción y Fecha */}
      <input
        type="text"
        placeholder="Descripción o nota (opcional)"
        value={descripcion}
        onChange={e => setDescripcion(e.target.value)}
        className={`w-full p-2.5 border rounded-xl text-xs outline-none ${inputBg}`}
      />

      <input
        type="date"
        value={fecha}
        onChange={e => setFecha(e.target.value)}
        className={`w-full p-2.5 border rounded-xl text-xs font-medium outline-none ${inputBg}`}
        required
      />

      {/* Botón Submit */}
      <button
        type="submit"
        disabled={enviando}
        className={`w-full py-3 rounded-xl font-black text-sm tracking-wide transition-all active:scale-98 shadow-md cursor-pointer ${
          darkMode
            ? 'bg-slate-100 text-slate-900 hover:bg-white'
            : 'bg-slate-900 text-white hover:bg-slate-800'
        } ${enviando ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {enviando
          ? 'Guardando...'
          : editandoRegistro
          ? 'Actualizar Registro'
          : tipo === 'transferencia'
          ? 'Realizar Transferencia'
          : 'Guardar Movimiento'}
      </button>
    </form>
  );
}
