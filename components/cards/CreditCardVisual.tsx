'use client';
import React from 'react';
import { CreditCard, CardNetwork, CardSkin } from '@/types';
import { Wifi, Clock } from 'lucide-react';

interface CreditCardVisualProps {
  card: CreditCard;
  isSelected?: boolean;
  onClick?: () => void;
  resumenVencimientoTexto?: string;
  resumenVencimientoEstado?: 'normal' | 'proximo' | 'urgente';
  totalMesARS?: number;
}

export function CreditCardVisual({
  card,
  isSelected = false,
  onClick,
  resumenVencimientoTexto,
  resumenVencimientoEstado,
  totalMesARS,
}: CreditCardVisualProps) {
  const skinStyles = getSkinStyles(card.skin);

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={e => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative select-none cursor-pointer transition-all duration-300 transform rounded-3xl p-5 sm:p-6 w-full max-w-[380px] aspect-[1.586/1] flex flex-col justify-between overflow-hidden shadow-2xl ${
        skinStyles.container
      } ${
        isSelected
          ? 'ring-4 ring-sky-500 shadow-sky-500/30 scale-[1.02] -translate-y-1'
          : 'hover:scale-[1.01] hover:-translate-y-0.5 opacity-90 hover:opacity-100'
      }`}
    >
      {/* Capa de brillo metálico / overlay reflexivo */}
      <div className={`absolute inset-0 pointer-events-none ${skinStyles.shimmer}`} />

      {/* Marca de agua o patrón decorativo según la skin */}
      <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full opacity-10 bg-white blur-2xl pointer-events-none" />
      <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full opacity-15 bg-white blur-xl pointer-events-none" />

      {/* Fila Superior: Banco / Emisor y Red (Logo) */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <span className={`text-[10px] tracking-widest font-black uppercase block ${skinStyles.subtext}`}>
            {card.emisor || 'BANCO EMISOR'}
          </span>
          <span className={`text-sm sm:text-base font-extrabold tracking-tight truncate max-w-[190px] block ${skinStyles.text}`}>
            {card.alias || 'Tarjeta de Crédito'}
          </span>
        </div>

        {/* Logo de la Empresa / Red */}
        <div className="shrink-0 flex items-center justify-end">
          <CardBrandLogo red={card.red} variant={card.skin} />
        </div>
      </div>

      {/* Fila Media: Chip EMV + NFC Contactless + Skin Badge */}
      <div className="relative z-10 flex items-center justify-between my-auto py-1">
        <div className="flex items-center gap-3">
          {/* Chip EMV realista */}
          <EmvChip skin={card.skin} />

          {/* Símbolo Contactless (NFC) */}
          <div className={`rotate-90 ${skinStyles.chipNfc}`}>
            <Wifi size={18} strokeWidth={2.5} />
          </div>
        </div>

        {/* Badge de la Gama / Skin */}
        <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border ${skinStyles.badge}`}>
          {card.skin === 'comun' ? 'CLASSIC' : card.skin}
        </div>
      </div>

      {/* Fila Inferior: Número, Titular y Vencimiento */}
      <div className="relative z-10 space-y-2">
        {/* Número de tarjeta con últimos 4 dígitos */}
        <div className={`font-mono text-base sm:text-lg tracking-[0.25em] font-extrabold flex items-center gap-3 drop-shadow ${skinStyles.number}`}>
          <span>••••</span>
          <span>••••</span>
          <span>••••</span>
          <span className="tracking-widest font-black text-white">{card.ultimosDigitos || '••••'}</span>
        </div>

        <div className="flex items-end justify-between text-xs pt-1 border-t border-white/10">
          <div className="min-w-0 pr-2">
            <span className={`text-[8px] tracking-wider uppercase block font-semibold ${skinStyles.subtext}`}>
              TITULAR
            </span>
            <span className={`font-bold tracking-wider uppercase text-[11px] sm:text-xs truncate block ${skinStyles.text}`}>
              {card.titular || 'CLIENTE TITULAR'}
            </span>
          </div>

          <div className="shrink-0 text-right">
            <span className={`text-[8px] tracking-wider uppercase block font-semibold ${skinStyles.subtext}`}>
              VENCE
            </span>
            <span className={`font-mono font-bold text-[11px] sm:text-xs ${skinStyles.text}`}>
              {card.vencimientoTarjeta || '12/28'}
            </span>
          </div>
        </div>
      </div>

      {/* Etiqueta flotante inferior si tiene recordatorio de resumen o consumos */}
      {(resumenVencimientoTexto || (typeof totalMesARS === 'number' && totalMesARS > 0)) && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 pointer-events-none">
          {resumenVencimientoTexto && (
            <span
              className={`px-2 py-0.5 rounded-lg text-[9px] font-bold flex items-center gap-1 shadow-md ${
                resumenVencimientoEstado === 'urgente'
                  ? 'bg-rose-500 text-white animate-pulse'
                  : resumenVencimientoEstado === 'proximo'
                  ? 'bg-amber-500 text-black'
                  : 'bg-black/60 text-white backdrop-blur-md border border-white/20'
              }`}
            >
              <Clock size={10} />
              {resumenVencimientoTexto}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// LOGOS VECTORIALES DE MARCAS DE TARJETA
// ----------------------------------------------------------------------
function CardBrandLogo({ red, variant }: { red: CardNetwork; variant: CardSkin }) {
  const isLightBackground = variant === 'platino';

  switch (red) {
    case 'visa':
      return (
        <div className="flex items-center italic font-black text-xl sm:text-2xl tracking-tighter text-white drop-shadow">
          <span className={isLightBackground ? 'text-blue-900 font-black' : 'text-white'}>
            VISA
          </span>
        </div>
      );

    case 'mastercard':
      return (
        <div className="flex items-center drop-shadow">
          <div className="w-6 h-6 rounded-full bg-[#EB001B] opacity-95"></div>
          <div className="w-6 h-6 rounded-full bg-[#F79E1B] -ml-3 opacity-95"></div>
        </div>
      );

    case 'amex':
      return (
        <div className="px-2 py-1 bg-[#006FCF] text-white font-black text-[10px] tracking-tighter rounded border border-white/40 drop-shadow">
          AMEX
        </div>
      );

    case 'cabal':
      return (
        <div className="px-2 py-0.5 bg-gradient-to-r from-red-600 to-blue-700 text-white font-black text-[9px] tracking-tight rounded border border-white/30 drop-shadow">
          CABAL
        </div>
      );

    case 'naranja':
      return (
        <div className="w-6 h-6 rounded-full bg-orange-500 text-white font-black text-[10px] flex items-center justify-center border border-white/40 drop-shadow shadow-orange-500/50">
          N
        </div>
      );

    default:
      return (
        <div className="px-2 py-0.5 bg-white/20 text-white font-black text-[10px] tracking-wider rounded border border-white/30 backdrop-blur-sm">
          CARD
        </div>
      );
  }
}

// ----------------------------------------------------------------------
// CHIP EMV REALISTA
// ----------------------------------------------------------------------
function EmvChip({ skin }: { skin: CardSkin }) {
  const isSilver = skin === 'platino';

  return (
    <div
      className={`relative w-10 h-7 sm:w-11 sm:h-8 rounded-lg overflow-hidden border shadow-inner flex items-center justify-center ${
        isSilver
          ? 'bg-gradient-to-tr from-slate-400 via-zinc-200 to-slate-400 border-slate-500/40 text-slate-700'
          : 'bg-gradient-to-tr from-amber-600 via-yellow-300 to-amber-500 border-yellow-700/50 text-amber-900'
      }`}
    >
      {/* Líneas de circuito de contacto EMV */}
      <svg className="w-full h-full opacity-60" viewBox="0 0 44 32">
        <rect x="2" y="2" width="40" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <line x1="14" y1="2" x2="14" y2="30" stroke="currentColor" strokeWidth="1" />
        <line x1="30" y1="2" x2="30" y2="30" stroke="currentColor" strokeWidth="1" />
        <line x1="2" y1="16" x2="14" y2="16" stroke="currentColor" strokeWidth="1" />
        <line x1="30" y1="16" x2="42" y2="16" stroke="currentColor" strokeWidth="1" />
        <circle cx="22" cy="16" r="4" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  );
}

// ----------------------------------------------------------------------
// ESTILOS VISUALES POR SKIN
// ----------------------------------------------------------------------
function getSkinStyles(skin: CardSkin) {
  switch (skin) {
    case 'dorada':
      return {
        container:
          'bg-gradient-to-tr from-amber-900 via-amber-600 to-yellow-500 border border-amber-300/40 text-amber-50 shadow-amber-950/40',
        text: 'text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]',
        subtext: 'text-amber-200/80 font-bold',
        number: 'text-amber-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
        chipNfc: 'text-amber-200',
        badge: 'bg-amber-950/40 text-amber-200 border-amber-400/30 backdrop-blur-sm',
        shimmer:
          'bg-gradient-to-tr from-transparent via-yellow-200/20 to-transparent opacity-60 mix-blend-overlay',
      };

    case 'platino':
      return {
        container:
          'bg-gradient-to-tr from-slate-600 via-slate-300 to-zinc-400 border border-slate-200/60 text-slate-900 shadow-slate-900/30',
        text: 'text-slate-950 font-black',
        subtext: 'text-slate-700 font-bold',
        number: 'text-slate-900 font-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]',
        chipNfc: 'text-slate-800',
        badge: 'bg-slate-900/10 text-slate-900 border-slate-500/40 backdrop-blur-sm',
        shimmer:
          'bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-70 mix-blend-soft-light',
      };

    case 'black':
      return {
        container:
          'bg-gradient-to-tr from-black via-zinc-950 to-neutral-900 border border-zinc-700/60 text-zinc-100 shadow-black/80',
        text: 'text-zinc-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]',
        subtext: 'text-zinc-400 font-bold',
        number: 'text-zinc-200 drop-shadow-[0_2px_6px_rgba(0,0,0,1)]',
        chipNfc: 'text-zinc-400',
        badge: 'bg-zinc-800/80 text-zinc-200 border-zinc-600/50 backdrop-blur-sm shadow',
        shimmer:
          'bg-gradient-to-tr from-transparent via-zinc-500/10 to-transparent opacity-50',
      };

    case 'comun':
    default:
      return {
        container:
          'bg-gradient-to-tr from-slate-950 via-blue-950 to-indigo-900 border border-indigo-500/30 text-white shadow-indigo-950/50',
        text: 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]',
        subtext: 'text-blue-200/80 font-bold',
        number: 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
        chipNfc: 'text-blue-200',
        badge: 'bg-blue-950/60 text-blue-200 border-blue-400/30 backdrop-blur-sm',
        shimmer:
          'bg-gradient-to-tr from-transparent via-sky-300/15 to-transparent opacity-50',
      };
  }
}
