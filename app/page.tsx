'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Lock, LogOut, Plus, PieChart as PieIcon, ArrowUpCircle, ArrowDownCircle,
  ShoppingCart, Home as HouseIcon, Zap, Utensils, Car, HeartPulse, Film, Tag, Wallet,
  Briefcase, TrendingUp, DollarSign, Dumbbell, Pizza, Coffee, Truck, Bike, Plane,
  GraduationCap, Gift, Smartphone, X, Edit2, Trash2, History, LayoutDashboard,
  Eye, EyeOff, DollarSign as CoinIcon
} from 'lucide-react';

const ICONOS_DISPONIBLES: Record<string, any> = {
  Dumbbell, Pizza, Coffee, Truck, Bike, Utensils, ShoppingCart, HouseIcon, 
  Zap, Car, HeartPulse, Film, Plane, GraduationCap, Gift, Smartphone, Tag, 
  Wallet, Briefcase, TrendingUp, DollarSign
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
  id: number;
  tipo: 'ingreso' | 'gasto';
  monto: number;
  categoria: string;
  cuenta: string;
  descripcion: string;
  fecha: string;
}

export default function FinanzasApp() {
  const [pinIngresado, setPinIngresado] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [errorPin, setErrorPin] = useState(false);

  // Estados de Privacidad y Moneda
  const [ocultarMontos, setOcultarMontos] = useState(false);
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>('ARS');
  const [cotizacionDolar, setCotizacionDolar] = useState<number>(1000);

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
    const sesion = localStorage.getItem('finanzas_auth');
    if (sesion === 'true') setAutenticado(true);
    const priv = localStorage.getItem('finanzas_privacidad');
    if (priv === 'true') setOcultarMontos(true);
  }, []);

  useEffect(() => {
    if (autenticado) {
      cargarDatos();
    }
  }, [autenticado, tipo]);

  async function cargarDatos() {
    const { data: catData } = await supabase.from('categorias').select('*');
    if (catData) {
      setCategorias(catData);
      const primera = catData.find(c => c.tipo === tipo);
      if (primera) setCategoria(primera.nombre);
    }

    const { data: regData } = await supabase.from('registros').select('*').order('fecha', { ascending: false });
    if (regData) setRegistros(regData);
  }

  function toggleMoneda() {
    if (moneda === 'ARS') {
      const valorDolar = prompt('Ingrese el valor de cotización del dólar (ARS):', cotizacionDolar.toString());
      if (valorDolar && !isNaN(parseFloat(valorDolar)) && parseFloat(valorDolar) > 0) {
        setCotizacionDolar(parseFloat(valorDolar));
        setMoneda('USD');
      }
    } else {
      setMoneda('ARS');
    }
  }

  function formatearMoneda(valor: number): string {
    if (ocultarMontos) return '••••••';

    const valorConvertido = moneda === 'USD' ? valor / cotizacionDolar : valor;
    const simbolo = moneda === 'USD' ? 'US$ ' : '$ ';

    return simbolo + new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valorConvertido);
  }

  // Manejador del Input con soporte de decimales (coma) y puntos de miles
  function handleMontoChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value;

    // Permitir solo números y comas
    raw = raw.replace(/[^0-9,]/g, '');

    // Permitir una sola coma decimal
    const partes = raw.split(',');
    if (partes.length > 2) return;

    // Formatear la parte entera con puntos de miles
    let parteEntera = partes[0].replace(/\D/g, '');
    if (parteEntera) {
      parteEntera = new Intl.NumberFormat('es-AR').format(parseInt(parteEntera, 10));
    }

    // Limitar decimales a 2 dígitos
    let parteDecimal = partes[1] !== undefined ? ',' + partes[1].slice(0, 2) : '';

    setMontoInput(parteEntera + parteDecimal);
  }

  function validarPin(e: React.FormEvent) {
    e.preventDefault();
    const pinCorrecto = process.env.NEXT_PUBLIC_APP_PIN || '2706';
    if (pinIngresado === pinCorrecto) {
      setAutenticado(true);
      localStorage.setItem('finanzas_auth', 'true');
      setErrorPin(false);
    } else {
      setErrorPin(true);
    }
  }

  function cerrarSesion() {
    localStorage.removeItem('finanzas_auth');
    setAutenticado(false);
    setPinIngresado('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!montoInput || !categoria) return;

    // Convertir formato visual ("1.250,50") a float JS (1250.50)
    const montoLimpio = parseFloat(montoInput.replace(/\./g, '').replace(',', '.'));
    if (isNaN(montoLimpio)) return;

    if (editandoRegistro) {
      await supabase.from('registros').update({
        tipo,
        monto: montoLimpio,
        categoria,
        cuenta,
        descripcion,
        fecha
      }).eq('id', editandoRegistro.id);
      setEditandoRegistro(null);
    } else {
      await supabase.from('registros').insert([{
        tipo,
        monto: montoLimpio,
        categoria,
        cuenta,
        descripcion,
        fecha
      }]);
    }

    setMontoInput('');
    setDescripcion('');
    setFecha(fechaHoy.toISOString().split('T')[0]);
    cargarDatos();
  }

  async function eliminarRegistro(id: number) {
    if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
    await supabase.from('registros').delete().eq('id', id);
    cargarDatos();
  }

  function iniciarEdicion(r: Registro) {
    setTab('actual');
    setEditandoRegistro(r);
    setTipo(r.tipo);
    // Convertir decimal con coma para la edicion
    const partes = r.monto.toFixed(2).split('.');
    const parteEnteraFormateada = new Intl.NumberFormat('es-AR').format(parseInt(partes[0], 10));
    setMontoInput(`${parteEnteraFormateada},${partes[1]}`);
    setCategoria(r.categoria);
    setCuenta(r.cuenta);
    setDescripcion(r.descripcion || '');
    setFecha(r.fecha);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Filtrado de Datos
  const registrosMostrados = registros.filter(r => {
    const f = new Date(r.fecha + 'T00:00:00');
    if (tab === 'actual') {
      return f.getMonth() === fechaHoy.getMonth() && f.getFullYear() === fechaHoy.getFullYear();
    } else {
      return f.getMonth() + 1 === mesFiltro && f.getFullYear() === anioFiltro;
    }
  });

  const totalIngresos = registrosMostrados.filter(r => r.tipo === 'ingreso').reduce((acc, r) => acc + Number(r.monto), 0);
  const totalGastos = registrosMostrados.filter(r => r.tipo === 'gasto').reduce((acc, r) => acc + Number(r.monto), 0);

  const gastosPorCategoria = registrosMostrados
    .filter(r => r.tipo === 'gasto')
    .reduce((acc: Record<string, number>, r) => {
      acc[r.categoria] = (acc[r.categoria] || 0) + Number(r.monto);
      return acc;
    }, {});

  if (!autenticado) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={validarPin} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm text-center space-y-4">
          <div className="bg-slate-100 p-3 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-slate-800">
            <Lock size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Acceso a Finanzas</h1>
          <input
            type="password"
            placeholder="Ingrese PIN"
            value={pinIngresado}
            onChange={e => setPinIngresado(e.target.value)}
            className="w-full p-3 border rounded-xl text-center text-2xl tracking-widest outline-none focus:ring-2 focus:ring-slate-800"
            maxLength={6}
          />
          {errorPin && <p className="text-red-500 text-sm">PIN Incorrecto</p>}
          <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">
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

  const entradasGastos = Object.entries(gastosPorCategoria);
  let acumuladoAngulo = 0;

  return (
    <main className="max-w-md mx-auto p-4 bg-slate-50 min-h-screen text-slate-800 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Mis Finanzas</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleMoneda} 
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-bold text-slate-700 flex items-center gap-1 active:scale-95 transition-all"
          >
            <CoinIcon size={14} className="text-slate-500" /> {moneda}
          </button>
          <button 
            onClick={() => setOcultarMontos(!ocultarMontos)} 
            className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-600 active:scale-95 transition-all"
          >
            {ocultarMontos ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button 
            onClick={cerrarSesion} 
            className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-600 active:scale-95 transition-all"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200 p-1 rounded-xl mb-6">
        <button
          onClick={() => setTab('actual')}
          className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            tab === 'actual' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
          }`}
        >
          <LayoutDashboard size={16} /> Mes Actual
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            tab === 'historial' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
          }`}
        >
          <History size={16} /> Historial
        </button>
      </div>

      {/* Filtro Historial */}
      {tab === 'historial' && (
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-6 flex gap-2">
          <select
            value={mesFiltro}
            onChange={e => setMesFiltro(Number(e.target.value))}
            className="flex-1 p-2 border rounded-xl bg-white text-sm font-semibold"
          >
            {mesesNombres.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>
          <select
            value={anioFiltro}
            onChange={e => setAnioFiltro(Number(e.target.value))}
            className="w-28 p-2 border rounded-xl bg-white text-sm font-semibold"
          >
            {[2025, 2026, 2027].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-3 gap-2 mb-6 text-center">
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 font-medium">Ingresos</p>
          <p className="font-bold text-emerald-600 text-xs sm:text-sm">{formatearMoneda(totalIngresos)}</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 font-medium">Gastos</p>
          <p className="font-bold text-rose-600 text-xs sm:text-sm">{formatearMoneda(totalGastos)}</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 font-medium">Balance</p>
          <p className="font-bold text-slate-800 text-xs sm:text-sm">{formatearMoneda(totalIngresos - totalGastos)}</p>
        </div>
      </div>

      {/* Gráfico de Torta en Historial */}
      {tab === 'historial' && (
        <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon size={18} className="text-slate-600" />
            <h2 className="font-bold text-sm">
              Gráfico de Gastos ({mesesNombres[mesFiltro - 1]} {anioFiltro})
            </h2>
          </div>

          {totalGastos === 0 ? (
            <p className="text-center text-xs text-slate-400 py-4">No hay gastos para mostrar el gráfico en este período</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  {entradasGastos.map(([cat, monto], index) => {
                    const porcentaje = (monto / totalGastos) * 100;
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
                  <p className="text-[11px] font-bold text-slate-800">{formatearMoneda(totalGastos)}</p>
                </div>
              </div>

              <div className="flex-1 space-y-1.5 w-full">
                {entradasGastos.map(([cat, monto], index) => {
                  const porcentaje = Math.round((monto / totalGastos) * 100);
                  const catObj = categorias.find(c => c.nombre === cat);
                  const color = COLORES_GRAFICO[index % COLORES_GRAFICO.length];

                  return (
                    <div key={cat} className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <RenderIcono nombre={catObj?.icono || 'Tag'} size={14} /> {cat}
                      </span>
                      <span className="font-bold text-slate-600">{formatearMoneda(monto)} ({porcentaje}%)</span>
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
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl shadow-sm space-y-3 mb-6 border border-slate-100">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-slate-400">
              {editandoRegistro ? '✏️ EDITANDO REGISTRO' : '➕ NUEVO MOVIMIENTO'}
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
              className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1 ${tipo === 'gasto' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <ArrowDownCircle size={16} /> Gasto
            </button>
            <button type="button" onClick={() => setTipo('ingreso')}
              className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1 ${tipo === 'ingreso' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <ArrowUpCircle size={16} /> Ingreso
            </button>
          </div>

          <input 
            type="text" 
            placeholder="Monto ($)" 
            value={montoInput} 
            onChange={handleMontoChange}
            className="w-full p-3 border rounded-xl text-xl font-bold text-center outline-none focus:ring-2 focus:ring-slate-800" 
            required 
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="flex gap-1">
              <select value={categoria} onChange={e => setCategoria(e.target.value)} className="p-2 border rounded-xl bg-white w-full text-sm font-semibold">
                {categorias.filter(c => c.tipo === tipo).map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
              </select>
              <button type="button" onClick={() => setMostrarModalCat(true)} className="p-2 bg-slate-100 rounded-xl text-slate-700">
                <Plus size={18} />
              </button>
            </div>
            <select value={cuenta} onChange={e => setCuenta(e.target.value)} className="p-2 border rounded-xl bg-white text-sm font-semibold">
              {cuentas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Descripción opcional" value={descripcion} onChange={e => setDescripcion(e.target.value)}
              className="p-2.5 border rounded-xl text-sm outline-none" />
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="p-2.5 border rounded-xl text-sm bg-white outline-none" required />
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">
            {editandoRegistro ? 'Actualizar Registro' : 'Guardar Movimiento'}
          </button>
        </form>
      )}

      {/* Lista de Registros */}
      <h2 className="font-bold text-sm mb-3">
        Movimientos ({tab === 'actual' ? 'Mes Actual' : `${mesesNombres[mesFiltro - 1]} ${anioFiltro}`})
      </h2>

      <div className="space-y-2">
        {registrosMostrados.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-6">No hay registros en este período</p>
        ) : (
          registrosMostrados.map(r => {
            const catObj = categorias.find(c => c.nombre === r.categoria);
            return (
              <div key={r.id} className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${r.tipo === 'ingreso' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <RenderIcono nombre={catObj?.icono || 'Tag'} />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{r.categoria}</p>
                    <p className="text-xs text-slate-400">{r.descripcion || r.cuenta} • <span className="italic">{r.fecha}</span></p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`font-bold text-sm ${r.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {r.tipo === 'ingreso' ? '+' : '-'}{formatearMoneda(Number(r.monto))}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => iniciarEdicion(r)} className="p-1 text-slate-400 hover:text-slate-800">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={crearCategoria} className="bg-white p-5 rounded-2xl w-full max-w-xs space-y-4 shadow-xl">
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
              className="w-full p-2.5 border rounded-xl text-sm outline-none"
              required
            />

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Selecciona un Ícono:</p>
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 border rounded-xl">
                {Object.keys(ICONOS_DISPONIBLES).map(nombreIcono => (
                  <button
                    type="button"
                    key={nombreIcono}
                    onClick={() => setNuevaCatIcono(nombreIcono)}
                    className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                      nuevaCatIcono === nombreIcono 
                        ? 'bg-slate-900 text-white border-slate-900 scale-105' 
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <RenderIcono nombre={nombreIcono} size={20} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setMostrarModalCat(false)} className="flex-1 py-2 bg-slate-100 rounded-xl text-sm font-semibold">
                Cancelar
              </button>
              <button type="submit" className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}