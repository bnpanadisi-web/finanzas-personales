'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CreditCard, InstallmentPurchase, Category } from '@/types';
import { CreditCardVisual } from './CreditCardVisual';
import { CardModal } from './CardModal';
import { InstallmentPurchaseModal } from './InstallmentPurchaseModal';
import {
  useCreditCards,
  calculateInstallmentInfo,
  calculateCardSummary,
} from '@/hooks/useCreditCards';
import {
  CreditCard as CreditCardIcon,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  TrendingDown,
  ShoppingBag,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface CardsViewProps {
  categorias?: Category[];
  darkMode?: boolean;
  ocultarMontos?: boolean;
}

export function CardsView({
  categorias = [],
  darkMode = false,
  ocultarMontos = false,
}: CardsViewProps) {
  const {
    tarjetas,
    compras,
    tarjetaSeleccionadaId,
    setTarjetaSeleccionadaId,
    agregarTarjeta,
    editarTarjeta,
    eliminarTarjeta,
    agregarCompra,
    editarCompra,
    eliminarCompra,
    ajustarCuotasPagas,
    pagarResumenMesTarjeta,
    sincronizarConNube,
    sincronizandoNube,
  } = useCreditCards();

  // Estados de modales
  const [modalTarjetaAbierto, setModalTarjetaAbierto] = useState(false);
  const [tarjetaAEditar, setTarjetaAEditar] = useState<CreditCard | null>(null);

  const [modalCompraAbierto, setModalCompraAbierto] = useState(false);
  const [compraAEditar, setCompraAEditar] = useState<InstallmentPurchase | null>(null);

  // Filtro de compras
  const [filtroEstado, setFiltroEstado] = useState<'activas' | 'todas' | 'finalizadas'>('activas');

  const { success } = useToast();

  const tarjetaSeleccionada = tarjetas.find(t => t.id === tarjetaSeleccionadaId) || tarjetas[0] || null;

  // Referencias y control de carrusel horizontal para celulares
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardElementsRef = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentIndex = Math.max(
    0,
    tarjetas.findIndex(t => t.id === tarjetaSeleccionada?.id)
  );

  const scrollToCard = useCallback(
    (id: string) => {
      setTarjetaSeleccionadaId(id);
      const el = cardElementsRef.current[id];
      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    },
    [setTarjetaSeleccionadaId]
  );

  const goToPrevCard = useCallback(() => {
    if (currentIndex > 0) {
      scrollToCard(tarjetas[currentIndex - 1].id);
    }
  }, [currentIndex, tarjetas, scrollToCard]);

  const goToNextCard = useCallback(() => {
    if (currentIndex < tarjetas.length - 1) {
      scrollToCard(tarjetas[currentIndex + 1].id);
    }
  }, [currentIndex, tarjetas, scrollToCard]);

  const handleCarouselScroll = useCallback(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      if (!carouselRef.current || tarjetas.length === 0) return;
      const container = carouselRef.current;
      const containerCenter = container.scrollLeft + container.clientWidth / 2;

      let closestCardId = tarjetas[0].id;
      let minDistance = Infinity;

      for (const card of tarjetas) {
        const el = cardElementsRef.current[card.id];
        if (el) {
          const cardCenter = el.offsetLeft + el.offsetWidth / 2;
          const distance = Math.abs(containerCenter - cardCenter);
          if (distance < minDistance) {
            minDistance = distance;
            closestCardId = card.id;
          }
        }
      }

      if (closestCardId && closestCardId !== tarjetaSeleccionada?.id) {
        setTarjetaSeleccionadaId(closestCardId);
      }
    }, 60);
  }, [tarjetas, tarjetaSeleccionada, setTarjetaSeleccionadaId]);

  // Centrar tarjeta seleccionada al cargar la vista
  useEffect(() => {
    const id = tarjetaSeleccionada?.id;
    if (id && cardElementsRef.current[id]) {
      cardElementsRef.current[id]?.scrollIntoView({
        behavior: 'auto',
        inline: 'center',
        block: 'nearest',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cálculos globales de todas las tarjetas
  let totalGlobalMesARS = 0;
  let totalGlobalMesUSD = 0;
  let totalGlobalPendienteARS = 0;
  let totalGlobalPendienteUSD = 0;
  let totalComprasActivasGlobal = 0;

  tarjetas.forEach(t => {
    const s = calculateCardSummary(t, compras);
    totalGlobalMesARS += s.totalMesActualARS;
    totalGlobalMesUSD += s.totalMesActualUSD;
    totalGlobalPendienteARS += s.totalPendienteARS;
    totalGlobalPendienteUSD += s.totalPendienteUSD;
    totalComprasActivasGlobal += s.comprasActivas;
  });

  // Resumen de la tarjeta actualmente seleccionada
  const resumenSeleccionada = tarjetaSeleccionada
    ? calculateCardSummary(tarjetaSeleccionada, compras)
    : null;

  // Compras de la tarjeta seleccionada
  const comprasTarjeta = tarjetaSeleccionada
    ? compras.filter(c => c.tarjetaId === tarjetaSeleccionada.id)
    : [];

  const comprasFiltradas = comprasTarjeta.filter(c => {
    const info = calculateInstallmentInfo(c);
    if (filtroEstado === 'activas') return !info.finalizada;
    if (filtroEstado === 'finalizadas') return info.finalizada;
    return true;
  });

  const cardContainerBg = darkMode
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-200';

  const formatDinero = (valor: number, moneda: 'ARS' | 'USD' = 'ARS', decimales: number = 0) => {
    if (ocultarMontos) return '••••••';
    const simbolo = moneda === 'ARS' ? '$' : 'US$';
    return `${simbolo} ${valor.toLocaleString('es-AR', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    })}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Métricas Globales del Menú de Cuotas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* A pagar este mes */}
        <div className={`p-4 rounded-3xl border shadow-sm ${cardContainerBg} flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Cuotas Este Mes
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Calendar size={16} />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-black text-sky-400">
              {formatDinero(totalGlobalMesARS, 'ARS')}
            </p>
            {totalGlobalMesUSD > 0 && (
              <p className="text-xs font-bold text-emerald-400 mt-0.5">
                + {formatDinero(totalGlobalMesUSD, 'USD')}
              </p>
            )}
            <p className="text-[10px] text-slate-500 mt-1">Total a pagar en resúmenes actuales</p>
          </div>
        </div>

        {/* Deuda Total en Cuotas */}
        <div className={`p-4 rounded-3xl border shadow-sm ${cardContainerBg} flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Saldo Restante
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <TrendingDown size={16} />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-black text-slate-100">
              {formatDinero(totalGlobalPendienteARS, 'ARS')}
            </p>
            {totalGlobalPendienteUSD > 0 && (
              <p className="text-xs font-bold text-emerald-400 mt-0.5">
                + {formatDinero(totalGlobalPendienteUSD, 'USD')}
              </p>
            )}
            <p className="text-[10px] text-slate-500 mt-1">Deuda total futura en cuotas</p>
          </div>
        </div>

        {/* Compras en Cuotas Activas */}
        <div className={`p-4 rounded-3xl border shadow-sm ${cardContainerBg} flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Planes Activos
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <ShoppingBag size={16} />
            </div>
          </div>
          <div>
            <p className="text-lg sm:text-xl font-black text-indigo-400">
              {totalComprasActivasGlobal}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Compras en curso en {tarjetas.length} {tarjetas.length === 1 ? 'tarjeta' : 'tarjetas'}
            </p>
          </div>
        </div>

        {/* Próximo Vencimiento */}
        <div className={`p-4 rounded-3xl border shadow-sm ${cardContainerBg} flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Próximo Cierre / Pago
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div>
            {resumenSeleccionada && resumenSeleccionada.textoVencimiento ? (
              <>
                <p className={`text-sm sm:text-base font-extrabold ${
                  resumenSeleccionada.estadoVencimiento === 'urgente'
                    ? 'text-rose-400'
                    : resumenSeleccionada.estadoVencimiento === 'proximo'
                    ? 'text-amber-400'
                    : 'text-slate-200'
                }`}>
                  {resumenSeleccionada.textoVencimiento}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                  {tarjetaSeleccionada?.alias || 'Tarjeta'}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-400">Sin vencimientos</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Configura día en tu tarjeta</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Sección: Dibujos de Todas las Tarjetas Cargadas */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm ${cardContainerBg} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CreditCardIcon size={20} className="text-sky-400" />
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-100">
                Mis Tarjetas de Crédito
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Haz clic en cualquier tarjeta para desplegar y administrar sus consumos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await sincronizarConNube();
                success('¡Sincronizado con Supabase!');
              }}
              disabled={sincronizandoNube}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Sincronizar tarjetas y compras con la nube de Supabase"
            >
              <RefreshCw size={14} className={sincronizandoNube ? 'animate-spin text-sky-400' : 'text-slate-400'} />
              <span>{sincronizandoNube ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTarjetaAEditar(null);
                setModalTarjetaAbierto(true);
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Nueva Tarjeta</span>
            </button>
          </div>
        </div>

        {/* Lista visual de tarjetas (Carrusel horizontal / Cuadrícula interactiva) */}
        {tarjetas.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl border-2 border-dashed border-slate-800 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <CreditCardIcon size={28} />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-sm font-bold text-slate-200">Aún no tienes tarjetas de crédito</h3>
              <p className="text-xs text-slate-400">
                Agrega tu primera tarjeta (Visa, Mastercard, Amex, etc.) y elige su skin (Común, Dorada, Platino o Black) para comenzar a llevar el control exacto de tus cuotas.
              </p>
            </div>
            <button
              onClick={() => {
                setTarjetaAEditar(null);
                setModalTarjetaAbierto(true);
              }}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
            >
              + Agregar Mi Primera Tarjeta
            </button>
          </div>
        ) : (
          <div>
            {/* VISTA MÓVIL (md:hidden): Carrusel deslizable horizontalmente para optimizar pantalla */}
            <div className="md:hidden">
              <div
                ref={carouselRef}
                onScroll={handleCarouselScroll}
                className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 pt-1 px-4 -mx-4 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {tarjetas.map(card => {
                  const summary = calculateCardSummary(card, compras);
                  const isSelected = tarjetaSeleccionada?.id === card.id;

                  return (
                    <div
                      key={card.id}
                      ref={el => {
                        cardElementsRef.current[card.id] = el;
                      }}
                      className="shrink-0 snap-center w-[84vw] max-w-[340px] flex flex-col items-center"
                    >
                      <CreditCardVisual
                        card={card}
                        isSelected={isSelected}
                        onClick={() => scrollToCard(card.id)}
                        resumenVencimientoTexto={summary.textoVencimiento}
                        resumenVencimientoEstado={summary.estadoVencimiento}
                        totalMesARS={summary.totalMesActualARS}
                      />

                      {/* Barra rápida debajo de cada tarjeta */}
                      <div className="mt-2 flex items-center gap-2 text-[11px]">
                        <span className={`font-bold transition-colors ${isSelected ? 'text-sky-400' : 'text-slate-400'}`}>
                          {card.alias}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 bg-sky-500/20 text-sky-400 rounded-md text-[9px] font-extrabold">
                            Seleccionada
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Controles y puntos de navegación para celular */}
              {tarjetas.length > 1 && (
                <div className="flex items-center justify-between pt-3 px-1">
                  <button
                    type="button"
                    onClick={goToPrevCard}
                    disabled={currentIndex <= 0}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95 border border-slate-700/60"
                    aria-label="Tarjeta anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      {tarjetas.map((card, idx) => (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => scrollToCard(card.id)}
                          className={`transition-all rounded-full cursor-pointer ${
                            idx === currentIndex
                              ? 'w-6 h-2 bg-sky-400 shadow-sm shadow-sky-400/50'
                              : 'w-2 h-2 bg-slate-700 hover:bg-slate-600'
                          }`}
                          aria-label={`Ir a tarjeta ${card.alias}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {currentIndex + 1} de {tarjetas.length} · Desliza para cambiar
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={goToNextCard}
                    disabled={currentIndex >= tarjetas.length - 1}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95 border border-slate-700/60"
                    aria-label="Tarjeta siguiente"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* VISTA TABLET Y COMPUTADORA (hidden md:grid): Cuadrícula completa interactiva */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {tarjetas.map(card => {
                const summary = calculateCardSummary(card, compras);
                const isSelected = tarjetaSeleccionada?.id === card.id;

                return (
                  <div key={card.id} className="flex flex-col items-center">
                    <CreditCardVisual
                      card={card}
                      isSelected={isSelected}
                      onClick={() => setTarjetaSeleccionadaId(card.id)}
                      resumenVencimientoTexto={summary.textoVencimiento}
                      resumenVencimientoEstado={summary.estadoVencimiento}
                      totalMesARS={summary.totalMesActualARS}
                    />

                    {/* Barra rápida debajo de cada dibujo para indicar selección */}
                    <div className="mt-2 flex items-center gap-2 text-[11px]">
                      <span className={`font-bold transition-colors ${isSelected ? 'text-sky-400' : 'text-slate-400'}`}>
                        {card.alias}
                      </span>
                      {isSelected && (
                        <span className="px-1.5 py-0.2 bg-sky-500/20 text-sky-400 rounded-md text-[9px] font-extrabold">
                          Seleccionada
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Sección: Consumos y Cuotas de la Tarjeta Seleccionada */}
      {tarjetaSeleccionada && (
        <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm ${cardContainerBg} space-y-5 animate-in fade-in duration-200`}>
          {/* Cabecera del Detalle de la Tarjeta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center font-black">
                {(tarjetaSeleccionada.red || 'TC').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-slate-100">
                    {tarjetaSeleccionada.alias || 'Tarjeta'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                    •••• {tarjetaSeleccionada.ultimosDigitos || '••••'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase">
                    Skin {tarjetaSeleccionada.skin || 'comun'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {tarjetaSeleccionada.emisor ? `${tarjetaSeleccionada.emisor} • ` : ''}
                  {tarjetaSeleccionada.diaCierre ? `Cierra el día ${tarjetaSeleccionada.diaCierre} • ` : ''}
                  {tarjetaSeleccionada.diaVencimiento ? `Vence el día ${tarjetaSeleccionada.diaVencimiento}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setCompraAEditar(null);
                  setModalCompraAbierto(true);
                }}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>Cargar Compra en Cuotas</span>
              </button>

              <button
                onClick={() => {
                  setTarjetaAEditar(tarjetaSeleccionada);
                  setModalTarjetaAbierto(true);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                title="Editar Tarjeta"
              >
                <Edit3 size={16} />
              </button>
            </div>
          </div>

          {/* Tarjetas de Resumen Financiero de la Tarjeta */}
          {resumenSeleccionada && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    A Pagar Este Mes
                  </span>
                  <span className="text-base sm:text-lg font-black text-sky-400">
                    {formatDinero(resumenSeleccionada.totalMesActualARS, 'ARS', 2)}
                    {resumenSeleccionada.totalMesActualUSD > 0 && (
                      <span className="text-xs text-emerald-400 ml-1">
                        + {formatDinero(resumenSeleccionada.totalMesActualUSD, 'USD')}
                      </span>
                    )}
                  </span>
                </div>

                {/* Botón para marcar el resumen / cuotas de este mes como pagadas */}
                <div className="mt-2">
                  {resumenSeleccionada.totalMesActualARS > 0 || resumenSeleccionada.totalMesActualUSD > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const cant = pagarResumenMesTarjeta(tarjetaSeleccionada.id);
                        if (cant > 0) {
                          success(
                            `¡Tarjeta marcada como paga! (${cant} ${
                              cant === 1 ? 'cuota abonada' : 'cuotas abonadas'
                            })`
                          );
                        } else {
                          success('La tarjeta ya se encuentra al día para este mes.');
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                      title="Marcar todas las cuotas de este mes como pagadas"
                    >
                      <CheckCircle2 size={13} />
                      <span>Marcar mes como pago</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <CheckCircle2 size={12} />
                      Mes al día / Pagado
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Deuda en Cuotas
                </span>
                <span className="text-base sm:text-lg font-black text-slate-200">
                  {formatDinero(resumenSeleccionada.totalPendienteARS, 'ARS', 2)}
                  {resumenSeleccionada.totalPendienteUSD > 0 && (
                    <span className="text-xs text-emerald-400 ml-1">
                      + {formatDinero(resumenSeleccionada.totalPendienteUSD, 'USD')}
                    </span>
                  )}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Recordatorio de Vencimiento
                </span>
                <span className={`text-xs sm:text-sm font-bold flex items-center gap-1 mt-0.5 ${
                  resumenSeleccionada.estadoVencimiento === 'urgente'
                    ? 'text-rose-400'
                    : resumenSeleccionada.estadoVencimiento === 'proximo'
                    ? 'text-amber-400'
                    : 'text-slate-300'
                }`}>
                  <Clock size={14} />
                  {resumenSeleccionada.textoVencimiento || 'Sin fecha de vencimiento'}
                </span>
              </div>
            </div>
          )}

          {/* Filtros de Estado de Compras */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'activas', label: 'Cuotas Activas' },
                  { id: 'finalizadas', label: 'Finalizadas' },
                  { id: 'todas', label: 'Todas las compras' },
                ] as const
              ).map(f => (
                <button
                  key={f.id}
                  onClick={() => setFiltroEstado(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filtroEstado === f.id
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <span className="text-xs font-bold text-slate-400">
              {comprasFiltradas.length} {comprasFiltradas.length === 1 ? 'consumo' : 'consumos'}
            </span>
          </div>

          {/* Lista de Consumos / Compras en Cuotas */}
          {comprasFiltradas.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-800 space-y-2">
              <ShoppingBag size={28} className="mx-auto text-slate-600" />
              <p className="text-xs font-bold text-slate-300">
                {filtroEstado === 'activas'
                  ? 'No hay cuotas activas pendientes en esta tarjeta.'
                  : 'No hay compras registradas con este filtro.'}
              </p>
              <button
                onClick={() => {
                  setCompraAEditar(null);
                  setModalCompraAbierto(true);
                }}
                className="text-xs font-bold text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                + Cargar nueva compra en cuotas
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {comprasFiltradas.map(compra => {
                const info = calculateInstallmentInfo(compra);

                return (
                  <div
                    key={compra.id}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                  >
                    {/* Fila Principal: Concepto, Montos y Acciones */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-slate-100">
                            {compra.descripcion}
                          </h4>
                          {compra.categoria && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              {compra.categoria}
                            </span>
                          )}
                          {info.finalizada ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 size={11} /> Pagada
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              Cuota {Math.min(info.cuotasPagas + 1, compra.cuotasTotales)} de {compra.cuotasTotales}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Comprado el {compra.fechaCompra} • Plan {compra.cuotasTotales} cuotas
                        </p>
                      </div>

                      {/* Montos */}
                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-right">
                          <span className="text-base font-black text-sky-400 block">
                            {formatDinero(info.montoPorCuota, compra.moneda, 2)}{' '}
                            <span className="text-xs font-normal text-slate-400">/ mes</span>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Total: {formatDinero(compra.montoTotal, compra.moneda, 2)}
                          </span>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setCompraAEditar(compra);
                              setModalCompraAbierto(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Editar compra"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Eliminar la compra "${compra.descripcion}"?`)) {
                                eliminarCompra(compra.id);
                                success('Compra eliminada');
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar compra"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Progreso de Cuotas */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          Progreso: <strong className="text-slate-200">{info.cuotasPagas} de {compra.cuotasTotales} cuotas pagadas</strong>
                        </span>
                        <span className="font-extrabold text-sky-400">{info.porcentajeProgreso}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            info.finalizada ? 'bg-emerald-500' : 'bg-gradient-to-r from-sky-500 to-indigo-500'
                          }`}
                          style={{ width: `${info.porcentajeProgreso}%` }}
                        />
                      </div>
                    </div>

                    {/* Controles para cambiar cuotas pagadas rápidamente */}
                    {!info.finalizada && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                        <span className="text-slate-400">
                          Saldo restante: <strong className="text-slate-200">{formatDinero(info.saldoRestante, compra.moneda, 0)}</strong>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {info.cuotasPagas > 0 && (
                            <button
                              type="button"
                              onClick={() => ajustarCuotasPagas(compra.id, info.cuotasPagas - 1)}
                              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] transition-colors cursor-pointer"
                              title="Restar 1 cuota pagada"
                            >
                              -1 Cuota
                            </button>
                          )}
                          {info.cuotasPagas < compra.cuotasTotales && (
                            <button
                              type="button"
                              onClick={() => {
                                ajustarCuotasPagas(compra.id, info.cuotasPagas + 1);
                                success(`¡Cuota ${info.cuotasPagas + 1} marcada como pagada!`);
                              }}
                              className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 size={11} />
                              Marcar Cuota {info.cuotasPagas + 1} como Paga
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Agregar / Editar Tarjeta */}
      <CardModal
        isOpen={modalTarjetaAbierto}
        onClose={() => {
          setModalTarjetaAbierto(false);
          setTarjetaAEditar(null);
        }}
        cardToEdit={tarjetaAEditar}
        onSave={cardData => {
          if (tarjetaAEditar) {
            editarTarjeta(tarjetaAEditar.id, cardData);
          } else {
            agregarTarjeta(cardData);
          }
        }}
        onDelete={id => {
          eliminarTarjeta(id);
          success('Tarjeta eliminada');
        }}
        darkMode={darkMode}
      />

      {/* Modal: Cargar Compra en Cuotas */}
      <InstallmentPurchaseModal
        isOpen={modalCompraAbierto}
        onClose={() => {
          setModalCompraAbierto(false);
          setCompraAEditar(null);
        }}
        tarjetas={tarjetas}
        tarjetaSeleccionadaId={tarjetaSeleccionadaId}
        compraToEdit={compraAEditar}
        categorias={categorias}
        onSave={compraData => {
          if (compraAEditar) {
            editarCompra(compraAEditar.id, compraData);
          } else {
            agregarCompra(compraData);
          }
        }}
        darkMode={darkMode}
      />
    </div>
  );
}
