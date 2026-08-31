'use client';
import React, { useState } from 'react';
import { Delete, ShieldCheck, Sun, Moon } from 'lucide-react';
import { getStoredPin, verifyPin, setSessionAuthenticated } from '@/lib/security';

interface PinAuthScreenProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  onSuccess: () => void;
}

export function PinAuthScreen({
  darkMode,
  toggleDarkMode,
  onSuccess,
}: PinAuthScreenProps) {
  const [pin, setPin] = useState('');
  const [errorPin, setErrorPin] = useState(false);
  const [pinLength] = useState(() => (typeof window !== 'undefined' ? getStoredPin().length : 4));

  const handleKeyPress = (num: string) => {
    if (pin.length >= 6) return;
    const nuevoPin = pin + num;
    setPin(nuevoPin);
    setErrorPin(false);

    if (verifyPin(nuevoPin)) {
      setSessionAuthenticated(true);
      onSuccess();
    } else if (nuevoPin.length >= pinLength) {
      setErrorPin(true);
      setTimeout(() => {
        setPin('');
      }, 600);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorPin(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyPin(pin)) {
      setSessionAuthenticated(true);
      onSuccess();
    } else {
      setErrorPin(true);
      setTimeout(() => {
        setPin('');
      }, 600);
    }
  };

  return (
    <main
      className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-200 ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* Botón flotante de modo oscuro */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleDarkMode}
          className={`p-2.5 rounded-full border transition-all ${
            darkMode
              ? 'bg-slate-800 text-yellow-400 border-slate-700 hover:bg-slate-700'
              : 'bg-white text-slate-600 border-slate-200 shadow-sm hover:bg-slate-100'
          }`}
          aria-label="Cambiar tema"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div
        className={`p-6 sm:p-8 rounded-3xl shadow-xl w-full max-w-xs text-center border transition-all ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white text-slate-800 border-slate-100 shadow-slate-200/60'
        } ${errorPin ? 'animate-shake' : ''}`}
      >
        <div className="w-16 h-16 mx-auto flex items-center justify-center mb-3 p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="Finanzas Icono" className="w-14 h-14 object-contain drop-shadow-md" />
        </div>

        <h1 className="text-xl font-bold tracking-tight">Finanzas Personales</h1>
        <p className="text-xs text-slate-400 mt-1 mb-5 font-medium">Ingresa tu PIN de seguridad</p>

        {/* Indicador de dígitos dinámico */}
        <div className="flex justify-center items-center gap-3 mb-6">
          {Array.from({ length: pinLength }).map((_, index) => (
            <div
              key={index}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                pin.length > index
                  ? 'bg-emerald-500 scale-110 shadow-sm shadow-emerald-500/50'
                  : darkMode
                  ? 'bg-slate-800 border border-slate-700'
                  : 'bg-slate-200 border border-slate-300'
              }`}
            />
          ))}
        </div>

        {errorPin && (
          <p className="text-rose-500 text-xs font-bold mb-3 animate-pulse">
            PIN Incorrecto. Intenta nuevamente.
          </p>
        )}

        {/* Teclado numérico táctil */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className={`h-13 rounded-2xl text-lg font-bold transition-all active:scale-90 flex items-center justify-center ${
                darkMode
                  ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-100 border border-slate-700/60'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs'
              }`}
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center">
            <ShieldCheck size={18} className="text-slate-400 opacity-60" />
          </div>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className={`h-13 rounded-2xl text-lg font-bold transition-all active:scale-90 flex items-center justify-center ${
              darkMode
                ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-100 border border-slate-700/60'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs'
            }`}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className={`h-13 rounded-2xl text-lg font-bold transition-all active:scale-90 flex items-center justify-center ${
              darkMode
                ? 'bg-slate-800/40 hover:bg-slate-800 text-slate-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
            }`}
            aria-label="Borrar dígito"
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Formulario alternativo oculto para teclado físico */}
        <form onSubmit={handleFormSubmit} className="mt-4">
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            className="opacity-0 w-0 h-0 absolute"
            autoFocus
          />
        </form>
      </div>
    </main>
  );
}
