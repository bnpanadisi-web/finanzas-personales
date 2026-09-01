'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { TabType, Transaction } from '@/types';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PinAuthScreen } from '@/components/auth/PinAuthScreen';
import { Header } from '@/components/layout/Header';
import { NavigationTabs } from '@/components/layout/NavigationTabs';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { DonutExpenseChart } from '@/components/dashboard/DonutExpenseChart';
import { EvolutionChart } from '@/components/dashboard/EvolutionChart';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionList } from '@/components/transactions/TransactionList';
import { SearchAndFilterBar } from '@/components/transactions/SearchAndFilterBar';
import { BudgetsView } from '@/components/budgets/BudgetsView';
import { SavingsView } from '@/components/savings/SavingsView';
import { CategoryModal } from '@/components/categories/CategoryModal';
import { ExportModal } from '@/components/export/ExportModal';
import { ChangePinModal } from '@/components/auth/ChangePinModal';
import { isSessionAuthenticated, logoutUser } from '@/lib/security';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useSavings } from '@/hooks/useSavings';
import { useRates } from '@/hooks/useRates';
import { getCurrentDateInfo, formatMonthYear } from '@/lib/formatters';

function FinanzasAppContent() {
  const { mes, anio } = getCurrentDateInfo();

  // Estados de Autenticación y Preferencias
  const [autenticado, setAutenticado] = useState<boolean>(() => {
    return isSessionAuthenticated();
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('finanzas_dark') === 'true';
    }
    return false;
  });
  const [ocultarMontos, setOcultarMontos] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('finanzas_privacidad') === 'true';
    }
    return false;
  });
  const [modoViaje, setModoViaje] = useState(false);

  // Navegación
  const [tab, setTab] = useState<TabType>('actual');

  // Filtros
  const [mesFiltro, setMesFiltro] = useState<number>(mes);
  const [anioFiltro, setAnioFiltro] = useState<number>(anio);
  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [cuentaFiltro, setCuentaFiltro] = useState('todas');
  const [monedaFiltro, setMonedaFiltro] = useState('todas');

  // Modales & Edición
  const [mostrarModalCat, setMostrarModalCat] = useState(false);
  const [mostrarModalExportar, setMostrarModalExportar] = useState(false);
  const [mostrarModalPin, setMostrarModalPin] = useState(false);
  const [editandoRegistro, setEditandoRegistro] = useState<Transaction | null>(null);
  const [dialogoEliminar, setDialogoEliminar] = useState<{
    abierto: boolean;
    id: number | string | null;
  }>({ abierto: false, id: null });

  // Custom Hooks
  const { rates } = useRates();
  const { categorias, agregarCategoria, editarCategoria, eliminarCategoria } = useCategories();
  const savings = useSavings();
  const {
    transacciones,
    todasLasTransacciones,
    registrosViaje,
    agregarMovimiento,
    editarMovimiento,
    eliminarMovimiento,
    sincronizarViajeASupabase,
  } = useTransactions(autenticado, modoViaje);

  const montado = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Sincronizar clase dark en el DOM
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [darkMode]);

  // Auto-bloqueo por inactividad (15 minutos)
  useEffect(() => {
    if (!autenticado || typeof window === 'undefined') return;

    let timer: NodeJS.Timeout;
    const LIMITE_INACTIVIDAD_MS = 15 * 60 * 1000; // 15 minutos

    const reiniciarInactividad = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        logoutUser();
        setAutenticado(false);
      }, LIMITE_INACTIVIDAD_MS);
    };

    const eventos = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    eventos.forEach(ev => window.addEventListener(ev, reiniciarInactividad));
    reiniciarInactividad();

    return () => {
      clearTimeout(timer);
      eventos.forEach(ev => window.removeEventListener(ev, reiniciarInactividad));
    };
  }, [autenticado]);

  const toggleDarkMode = () => {
    const nuevo = !darkMode;
    setDarkMode(nuevo);
    if (typeof window !== 'undefined') {
      localStorage.setItem('finanzas_dark', String(nuevo));
      if (nuevo) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const toggleOcultarMontos = () => {
    const nuevo = !ocultarMontos;
    setOcultarMontos(nuevo);
    if (typeof window !== 'undefined') {
      localStorage.setItem('finanzas_privacidad', String(nuevo));
    }
  };

  const handleLogout = () => {
    logoutUser();
    setAutenticado(false);
  };

  // Filtrado de Movimientos
  const transaccionesFiltradas = useMemo(() => {
    return transacciones.filter(r => {
      const f = new Date(r.fecha + 'T00:00:00');
      const mesRegistro = f.getMonth() + 1;
      const anioRegistro = f.getFullYear();

      // Filtro por Fecha según Tab
      if (tab === 'actual') {
        if (mesRegistro !== mes || anioRegistro !== anio) return false;
      } else if (tab === 'historial') {
        if (mesRegistro !== mesFiltro || anioRegistro !== anioFiltro) return false;
      }

      // Filtro por Búsqueda de texto
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase();
        const coincideCat = r.categoria.toLowerCase().includes(query);
        const coincideDesc = r.descripcion?.toLowerCase().includes(query);
        const coincideCuenta = r.cuenta.toLowerCase().includes(query);
        if (!coincideCat && !coincideDesc && !coincideCuenta) return false;
      }

      // Filtro por Tipo
      if (tipoFiltro !== 'todos' && r.tipo !== tipoFiltro) return false;

      // Filtro por Cuenta
      if (cuentaFiltro !== 'todas') {
        if (r.cuenta !== cuentaFiltro && r.cuentaDestino !== cuentaFiltro) return false;
      }

      // Filtro por Moneda
      if (monedaFiltro !== 'todas' && (r.moneda || 'ARS') !== monedaFiltro) return false;

      return true;
    });
  }, [
    transacciones,
    tab,
    mes,
    anio,
    mesFiltro,
    anioFiltro,
    busqueda,
    tipoFiltro,
    cuentaFiltro,
    monedaFiltro,
  ]);

  // Totales para Resumen según pestaña activa
  const movimientosParaTotales = useMemo(() => {
    return transacciones.filter(r => {
      const f = new Date(r.fecha + 'T00:00:00');
      const mesRegistro = f.getMonth() + 1;
      const anioRegistro = f.getFullYear();

      if (tab === 'actual') {
        return mesRegistro === mes && anioRegistro === anio;
      } else if (tab === 'historial') {
        return mesRegistro === mesFiltro && anioRegistro === anioFiltro;
      }
      return true;
    });
  }, [transacciones, tab, mes, anio, mesFiltro, anioFiltro]);

  const ingresosARS = useMemo(
    () =>
      movimientosParaTotales
        .filter(r => r.tipo === 'ingreso' && (r.moneda || 'ARS') === 'ARS')
        .reduce((sum, r) => sum + Number(r.monto), 0),
    [movimientosParaTotales]
  );

  const ingresosUSD = useMemo(
    () =>
      movimientosParaTotales
        .filter(r => r.tipo === 'ingreso' && r.moneda === 'USD')
        .reduce((sum, r) => sum + Number(r.monto), 0),
    [movimientosParaTotales]
  );

  const gastosARS = useMemo(
    () =>
      movimientosParaTotales
        .filter(r => r.tipo === 'gasto' && (r.moneda || 'ARS') === 'ARS')
        .reduce((sum, r) => sum + Number(r.monto), 0),
    [movimientosParaTotales]
  );

  const gastosUSD = useMemo(
    () =>
      movimientosParaTotales
        .filter(r => r.tipo === 'gasto' && r.moneda === 'USD')
        .reduce((sum, r) => sum + Number(r.monto), 0),
    [movimientosParaTotales]
  );

  // Transacciones del mes actual para Presupuestos
  const transaccionesMesActual = useMemo(() => {
    return transacciones.filter(r => {
      const f = new Date(r.fecha + 'T00:00:00');
      return f.getMonth() + 1 === mes && f.getFullYear() === anio;
    });
  }, [transacciones, mes, anio]);

  // Manejo de Edición
  const handleStartEdit = (t: Transaction) => {
    setTab('actual');
    setEditandoRegistro(t);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Manejo de Eliminación
  const handleRequestDelete = (id: number | string) => {
    setDialogoEliminar({ abierto: true, id });
  };

  const handleConfirmDelete = async () => {
    if (dialogoEliminar.id !== null) {
      await eliminarMovimiento(dialogoEliminar.id);
      setDialogoEliminar({ abierto: false, id: null });
    }
  };

  if (!montado) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center animate-pulse mb-3 p-2 shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="Finanzas" className="w-12 h-12 object-contain" />
        </div>
        <p className="text-xs text-slate-400 font-bold tracking-wider uppercase">Iniciando Finanzas...</p>
      </div>
    );
  }

  // Pantalla de Bloqueo
  if (!autenticado) {
    return (
      <PinAuthScreen
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onSuccess={() => setAutenticado(true)}
      />
    );
  }

  return (
    <main className="w-full max-w-lg md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto p-4 sm:p-6 min-h-screen pb-24 box-border transition-colors duration-200">
      {/* Barra Superior */}
      <Header
        modoViaje={modoViaje}
        setModoViaje={setModoViaje}
        registrosViajeCount={registrosViaje.length}
        onSincronizarViaje={sincronizarViajeASupabase}
        onExportar={() => setMostrarModalExportar(true)}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        ocultarMontos={ocultarMontos}
        toggleOcultarMontos={toggleOcultarMontos}
        onOpenChangePin={() => setMostrarModalPin(true)}
        onLogout={handleLogout}
        rates={rates}
      />

      {/* Selector de Pestañas */}
      <NavigationTabs
        activeTab={tab}
        onChangeTab={setTab}
        darkMode={darkMode}
      />

      {/* PESTAÑA: MES ACTUAL (LAYOUT MULTICOLUMNA EN PC) */}
      {tab === 'actual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Columna Izquierda (En PC): Resumen y Formulario */}
          <div className="lg:col-span-5 space-y-4">
            <SummaryCards
              ingresosARS={ingresosARS}
              ingresosUSD={ingresosUSD}
              gastosARS={gastosARS}
              gastosUSD={gastosUSD}
              ocultarMontos={ocultarMontos}
              darkMode={darkMode}
            />

            <TransactionForm
              key={editandoRegistro ? String(editandoRegistro.id) : 'nuevo'}
              categorias={categorias}
              modoViaje={modoViaje}
              editandoRegistro={editandoRegistro}
              onCancelEdit={() => setEditandoRegistro(null)}
              onSubmit={async payload => {
                let ok = false;
                if (editandoRegistro) {
                  ok = await editarMovimiento(payload as Transaction);
                  if (ok) setEditandoRegistro(null);
                } else {
                  ok = await agregarMovimiento(payload as Omit<Transaction, 'id'>);
                }
                return ok;
              }}
              onOpenCategoryModal={() => setMostrarModalCat(true)}
              savingsGoals={savings.goals}
              onDepositarEnReserva={savings.depositarEnMeta}
              darkMode={darkMode}
            />
          </div>

          {/* Columna Derecha (En PC): Gráfico y Lista de Movimientos */}
          <div className="lg:col-span-7 space-y-4">
            <DonutExpenseChart
              transacciones={transaccionesMesActual}
              categorias={categorias}
              ocultarMontos={ocultarMontos}
              darkMode={darkMode}
              periodoNombre={formatMonthYear(mes, anio)}
            />

            <TransactionList
              titulo={`Movimientos de ${formatMonthYear(mes, anio)}`}
              transacciones={transaccionesFiltradas}
              categorias={categorias}
              ocultarMontos={ocultarMontos}
              onEdit={handleStartEdit}
              onDelete={handleRequestDelete}
              darkMode={darkMode}
            />
          </div>
        </div>
      )}

      {/* PESTAÑA: HISTORIAL (LAYOUT MULTICOLUMNA EN PC) */}
      {tab === 'historial' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Columna Izquierda (En PC): Filtros, Resumen y Gráfico */}
          <div className="lg:col-span-5 space-y-4">
            <SearchAndFilterBar
              busqueda={busqueda}
              setBusqueda={setBusqueda}
              tipoFiltro={tipoFiltro}
              setTipoFiltro={setTipoFiltro}
              cuentaFiltro={cuentaFiltro}
              setCuentaFiltro={setCuentaFiltro}
              monedaFiltro={monedaFiltro}
              setMonedaFiltro={setMonedaFiltro}
              mesFiltro={mesFiltro}
              setMesFiltro={setMesFiltro}
              anioFiltro={anioFiltro}
              setAnioFiltro={setAnioFiltro}
              mostrarFiltroFecha={true}
              categorias={categorias}
              darkMode={darkMode}
            />

            <SummaryCards
              ingresosARS={ingresosARS}
              ingresosUSD={ingresosUSD}
              gastosARS={gastosARS}
              gastosUSD={gastosUSD}
              ocultarMontos={ocultarMontos}
              darkMode={darkMode}
            />

            <DonutExpenseChart
              transacciones={movimientosParaTotales}
              categorias={categorias}
              ocultarMontos={ocultarMontos}
              darkMode={darkMode}
              periodoNombre={formatMonthYear(mesFiltro, anioFiltro)}
            />
          </div>

          {/* Columna Derecha (En PC): Lista de Movimientos Filtrados */}
          <div className="lg:col-span-7 space-y-4">
            <TransactionList
              titulo={`Registros (${formatMonthYear(mesFiltro, anioFiltro)})`}
              transacciones={transaccionesFiltradas}
              categorias={categorias}
              ocultarMontos={ocultarMontos}
              onEdit={handleStartEdit}
              onDelete={handleRequestDelete}
              darkMode={darkMode}
            />
          </div>
        </div>
      )}

      {/* PESTAÑA: PRESUPUESTOS Y METAS */}
      {tab === 'presupuestos' && (
        <div className="animate-in fade-in duration-200">
          <BudgetsView
            categorias={categorias}
            transaccionesMesActual={transaccionesMesActual}
            ocultarMontos={ocultarMontos}
            darkMode={darkMode}
          />
        </div>
      )}

      {/* PESTAÑA: RESERVAS & METAS DE AHORRO */}
      {tab === 'reservas' && (
        <div className="animate-in fade-in duration-200">
          <SavingsView
            goals={savings.goals}
            onCrearMeta={savings.crearMeta}
            onEditarMeta={savings.editarMeta}
            onEliminarMeta={savings.eliminarMeta}
            onDepositar={savings.depositarEnMeta}
            onRetirar={savings.retirarDeMeta}
            totalAhorradoARS={savings.totalAhorradoARS}
            totalObjetivoARS={savings.totalObjetivoARS}
            totalAhorradoUSD={savings.totalAhorradoUSD}
            totalObjetivoUSD={savings.totalObjetivoUSD}
            ocultarMontos={ocultarMontos}
            darkMode={darkMode}
          />
        </div>
      )}

      {/* PESTAÑA: EVOLUCIÓN Y ANALÍTICAS */}
      {tab === 'analiticas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          <div className="lg:col-span-7 space-y-4">
            <EvolutionChart
              transacciones={transacciones}
              ocultarMontos={ocultarMontos}
              darkMode={darkMode}
            />
          </div>

          <div className="lg:col-span-5 space-y-4">
            <DonutExpenseChart
              transacciones={transaccionesMesActual}
              categorias={categorias}
              ocultarMontos={ocultarMontos}
              darkMode={darkMode}
              periodoNombre={`Mes Actual (${formatMonthYear(mes, anio)})`}
            />
          </div>
        </div>
      )}

      {/* MODAL: GESTIONAR CATEGORÍAS */}
      <CategoryModal
        isOpen={mostrarModalCat}
        onClose={() => setMostrarModalCat(false)}
        categorias={categorias}
        onCrearCategoria={agregarCategoria}
        onEditarCategoria={editarCategoria}
        onEliminarCategoria={eliminarCategoria}
        tipoPorDefecto="gasto"
        darkMode={darkMode}
      />

      {/* MODAL: EXPORTACIÓN PROFESIONAL */}
      <ExportModal
        isOpen={mostrarModalExportar}
        onClose={() => setMostrarModalExportar(false)}
        transacciones={todasLasTransacciones.length > 0 ? todasLasTransacciones : transacciones}
        darkMode={darkMode}
      />

      {/* MODAL: CAMBIAR PIN DE SEGURIDAD */}
      <ChangePinModal
        isOpen={mostrarModalPin}
        onClose={() => setMostrarModalPin(false)}
        darkMode={darkMode}
      />

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      <ConfirmDialog
        isOpen={dialogoEliminar.abierto}
        titulo="Eliminar Movimiento"
        mensaje="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
        textoConfirmar="Eliminar"
        esDestructivo={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDialogoEliminar({ abierto: false, id: null })}
      />
    </main>
  );
}

export default function FinanzasApp() {
  return (
    <ToastProvider>
      <FinanzasAppContent />
    </ToastProvider>
  );
}
