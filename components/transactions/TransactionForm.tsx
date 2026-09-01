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
import { Category, Currency, SavingsGoal, Transaction, TransactionType } from '@/types';
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
  savingsGoals?: SavingsGoal[];
  onDepositarEnReserva?: (id: string, monto: number, nota?: string) => boolean;
  darkMode: boolean;
}

export function TransactionForm({
  categorias,
  modoViaje,
  editandoRegistro,
  onCancelEdit,
  onSubmit,
  onOpenCategoryModal,
  savingsGoals = [],
  onDepositarEnReserva,
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

  // Destinar ingreso a Reserva / Ahorro
  const [destinarAReserva, setDestinarAReserva] = useState(false);
  const [reservaIdSeleccionada, setReservaIdSeleccionada] = useState<string>('');
  const [montoReservadoInput, setMontoReservadoInput] = useState('');
  const [montoReservadoManual, setMontoReservadoManual] = useState(false);

  const [enviando, setEnviando] = useState(false);

  const effectiveReservaId = reservaIdSeleccionada || savingsGoals[0]?.id || '';

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
    if (nuevoTipo !== 'ingreso') {
      setDestinarAReserva(false);
    }
  };

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formateado = formatInputNumber(e.target.value);
    setMontoInput(formateado);
    // Si no ha sido editado manualmente, sugerir el monto total a la reserva
    if (!montoReservadoManual) {
      setMontoReservadoInput(formateado);
    }
  };

  const handleMontoReservadoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMontoReservadoManual(true);
    setMontoReservadoInput(formatInputNumber(e.target.value));
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
    const montoAReservar = destinarAReserva && effectiveReservaId ? parseCurrencyInput(montoReservadoInput) : undefined;

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
          reservaId: destinarAReserva ? effectiveReservaId : undefined,
          montoReservado: montoAReservar,
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
          reservaId: destinarAReserva ? effectiveReservaId : undefined,
          montoReservado: montoAReservar,
        };

    const exito = await onSubmit(payload);

    // Si se activó la reserva y se guardó con éxito, sumar a la meta
    if (exito && tipo === 'ingreso' && destinarAReserva && effectiveReservaId && onDepositarEnReserva && montoAReservar && montoAReservar > 0) {
      const metaTarget = savingsGoals.find(g => g.id === effectiveReservaId);
      onDepositarEnReserva(
        effectiveReservaId,
        montoAReservar,
        descripcion ? `Aporte desde ingreso: ${descripcion}` : `Aporte desde ingreso (${metaTarget?.nombre || 'Reserva'})`
      );
    }

    setEnviando(false);

    if (exito && !editandoRegistro) {
      setMontoInput('');
      setDescripcion('');
      setModoPago('contado');
      setCuotas(3);
      setEsRecurrente(false);
      setDestinarAReserva(false);
      setMontoReservadoInput('');
      setMontoReservadoManual(false);
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
            autoFocus
          />
        </div>

        {/* Moneda (Pesos / Dólares) */}
        <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 items-center">
          <button
            type="button"
            onClick={() => setMoneda('ARS')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              moneda === 'ARS'
                ? darkMode
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-400'
            }`}
          >
            ARS
          </button>
          <button
            type="button"
            onClick={() => setMoneda('USD')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              moneda === 'USD'
                ? darkMode
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-400'
            }`}
          >
            USD
          </button>
        </div>
      </div>

      {/* Selector de Categoría (No aplica si es Transferencia) */}
      {tipo !== 'transferencia' && (
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-bold">Categoría:</span>
            <button
              type="button"
              onClick={onOpenCategoryModal}
              className="text-emerald-500 font-bold flex items-center gap-1 hover:underline"
            >
              <Plus size={13} /> Nueva categoría
            </button>
          </div>
          <select
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
            className={`w-full p-2.5 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
          >
            {categorias
              .filter(c => c.tipo === tipo)
              .map(c => (
                <option key={c.id} value={c.nombre}>
                  {c.icono} {c.nombre}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Cuentas: Origen y Destino */}
      {tipo === 'transferencia' ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">
              Cuenta Origen:
            </label>
            <select
              value={cuenta}
              onChange={e => setCuenta(e.target.value)}
              className={`w-full p-2.5 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
            >
              {DEFAULT_ACCOUNTS.map(cta => (
                <option key={cta} value={cta}>
                  {cta}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">
              Cuenta Destino:
            </label>
            <select
              value={cuentaDestino}
              onChange={e => setCuentaDestino(e.target.value)}
              className={`w-full p-2.5 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
            >
              {DEFAULT_ACCOUNTS.map(cta => (
                <option key={cta} value={cta} disabled={cta === cuenta}>
                  {cta}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <span className="text-slate-400 font-bold text-xs">Cuenta / Billetera:</span>
          <select
            value={cuenta}
            onChange={e => setCuenta(e.target.value)}
            className={`w-full p-2.5 border rounded-xl text-xs font-bold outline-none ${inputBg}`}
          >
            {DEFAULT_ACCOUNTS.map(cta => (
              <option key={cta} value={cta}>
                {cta}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Opciones de Pago para Gastos: Contado vs Cuotas vs Recurrente */}
      {tipo === 'gasto' && !editandoRegistro && (
        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50">
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

            <button
              type="button"
              onClick={() => setModoPago('cuotas')}
              className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                modoPago === 'cuotas'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <CreditCard size={14} />
              <span>En Cuotas</span>
            </button>

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

      {/* Opción para Ingresos: Destinar parte o todo a una Reserva / Ahorro */}
      {tipo === 'ingreso' && !editandoRegistro && savingsGoals.length > 0 && (
        <div className="space-y-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setDestinarAReserva(!destinarAReserva)}
            className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
              destinarAReserva
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500 text-amber-900 dark:text-amber-200'
                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🐷</span>
              <span>Destinar a Reserva / Ahorro</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase ${
              destinarAReserva ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {destinarAReserva ? 'Activado' : 'Opcional'}
            </span>
          </button>

          {destinarAReserva && (
            <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-2.5 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-amber-800 dark:text-amber-300 font-bold block mb-1">
                    Meta de Ahorro:
                  </label>
                  <select
                    value={effectiveReservaId}
                    onChange={e => setReservaIdSeleccionada(e.target.value)}
                    className="w-full p-2 border rounded-xl text-xs font-bold outline-none bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 text-slate-800 dark:text-white"
                  >
                    {savingsGoals.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.icono || '🐷'} {g.nombre} ({g.moneda})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-amber-800 dark:text-amber-300 font-bold block mb-1">
                    Importe a Reservar ({moneda}):
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Monto a reservar"
                    value={montoReservadoInput}
                    onChange={handleMontoReservadoChange}
                    className="w-full p-2 border rounded-xl text-xs font-black outline-none bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                💡 Puedes reservar el total o cambiar libremente el importe para apartar solo una parte de este ingreso.
              </p>
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
