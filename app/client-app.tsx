'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Lock, LogOut, Plus, PieChart as PieIcon, ArrowUpCircle, ArrowDownCircle,
  ShoppingCart, Home as HouseIcon, Zap, Utensils, Car, HeartPulse, Film, Tag, Wallet,
  Briefcase, TrendingUp, DollarSign, Dumbbell, Pizza, Coffee, Truck, Bike, Plane,
  GraduationCap, Gift, Smartphone, X, Edit2, Trash2, History, LayoutDashboard,
  Eye, EyeOff, Sun, Moon, Download, Printer, Tv, BookOpen
} from 'lucide-react';

const ICONOS_DISPONIBLES: Record<string, any> = {
  Dumbbell, Pizza, Coffee, Truck, Bike, Utensils, ShoppingCart, HouseIcon, 
  Zap, Car, HeartPulse, Film, Plane, GraduationCap, Gift, Smartphone, Tag, 
  Wallet, Briefcase, TrendingUp, DollarSign, Printer, Tv, BookOpen
};

const COLORES_GRAFICO = [
  '#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#64748b', '#d97706'
];

interface Categoria {
  id: number;
  nombre: string;
  tipo: 'ingreso' | 'gasto';
  icono: string;
}

interface Registro {
  id: number | string;
  tipo: 'ingreso' | 'gasto';
  monto: number;
  moneda?: 'ARS' | 'USD';
  categoria: string;
  cuenta: string;
  descripcion: string;
  fecha: string;
}

export default function FinanzasApp() {
  const [pinIngresado, setPinIngresado] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [errorPin, setErrorPin] = useState(false);

  // Estados Globales
  const [darkMode, setDarkMode] = useState(false);
  const [ocultarMontos, setOcultarMontos] = useState(false);
  
  // Modo Viaje
  const [modoViaje, setModoViaje] = useState(false);
  const [registrosViaje, setRegistrosViaje] = useState<Registro[]>([]);

  // Navegación
  const [tab, setTab] = useState<'actual' | 'historial'>('actual');

  // Datos
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Filtros Historial
  const fechaHoy = new Date();
  const [mesFiltro, setMesFiltro] = useState<number>(fechaHoy.getMonth() + 1);
  const [anioFiltro, setAnioFiltro] = useState<number>(fechaHoy.getFullYear());

  // Formulario Movimiento
  const [tipo, setTipo] = useState<'gasto' | 'ingreso'>('gasto');
  const [montoInput, setMontoInput] = useState('');
  const [monedaGasto, setMonedaGasto] = useState<'ARS' | 'USD'>('ARS');
  const [categoria, setCategoria] = useState('');
  const [cuenta, setCuenta] = useState('Mercado Pago');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(fechaHoy.toISOString().split('T')[0]);

  // Modales
  const [mostrarModalCat, setMostrarModalCat] = useState(false);
  const [nuevaCatNombre, setNuevaCatNombre] = useState('');
  const [nuevaCatIcono, setNuevaCatIcono] = useState('Dumbbell');

  const [editandoRegistro, setEditandoRegistro] = useState<Registro | null>(null);

  const cuentas = ['Efectivo', 'Cuenta Bancaria', 'Mercado Pago', 'Tarjeta de Crédito'];
  const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sesion = localStorage.getItem('finanzas_auth');
      if (sesion === 'true') setAutenticado(true);
      const priv = localStorage.getItem('finanzas_privacidad');
      if (priv === 'true') setOcultarMontos(true);
      const darkPref = localStorage.getItem('finanzas_dark');
      if (darkPref === 'true') setDarkMode(true);
      
      const viajeStorage = localStorage.getItem('finanzas_registros_viaje');
      if (viajeStorage) setRegistrosViaje(JSON.parse(viajeStorage));
    }
  }, []);

  useEffect(() => {
    if (autenticado && !modoViaje) {
      cargarDatos();
    }
  }, [autenticado, tipo, modoViaje]);

  async function cargarDatos() {
    const { data: catData } = await supabase.from('categorias').select('*');
    if (catData) {
      setCategorias(catData);
      const primera = catData.find(c => c.tipo === tipo);
      if (primera) setCategoria(primera.nombre);
    }

    const { data: regData, error } = await supabase.from('registros').select('*').order('fecha', { ascending: false });
    if (regData) setRegistros(regData);
    if (error) console.error('Error cargando registros:', error.message);
  }

  function toggleDarkMode() {
    const nuevoEstado = !darkMode;
    setDarkMode(nuevoEstado);
    if (typeof window !== 'undefined') {
      localStorage.setItem('finanzas_dark', String(nuevoEstado));
    }
  }

  function formatearMonedaDirecta(valor: number, moneda: 'ARS' | 'USD' = 'ARS'): string {
    if (ocultarMontos) return '••••••';
    const simbolo = moneda === 'USD' ? 'US$ ' : '$ ';
    return simbolo + new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  }

  function handleMontoChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value;
    raw = raw.replace(/[^0-9,]/g, '');

    const partes = raw.split(',');
    if (partes.length > 2) return;

    let parteEntera = partes[0].replace(/\D/g, '');
    if (parteEntera) {
      parteEntera = new Intl.NumberFormat('es-AR').format(parseInt(parteEntera, 10));
    }

    let parteDecimal = partes[1] !== undefined ? ',' + partes[1].slice(0, 2) : '';

    setMontoInput(parteEntera + parteDecimal);
  }

  function validarPin(e: React.FormEvent) {
    e.preventDefault();
    const pinCorrecto = process.env.NEXT_PUBLIC_APP_PIN || '2706';
    if (pinIngresado === pinCorrecto) {
      setAutenticado(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('finanzas_auth', 'true');
      }
      setErrorPin(false);
    } else {
      setErrorPin(true);
    }
  }

  function cerrarSesion() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('finanzas_auth');
    }
    setAutenticado(false);
    setPinIngresado('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!montoInput || !categoria) return;

    const montoLimpio = parseFloat(montoInput.replace(/\./g, '').replace(',', '.'));
    if (isNaN(montoLimpio)) return;

    if (modoViaje) {
      if (editandoRegistro) {
        const actualizados = registrosViaje.map(r => 
          r.id === editandoRegistro.id ? { ...r, tipo, monto: montoLimpio, moneda: monedaGasto, categoria, cuenta, descripcion, fecha } : r
        );
        setRegistrosViaje(actualizados);
        localStorage.setItem('finanzas_registros_viaje', JSON.stringify(actualizados));
        setEditandoRegistro(null);
      } else {
        const nuevo: Registro = {
          id: Date.now(),
          tipo,
          monto: montoLimpio,
          moneda: monedaGasto,
          categoria,
          cuenta,
          descripcion,
          fecha
        };
        const lista = [nuevo, ...registrosViaje];
        setRegistrosViaje(lista);
        localStorage.setItem('finanzas_registros_viaje', JSON.stringify(lista));
      }
    } else {
      if (editandoRegistro) {
        const { error } = await supabase.from('registros').update({
          tipo,
          monto: montoLimpio,
          moneda: monedaGasto,
          categoria,
          cuenta,
          descripcion,
          fecha
        }).eq('id', editandoRegistro.id);
        
        if (error) alert('Error actualizando registro: ' + error.message);
        setEditandoRegistro(null);
      } else {
        const { error } = await supabase.from('registros').insert([{
          tipo,
          monto: montoLimpio,
          moneda: monedaGasto,
          categoria,
          cuenta,
          descripcion,
          fecha
        }]);

        if (error) alert('Error guardando registro en Supabase: ' + error.message);
      }
      await cargarDatos();
    }

    setMontoInput('');
    setDescripcion('');
    setFecha(fechaHoy.toISOString().split('T')[0]);
  }

  async function eliminarRegistro(id: number | string) {
    if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
    if (modoViaje) {
      const filtrados = registrosViaje.filter(r => r.id !== id);
      setRegistrosViaje(filtrados);
      localStorage.setItem('finanzas_registros_viaje', JSON.stringify(filtrados));
    } else {
      await supabase.from('registros').delete().eq('id', id);
      cargarDatos();
    }
  }

  function iniciarEdicion(r: Registro) {
    setTab('actual');
    setEditandoRegistro(r);
    setTipo(r.tipo);
    setMonedaGasto(r.moneda || 'ARS');
    const partes = r.monto.toFixed(2).split('.');
    const parteEnteraFormateada = new Intl.NumberFormat('es-AR').format(parseInt(partes[0], 10));
    setMontoInput(`${parteEnteraFormateada},${partes[1]}`);
    setCategoria(r.categoria);
    setCuenta(r.cuenta);
    setDescripcion(r.descripcion || '');
    setFecha(r.fecha);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function crearCategoria(e: React.FormEvent) {
    e.preventDefault();
    const nombreLimpio = nuevaCatNombre.trim();
    if (!nombreLimpio) return;

    const yaExiste = categorias.some(
      c => c.nombre.toLowerCase() === nombreLimpio.toLowerCase() && c.tipo === tipo
    );

    if (yaExiste) {
      alert(`La categoría "${nombreLimpio}" ya existe.`);
      return;
    }

    const { error } = await supabase.from('categorias').insert([{
      nombre: nombreLimpio,
      tipo: tipo,
      icono: nuevaCatIcono
    }]);

    if (error) {
      alert('Error guardando categoría: ' + error.message);
    } else {
      setNuevaCatNombre('');
      setMostrarModalCat(false);
      await cargarDatos();
      setCategoria(nombreLimpio);
    }
  }

  function exportarAExcel() {
    const datosAExportar = modoViaje ? registrosViaje : registros;
    if (datosAExportar.length === 0) {
      alert('No hay registros para exportar.');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,ID,Tipo,Monto,Moneda,Categoria,Cuenta,Fecha,Descripcion\n";
    datosAExportar.forEach(r => {
      const desc = r.descripcion ? `"${r.descripcion.replace(/"/g, '""')}"` : '""';
      csvContent += `${r.id},${r.tipo},${r.monto},${r.moneda || 'ARS'},"${r.categoria}","${r.cuenta}",${r.fecha},${desc}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${modoViaje ? 'gastos_viaje' : 'mis_finanzas'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const listaActual = modoViaje ? registrosViaje : registros;

  const registrosMostrados = listaActual.filter(r => {
    const f = new Date(r.fecha + 'T00:00:00');
    if (tab === 'actual') {
      return f.getMonth() === fechaHoy.getMonth() && f.getFullYear() === fechaHoy.getFullYear();
    } else {
      return f.getMonth() + 1 === mesFiltro && f.getFullYear() === anioFiltro;
    }
  });

  const ingresosARS = registrosMostrados.filter(r => r.tipo === 'ingreso' && (r.moneda || 'ARS') === 'ARS').reduce((a, r) => a + Number(r.monto), 0);
  const ingresosUSD = registrosMostrados.filter(r => r.tipo === 'ingreso' && r.moneda === 'USD').reduce((a, r) => a + Number(r.monto), 0);

  const gastosARS = registrosMostrados.filter(r => r.tipo === 'gasto' && (r.moneda || 'ARS') === 'ARS').reduce((a, r) => a + Number(r.monto), 0);
  const gastosUSD = registrosMostrados.filter(r => r.tipo === 'gasto' && r.moneda === 'USD').reduce((a, r) => a + Number(r.monto), 0);

  // Gastos Agrupados por Categoría para el Gráfico
  const gastosPorCategoria = registrosMostrados
    .filter(r => r.tipo === 'gasto')
    .reduce((acc: Record<string, { totalARS: number; totalUSD: number }>, r) => {
      if (!acc[r.categoria]) acc[r.categoria] = { totalARS: 0, totalUSD: 0 };
      if (r.moneda === 'USD') {
        acc[r.categoria].totalUSD += Number(r.monto);
      } else {
        acc[r.categoria].totalARS += Number(r.monto);
      }
      return acc;
    }, {});

  if (!autenticado) {
    return (
      <main className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-900 text-slate-800'
      }`}>
        <form onSubmit={validarPin} className={`p-6 rounded-2xl shadow-xl w-full max-w-sm text-center space-y-4 ${
          darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-800'
        }`}>
          <div className={`p-3 rounded-full w-12 h-12 mx-auto flex items-center justify-center ${
            darkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-800'
          }`}>
            <Lock size={24} />
          </div>
          <h1 className="text-xl font-bold">Acceso a Finanzas</h1>
          <input
            type="password"
            placeholder="Ingrese PIN"
            value={pinIngresado}
            onChange={e => setPinIngresado(e.target.value)}
            className={`w-full p-3 border rounded-xl text-center text-2xl tracking-widest outline-none ${
              darkMode ? 'bg-slate-800 border-slate-700 text-white focus:ring-slate-600' : 'bg-white border-slate-200 focus:ring-slate-800'
            }`}
            maxLength={6}
          />
          {errorPin && <p className="text-rose-500 text-sm font-semibold">PIN Incorrecto</p>}
          <button type="submit" className={`w-full py-3 rounded-xl font-bold transition-all active:scale-95 ${
            darkMode ? 'bg-slate-100 text-slate-900 hover:bg-white' : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}>
            Ingresar
          </button>
        </form>
      </main>
    );
  }

  const RenderIcono = ({ nombre, size = 18 }: { nombre: string; size?: number }) => {
    const Componente = ICONOS_DISPONIBLES[nombre] || Tag;
    return <Componente size={size} />;
  };

  const cardBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
  const inputBg = darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800';

  const entradasGastos = Object.entries(gastosPorCategoria);
  let acumuladoAngulo = 0;

  return (
    <main className={`w-full max-w-md mx-auto p-4 min-h-screen pb-20 transition-colors duration-200 box-border ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4 w-full">
        <h1 className="text-xl font-bold">{modoViaje ? '✈️ Modo Viaje' : 'Mis Finanzas'}</h1>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setModoViaje(!modoViaje)} 
            title="Activar/Desactivar Modo Viaje"
            className={`p-2 border rounded-xl shadow-sm transition-all active:scale-95 ${
              modoViaje 
                ? 'bg-sky-500 border-sky-400 text-white animate-pulse' 
                : (darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600')
            }`}
          >
            <Plane size={18} />
          </button>

          <button 
            onClick={exportarAExcel} 
            title="Exportar a Excel (CSV)"
            className={`p-2 border rounded-xl shadow-sm transition-all active:scale-95 ${
              darkMode ? 'bg-slate-900 border-slate-800 text-emerald-400' : 'bg-white border-slate-200 text-emerald-600'
            }`}
          >
            <Download size={18} />
          </button>

          <button 
            onClick={toggleDarkMode} 
            className={`p-2 border rounded-xl shadow-sm transition-all active:scale-95 ${
              darkMode ? 'bg-slate-900 border-slate-800 text-yellow-400' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button 
            onClick={() => {
              const nuevoEstado = !ocultarMontos;
              setOcultarMontos(nuevoEstado);
              if (typeof window !== 'undefined') {
                localStorage.setItem('finanzas_privacidad', String(nuevoEstado));
              }
            }} 
            className={`p-2 border rounded-xl shadow-sm active:scale-95 transition-all ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            {ocultarMontos ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>

          <button 
            onClick={cerrarSesion} 
            className={`p-2 border rounded-xl shadow-sm active:scale-95 transition-all ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex p-1 rounded-xl mb-4 w-full ${darkMode ? 'bg-slate-900' : 'bg-slate-200'}`}>
        <button
          onClick={() => setTab('actual')}
          className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            tab === 'actual' 
              ? (darkMode ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-900 shadow') 
              : 'text-slate-400'
          }`}
        >
          <LayoutDashboard size={16} /> Mes Actual
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            tab === 'historial' 
              ? (darkMode ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-900 shadow') 
              : 'text-slate-400'
          }`}
        >
          <History size={16} /> Historial
        </button>
      </div>

      {/* Filtro Historial */}
      {tab === 'historial' && (
        <div className={`${cardBg} p-3 rounded-2xl shadow-sm border mb-4 flex gap-2 w-full box-border`}>
          <select
            value={mesFiltro}
            onChange={e => setMesFiltro(Number(e.target.value))}
            className={`flex-1 p-2.5 border rounded-xl text-sm font-semibold outline-none ${inputBg}`}
          >
            {mesesNombres.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>
          <select
            value={anioFiltro}
            onChange={e => setAnioFiltro(Number(e.target.value))}
            className={`w-28 p-2.5 border rounded-xl text-sm font-semibold outline-none ${inputBg}`}
          >
            {[2025, 2026, 2027].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-center w-full box-border">
        <div className={`${cardBg} p-3 rounded-2xl shadow-sm border flex flex-col justify-center`}>
          <p className="text-[11px] text-slate-400 font-medium">Ingresos</p>
          <p className="font-bold text-emerald-500 text-xs sm:text-sm">{formatearMonedaDirecta(ingresosARS, 'ARS')}</p>
          {ingresosUSD > 0 && (
            <p className="font-bold text-emerald-400 text-[10px] sm:text-xs">{formatearMonedaDirecta(ingresosUSD, 'USD')}</p>
          )}
        </div>
        <div className={`${cardBg} p-3 rounded-2xl shadow-sm border flex flex-col justify-center`}>
          <p className="text-[11px] text-slate-400 font-medium">Gastos</p>
          <p className="font-bold text-rose-500 text-xs sm:text-sm">{formatearMonedaDirecta(gastosARS, 'ARS')}</p>
          {gastosUSD > 0 && (
            <p className="font-bold text-rose-400 text-[10px] sm:text-xs">{formatearMonedaDirecta(gastosUSD, 'USD')}</p>
          )}
        </div>
        <div className={`${cardBg} p-3 rounded-2xl shadow-sm border flex flex-col justify-center`}>
          <p className="text-[11px] text-slate-400 font-medium">Balance</p>
          <p className={`font-bold text-xs sm:text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            {formatearMonedaDirecta(ingresosARS - gastosARS, 'ARS')}
          </p>
          {(ingresosUSD > 0 || gastosUSD > 0) && (
            <p className={`font-bold text-[10px] sm:text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {formatearMonedaDirecta(ingresosUSD - gastosUSD, 'USD')}
            </p>
          )}
        </div>
      </div>

      {/* Gráfico de Torta en Historial */}
      {tab === 'historial' && (
        <div className={`${cardBg} p-4 rounded-2xl shadow-sm mb-6 border w-full box-border`}>
          <div className="flex items-center gap-2 mb-4">
            <PieIcon size={18} className="text-slate-400" />
            <h2 className="font-bold text-sm">
              Gráfico de Gastos ({mesesNombres[mesFiltro - 1]} {anioFiltro})
            </h2>
          </div>

          {entradasGastos.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6">No hay gastos para mostrar el gráfico en este período</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  {entradasGastos.map(([cat, val], index) => {
                    const totalBase = (gastosARS + gastosUSD) || 1;
                    const valorCat = val.totalARS + val.totalUSD;
                    const porcentaje = (valorCat / totalBase) * 100;
                    const strokeDasharray = `${porcentaje} ${100 - porcentaje}`;
                    const strokeDashoffset = -acumuladoAngulo;
                    acumuladoAngulo += porcentaje;
                    const color = COLORES_GRAFICO[index % COLORES_GRAFICO.length];

                    return (
                      <circle
                        key={cat}
                        cx="18"
                        cy="18"
                        r="15.91549430918954"
                        fill="transparent"
                        stroke={color}
                        strokeWidth="3.8"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                      />
                    );
                  })}
                </svg>
                <div className="absolute text-center">
                  <p className="text-[10px] text-slate-400 font-bold">GASTOS</p>
                  <p className={`text-[11px] font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    {formatearMonedaDirecta(gastosARS, 'ARS')}
                  </p>
                  {gastosUSD > 0 && (
                    <p className="text-[10px] font-bold text-slate-400">
                      {formatearMonedaDirecta(gastosUSD, 'USD')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-1.5 w-full">
                {entradasGastos.map(([cat, val], index) => {
                  const catObj = categorias.find(c => c.nombre === cat);
                  const color = COLORES_GRAFICO[index % COLORES_GRAFICO.length];

                  return (
                    <div key={cat} className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <RenderIcono nombre={catObj?.icono || 'Tag'} size={14} /> {cat}
                      </span>
                      <span className="font-bold text-slate-400">
                        {val.totalARS > 0 && formatearMonedaDirecta(val.totalARS, 'ARS')}
                        {val.totalARS > 0 && val.totalUSD > 0 && ' + '}
                        {val.totalUSD > 0 && formatearMonedaDirecta(val.totalUSD, 'USD')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Formulario en Mes Actual */}
      {tab === 'actual' && (
        <form onSubmit={handleSubmit} className={`${cardBg} p-4 rounded-2xl shadow-sm space-y-3 mb-6 border w-full box-border`}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-slate-400">
              {editandoRegistro ? '✏️ EDITANDO REGISTRO' : (modoViaje ? '✈️ NUEVO GASTO DE VIAJE' : '➕ NUEVO MOVIMIENTO')}
            </span>
            {editandoRegistro && (
              <button
                type="button"
                onClick={() => { setEditandoRegistro(null); setMontoInput(''); setDescripcion(''); }}
                className="text-xs text-rose-500 font-bold"
              >
                Cancelar Edición
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setTipo('gasto')}
              className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all ${
                tipo === 'gasto' ? 'bg-rose-500 text-white' : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600')
              }`}>
              <ArrowDownCircle size={16} /> Gasto
            </button>
            <button type="button" onClick={() => setTipo('ingreso')}
              className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all ${
                tipo === 'ingreso' ? 'bg-emerald-500 text-white' : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600')
              }`}>
              <ArrowUpCircle size={16} /> Ingreso
            </button>
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Monto" 
              value={montoInput} 
              onChange={handleMontoChange}
              className={`flex-1 p-3 border rounded-xl text-xl font-bold text-center outline-none focus:ring-2 ${
                darkMode ? 'bg-slate-800 border-slate-700 text-white focus:ring-slate-600' : 'bg-white border-slate-200 focus:ring-slate-800'
              }`} 
              required 
            />
            <button
              type="button"
              onClick={() => setMonedaGasto(monedaGasto === 'ARS' ? 'USD' : 'ARS')}
              className={`px-4 border rounded-xl font-bold text-sm transition-all active:scale-95 ${
                monedaGasto === 'USD' 
                  ? 'bg-emerald-600 border-emerald-500 text-white' 
                  : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700')
              }`}
            >
              {monedaGasto}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex gap-1">
              <select value={categoria} onChange={e => setCategoria(e.target.value)} className={`p-2.5 border rounded-xl w-full text-sm font-semibold outline-none ${inputBg}`}>
                {categorias.filter(c => c.tipo === tipo).map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select>
              <button type="button" onClick={() => setMostrarModalCat(true)} className={`p-2 border rounded-xl ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <Plus size={18} />
              </button>
            </div>
            <select value={cuenta} onChange={e => setCuenta(e.target.value)} className={`p-2.5 border rounded-xl text-sm font-semibold outline-none ${inputBg}`}>
              {cuentas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <input 
            type="text" 
            placeholder="Descripción opcional" 
            value={descripcion} 
            onChange={e => setDescripcion(e.target.value)}
            className={`w-full p-2.5 border rounded-xl text-sm outline-none ${inputBg}`} 
          />

          <input 
            type="date" 
            value={fecha} 
            onChange={e => setFecha(e.target.value)}
            className={`w-full p-2.5 border rounded-xl text-sm outline-none ${inputBg}`} 
            required 
          />

          <button type="submit" className={`w-full py-3 rounded-xl font-bold transition-all active:scale-95 ${
            darkMode ? 'bg-slate-100 text-slate-900 hover:bg-white' : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}>
            {editandoRegistro ? 'Actualizar Registro' : 'Guardar Movimiento'}
          </button>
        </form>
      )}

      {/* Lista de Registros */}
      <h2 className="font-bold text-sm mb-3">
        Movimientos ({tab === 'actual' ? 'Mes Actual' : `${mesesNombres[mesFiltro - 1]} ${anioFiltro}`})
      </h2>

      <div className="space-y-2 w-full box-border">
        {registrosMostrados.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-6">No hay registros en este período</p>
        ) : (
          registrosMostrados.map(r => {
            const catObj = categorias.find(c => c.nombre === r.categoria);
            const monedaItem = r.moneda || 'ARS';
            return (
              <div key={r.id} className={`${cardBg} p-3 rounded-xl shadow-sm flex justify-between items-center border w-full box-border`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    r.tipo === 'ingreso' 
                      ? (darkMode ? 'bg-emerald-950/60 text-emerald-400' : 'bg-emerald-50 text-emerald-600') 
                      : (darkMode ? 'bg-rose-950/60 text-rose-400' : 'bg-rose-50 text-rose-600')
                  }`}>
                    <RenderIcono nombre={catObj?.icono || 'Tag'} />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{r.categoria} {r.descripcion ? `• ${r.descripcion}` : ''}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      📅 {r.fecha}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      💳 {r.cuenta}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`font-bold text-sm ${r.tipo === 'ingreso' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {r.tipo === 'ingreso' ? '+' : '-'}{formatearMonedaDirecta(Number(r.monto), monedaItem)}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => iniciarEdicion(r)} className="p-1 text-slate-400 hover:text-slate-200">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => eliminarRegistro(r.id)} className="p-1 text-slate-400 hover:text-rose-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Nueva Categoría */}
      {mostrarModalCat && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={crearCategoria} className={`${cardBg} p-5 rounded-2xl w-full max-w-xs space-y-4 shadow-xl border`}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">Nueva Categoría ({tipo})</h3>
              <button type="button" onClick={() => setMostrarModalCat(false)} className="text-slate-400">
                <X size={20} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Nombre de la categoría"
              value={nuevaCatNombre}
              onChange={e => setNuevaCatNombre(e.target.value)}
              className={`w-full p-2.5 border rounded-xl text-sm outline-none ${inputBg}`}
              required
            />

            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">Selecciona un Ícono:</p>
              <div className={`grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 border rounded-xl ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                {Object.keys(ICONOS_DISPONIBLES).map(nombreIcono => (
                  <button
                    type="button"
                    key={nombreIcono}
                    onClick={() => setNuevaCatIcono(nombreIcono)}
                    className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                      nuevaCatIcono === nombreIcono 
                        ? (darkMode ? 'bg-slate-100 text-slate-900 border-white scale-105' : 'bg-slate-900 text-white border-slate-900 scale-105')
                        : (darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-700 border-slate-200')
                    }`}
                  >
                    <RenderIcono nombre={nombreIcono} size={20} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setMostrarModalCat(false)} className={`flex-1 py-2 rounded-xl text-sm font-semibold ${
                darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
              }`}>
                Cancelar
              </button>
              <button type="submit" className={`flex-1 py-2 rounded-xl text-sm font-semibold ${
                darkMode ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-white'
              }`}>
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}// update chart
