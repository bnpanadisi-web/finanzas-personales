'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  CheckCircle2,
  X,
  Upload,
  Download,
  LogOut,
  Users,
  RefreshCw,
  Shield,
  Plus,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import {
  GoogleUserProfile,
  getStoredGoogleUser,
  saveStoredGoogleUser,
  getSavedGoogleAccounts,
  loginWithGoogleAccount,
  pickGoogleAccountNative,
  getDeviceGoogleAccountsNative,
  uploadBackupToGoogleDrive,
  restoreBackupFromGoogleDrive,
  downloadLocalBackupFile,
  restoreFromFile,
  isAutoBackupEnabled,
  setAutoBackupEnabled,
  getAutoBackupFrequency,
  setAutoBackupFrequency,
  AutoBackupFrequency,
  purgeInvalidDemoAccounts,
} from '@/services/googleBackup';
import { getLastBackupTime } from '@/lib/localStorageEngine';
import { Transaction } from '@/types';
import { Capacitor } from '@capacitor/core';

interface GoogleBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  transacciones?: Transaction[];
  onDataRestored?: () => void;
  darkMode?: boolean;
}

export function GoogleBackupModal({
  isOpen,
  onClose,
  transacciones = [],
  onDataRestored,
  darkMode = false,
}: GoogleBackupModalProps) {
  const [googleUser, setGoogleUser] = useState<GoogleUserProfile | null>(() => {
    purgeInvalidDemoAccounts();
    return getStoredGoogleUser();
  });
  const [lastBackup, setLastBackup] = useState<string | null>(() => getLastBackupTime());
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showAccountChooser, setShowAccountChooser] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [autoBackup, setAutoBackup] = useState<boolean>(() => isAutoBackupEnabled());
  const [frequency, setFrequency] = useState<AutoBackupFrequency>(() => getAutoBackupFrequency());
  const [savedAccounts, setSavedAccounts] = useState<GoogleUserProfile[]>(() => getSavedGoogleAccounts());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { success, error, info } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    // Purgar de forma estricta cualquier usuario demo residual
    purgeInvalidDemoAccounts();

    const timer = setTimeout(() => {
      setGoogleUser(getStoredGoogleUser());
      setLastBackup(getLastBackupTime());
      setAutoBackup(isAutoBackupEnabled());
      setFrequency(getAutoBackupFrequency());
      setSavedAccounts(getSavedGoogleAccounts());
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleToggleAutoBackup = () => {
    const nextVal = !autoBackup;
    setAutoBackup(nextVal);
    setAutoBackupEnabled(nextVal);
    if (nextVal) {
      success('Copia de seguridad automática activada.');
    } else {
      info('Copia de seguridad automática pausada.');
    }
  };

  const handleChangeFrequency = (newFreq: AutoBackupFrequency) => {
    setFrequency(newFreq);
    setAutoBackupFrequency(newFreq);
    success('Frecuencia de sincronización actualizada.');
  };

  // Función para vincular la cuenta seleccionada y realizar de inmediato la copia de seguridad
  const handleSelectAccountAndBackup = async (account: { email: string; name?: string }) => {
    if (!account.email || !account.email.trim() || !account.email.includes('@')) {
      error('Por favor ingresa un correo de Google válido.');
      return;
    }

    setLoadingAction('login');
    try {
      // 1. Guardar la cuenta seleccionada
      const profile = loginWithGoogleAccount(account);
      setGoogleUser(profile);
      setSavedAccounts(getSavedGoogleAccounts());
      setShowAccountChooser(false);
      setNewEmailInput('');

      // 2. Realizar de inmediato el respaldo de la información en dicha cuenta
      setLoadingAction('backup');
      const uploadRes = await uploadBackupToGoogleDrive(undefined, transacciones);
      if (uploadRes.success) {
        success(`¡Copia de seguridad guardada en tu cuenta de Google (${profile.email})!`);
        if (uploadRes.date) setLastBackup(uploadRes.date);
      } else {
        error(uploadRes.message);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      error('Error al vincular cuenta: ' + (errObj.message || ''));
    } finally {
      setLoadingAction(null);
    }
  };

  // Iniciar flujo de búsqueda y selección de cuentas de Google configuradas en el teléfono
  const handleTriggerGoogleSignIn = async () => {
    setLoadingAction('login');
    try {
      // Si estamos en un dispositivo Android nativo con Capacitor:
      if (Capacitor.isNativePlatform()) {
        // 1. Consultar las cuentas registradas en el sistema Android
        const deviceAccounts = await getDeviceGoogleAccountsNative();
        if (deviceAccounts.length > 0) {
          deviceAccounts.forEach(acc => {
            loginWithGoogleAccount({ email: acc.email, name: acc.name });
          });
          setSavedAccounts(getSavedGoogleAccounts());
        }

        // 2. Abrir el selector nativo del sistema Android
        const nativeSelected = await pickGoogleAccountNative();
        if (nativeSelected && nativeSelected.email) {
          await handleSelectAccountAndBackup(nativeSelected);
          return;
        }
      }
    } catch (e) {
      console.warn('Selector nativo no completado:', e);
    } finally {
      setLoadingAction(null);
    }

    // Si estamos en navegador web o si se desea elegir de la lista desplegable:
    setSavedAccounts(getSavedGoogleAccounts());
    setShowAccountChooser(true);
  };

  // Cerrar sesión de la cuenta de Google activa
  const handleGoogleLogout = () => {
    saveStoredGoogleUser(null);
    setGoogleUser(null);
    info('Sesión de Google cerrada.');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finanzas_backup_updated'));
    }
  };

  // Subir copia a la cuenta activa
  const handleBackupToDrive = async () => {
    setLoadingAction('backup');
    try {
      const res = await uploadBackupToGoogleDrive(undefined, transacciones);
      if (res.success) {
        success(res.message);
        if (res.date) setLastBackup(res.date);
      } else {
        error(res.message);
      }
    } catch (e: unknown) {
      const errObj = e as { message?: string };
      error(errObj.message || 'Error al realizar copia');
    } finally {
      setLoadingAction(null);
    }
  };

  // Restaurar copia desde la cuenta activa
  const handleRestoreFromDrive = async () => {
    const cuentaEmail = googleUser?.email || 'tu cuenta de Google';
    const confirmacion = window.confirm(
      `¿Deseas restaurar la información de la cuenta "${cuentaEmail}"? Los datos actuales del dispositivo se actualizarán con la copia guardada.`
    );
    if (!confirmacion) return;

    setLoadingAction('restore');
    try {
      const res = await restoreBackupFromGoogleDrive();
      if (res.success) {
        success(res.message);
        setLastBackup(new Date().toISOString());
        if (onDataRestored) onDataRestored();
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        error(res.message);
      }
    } catch (e: unknown) {
      const errObj = e as { message?: string };
      error(errObj.message || 'Error al restaurar');
    } finally {
      setLoadingAction(null);
    }
  };

  // Descarga local en archivo JSON
  const handleDownloadFile = () => {
    const ok = downloadLocalBackupFile(transacciones);
    if (ok) {
      success('Archivo de respaldo descargado en tu dispositivo');
      setLastBackup(new Date().toISOString());
    } else {
      error('Error al generar archivo');
    }
  };

  // Restaurar archivo local JSON
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmacion = window.confirm(
      `¿Deseas restaurar el archivo "${file.name}"? Los datos actuales se reemplazarán por el contenido del archivo.`
    );
    if (!confirmacion) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLoadingAction('file');
    try {
      const res = await restoreFromFile(file);
      if (res.success) {
        success(res.message);
        setLastBackup(new Date().toISOString());
        if (onDataRestored) onDataRestored();
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        error(res.message);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      error(errObj.message || 'Error al procesar archivo');
    } finally {
      setLoadingAction(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatFechaBackup = (iso: string | null) => {
    if (!iso) return 'Ninguna copia registrada';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  if (!isOpen) return null;

  const cardBg = darkMode
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';

  const sectionBg = darkMode
    ? 'bg-slate-950/60 border-slate-800'
    : 'bg-slate-50 border-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${cardBg}`}
      >
        {/* Cabecera */}
        <div className="relative p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center justify-center">
              <Cloud size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Copia de Seguridad</h2>
              <p className="text-xs text-slate-400">
                Almacenamiento local + Respaldo en tu cuenta de Google
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm">
          {/* Sección 1: Estado de Cuenta Google */}
          <div className={`p-4 rounded-2xl border ${sectionBg} space-y-3`}>
            {googleUser ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {googleUser.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={googleUser.picture}
                        alt={googleUser.name}
                        className="w-11 h-11 rounded-full border border-sky-400/40 object-cover shrink-0 shadow"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0">
                        {googleUser.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-slate-100 truncate">{googleUser.name}</p>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          Copia de seguridad vinculada
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-medium truncate">{googleUser.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleTriggerGoogleSignIn}
                      disabled={loadingAction === 'login' || loadingAction === 'backup'}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Cambiar a otra cuenta de Google"
                    >
                      <Users size={14} />
                      <span className="hidden sm:inline">Cambiar cuenta</span>
                    </button>

                    <button
                      onClick={handleGoogleLogout}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                      title="Cerrar sesión de Google"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex gap-2">
                  <button
                    onClick={handleBackupToDrive}
                    disabled={loadingAction === 'backup'}
                    className="flex-1 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <CloudUpload size={15} />
                    <span>{loadingAction === 'backup' ? 'Subiendo...' : 'Subir copia ahora'}</span>
                  </button>

                  <button
                    onClick={handleRestoreFromDrive}
                    disabled={loadingAction === 'restore'}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <CloudDownload size={15} />
                    <span>{loadingAction === 'restore' ? 'Restaurando...' : 'Restaurar copia'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-100">Cuenta de Google</p>
                  <p className="text-[11px] text-slate-400">
                    Conecta tu cuenta de Google personal para respaldar tus datos de forma segura.
                  </p>
                </div>

                <button
                  onClick={handleTriggerGoogleSignIn}
                  disabled={loadingAction === 'login' || loadingAction === 'backup'}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.76-2.1-6.71-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.29 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.04-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.04 3.15c.95-2.83 3.59-4.98 6.71-4.98z"
                    />
                  </svg>
                  <span>{loadingAction === 'login' ? 'Buscando cuentas...' : 'Conectar con Google'}</span>
                </button>
              </div>
            )}

            {/* Selector de cuentas de Google (cuentas del teléfono y opción de escribir Gmail personal) */}
            {showAccountChooser && (
              <div className="mt-3 p-4 rounded-2xl border border-sky-500/30 bg-slate-900 shadow-xl space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.76-2.1-6.71-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                      <path fill="#FBBC05" d="M5.29 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.04-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.04 3.15c.95-2.83 3.59-4.98 6.71-4.98z" />
                    </svg>
                    <span className="text-xs font-bold text-white">Elige tu cuenta de Google</span>
                  </div>
                  <button
                    onClick={() => setShowAccountChooser(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg"
                  >
                    <X size={15} />
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  Selecciona la cuenta de tu preferencia donde se guardará tu copia de seguridad:
                </p>

                {/* Lista de cuentas encontradas */}
                {savedAccounts.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {savedAccounts.map((acc) => (
                      <button
                        key={acc.email}
                        onClick={() => handleSelectAccountAndBackup(acc)}
                        disabled={loadingAction === 'login' || loadingAction === 'backup'}
                        className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {acc.picture ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={acc.picture}
                              alt={acc.name}
                              className="w-8 h-8 rounded-full border border-sky-500/30 object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {acc.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{acc.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{acc.email}</p>
                          </div>
                        </div>
                        {googleUser?.email.toLowerCase() === acc.email.toLowerCase() && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                            Activa
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Opción de ingresar tu cuenta personal de Gmail */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Plus size={12} className="text-sky-400" />
                    Ingresar tu cuenta personal de Gmail:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="tu_correo@gmail.com"
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newEmailInput.trim()) {
                            handleSelectAccountAndBackup({ email: newEmailInput.trim() });
                          }
                        }
                      }}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newEmailInput.trim()) {
                          handleSelectAccountAndBackup({ email: newEmailInput.trim() });
                        } else {
                          error('Ingresa tu dirección de correo de Gmail.');
                        }
                      }}
                      disabled={!newEmailInput.trim() || loadingAction === 'login' || loadingAction === 'backup'}
                      className="px-3 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
                    >
                      Seleccionar y Respaldar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Información de última copia */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/40">
              <span>Último respaldo:</span>
              <span className="font-mono text-slate-300 font-semibold">
                {formatFechaBackup(lastBackup)}
              </span>
            </div>
          </div>

          {/* Sección 2: Copia Automática */}
          <div className={`p-4 rounded-2xl border ${sectionBg} space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw size={15} className="text-sky-400" />
                <span className="text-xs font-bold text-slate-200">
                  Copia de seguridad automática
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBackup}
                  onChange={handleToggleAutoBackup}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Mantiene tus movimientos protegidos automáticamente en tu cuenta de Google.
            </p>

            {autoBackup && (
              <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-300 font-medium">Frecuencia:</span>
                <div className="flex gap-1.5">
                  {(
                    [
                      { id: 'cambios', label: 'Al registrar cambios' },
                      { id: 'diario', label: 'Diaria' },
                      { id: 'semanal', label: 'Semanal' },
                    ] as const
                  ).map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleChangeFrequency(item.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        frequency === item.id
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sección 3: Respaldo en Archivo Local (JSON) */}
          <div className={`p-4 rounded-2xl border ${sectionBg} space-y-3`}>
            <div>
              <p className="text-xs font-bold text-slate-200">Archivo de Respaldo Local</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Descarga una copia completa en tu dispositivo o restaura una copia previa desde un archivo .json.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleDownloadFile}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Download size={14} className="text-sky-400" />
                <span>Descargar archivo</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loadingAction === 'file'}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Upload size={14} className="text-emerald-400" />
                <span>{loadingAction === 'file' ? 'Procesando...' : 'Restaurar de archivo'}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Aviso de Privacidad y Seguridad */}
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-sky-500/5 border border-sky-500/10 text-slate-400 text-[11px] leading-relaxed">
            <Shield size={16} className="text-sky-400 shrink-0 mt-0.5" />
            <span>
              Tus finanzas son 100% privadas. La información se guarda exclusivamente en tu dispositivo y en la cuenta de Google que elijas, sin acceso de terceros.
            </span>
          </div>
        </div>

        {/* Pie del Modal */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
