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
  Settings,
  LogOut,
  RefreshCw,
  Shield,
  Users,
  Plus,
  Check,
  Mail,
  ChevronDown,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import {
  GoogleUserProfile,
  getStoredGoogleUser,
  saveStoredGoogleUser,
  requestGoogleAccessToken,
  uploadBackupToGoogleDrive,
  restoreBackupFromGoogleDrive,
  downloadLocalBackupFile,
  restoreFromFile,
  getGoogleClientId,
  setCustomGoogleClientId,
  isAutoBackupEnabled,
  setAutoBackupEnabled,
  getAutoBackupFrequency,
  setAutoBackupFrequency,
  AutoBackupFrequency,
  getKnownGmailAccounts,
  selectGmailAccount,
  removeKnownGmailAccount,
} from '@/services/googleBackup';
import { getLastBackupTime } from '@/lib/localStorageEngine';
import { Transaction } from '@/types';

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
  const [googleUser, setGoogleUser] = useState<GoogleUserProfile | null>(() => getStoredGoogleUser());
  const [knownAccounts, setKnownAccounts] = useState<string[]>(() => getKnownGmailAccounts());
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [showAddCustomEmail, setShowAddCustomEmail] = useState(false);
  const [inputCustomEmail, setInputCustomEmail] = useState('');
  const [lastBackup, setLastBackup] = useState<string | null>(() => getLastBackupTime());
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [customClientId, setCustomClientId] = useState(() => getGoogleClientId());
  const [autoBackup, setAutoBackup] = useState<boolean>(() => isAutoBackupEnabled());
  const [frequency, setFrequency] = useState<AutoBackupFrequency>(() => getAutoBackupFrequency());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { success, error, info } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      setGoogleUser(getStoredGoogleUser());
      setLastBackup(getLastBackupTime());
      setCustomClientId(getGoogleClientId());
      setAutoBackup(isAutoBackupEnabled());
      setFrequency(getAutoBackupFrequency());
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

  if (!isOpen) return null;

  const cardBg = darkMode
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';

  const sectionBg = darkMode
    ? 'bg-slate-950/60 border-slate-800'
    : 'bg-slate-50 border-slate-200';

  // Iniciar sesión con Google o elegir cuenta
  const handleGoogleLogin = async (targetEmail?: string) => {
    setLoadingAction('login');
    try {
      const res = await requestGoogleAccessToken(customClientId, targetEmail);
      if (res.user) {
        setGoogleUser(res.user);
        setKnownAccounts(getKnownGmailAccounts());
        setShowAccountSelector(false);
        success(`Conectado como ${res.user.name} (${res.user.email})`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('finanzas_backup_updated'));
        }
      } else if (res.error) {
        error(res.error);
      }
    } catch (e: unknown) {
      const errObj = e as { message?: string };
      error('Error al conectar con Google: ' + (errObj.message || ''));
    } finally {
      setLoadingAction(null);
    }
  };

  // Seleccionar o cambiar directamente la cuenta activa
  const handleSelectAccount = (email: string) => {
    const profile = selectGmailAccount(email);
    setGoogleUser(profile);
    setKnownAccounts(getKnownGmailAccounts());
    setShowAccountSelector(false);
    success(`Cuenta de respaldo cambiada a ${email}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finanzas_backup_updated'));
    }
  };

  // Agregar cuenta de Gmail personalizada
  const handleAddCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCustomEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      error('Por favor ingresa un correo Gmail válido.');
      return;
    }
    handleSelectAccount(clean);
    setInputCustomEmail('');
    setShowAddCustomEmail(false);
  };

  // Quitar cuenta de la lista de conocidas
  const handleRemoveAccount = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeKnownGmailAccount(email);
    setKnownAccounts(getKnownGmailAccounts());
    if (googleUser?.email.toLowerCase() === email.toLowerCase()) {
      saveStoredGoogleUser(null);
      setGoogleUser(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('finanzas_backup_updated'));
      }
    }
    info(`Cuenta ${email} removida`);
  };

  // Cerrar sesión de Google
  const handleGoogleLogout = () => {
    saveStoredGoogleUser(null);
    setGoogleUser(null);
    info('Sesión de Google cerrada.');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finanzas_backup_updated'));
    }
  };

  // Guardar en Google Drive
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

  // Restaurar desde Google Drive
  const handleRestoreFromDrive = async () => {
    const confirmacion = window.confirm(
      '¿Deseas restaurar la información desde Google Drive? Los datos actuales del dispositivo se actualizarán con la copia de la nube.'
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

  // Descarga local
  const handleDownloadFile = () => {
    const ok = downloadLocalBackupFile(transacciones);
    if (ok) {
      success('Archivo de respaldo descargado en tu dispositivo');
      setLastBackup(new Date().toISOString());
    } else {
      error('Error al generar archivo');
    }
  };

  // Restaurar archivo local
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

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomGoogleClientId(customClientId);
    success('Google Client ID actualizado.');
    setShowConfig(false);
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
                Almacenamiento local + Nube personal en Google Drive
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Configuración de Google OAuth"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm">
          {/* Panel de Configuración de Google Client ID (Opcional / Desplegable) */}
          {showConfig && (
            <form
              onSubmit={handleSaveClientId}
              className={`p-4 rounded-2xl border space-y-3 animate-in fade-in duration-150 ${sectionBg}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5 text-slate-200">
                  <Settings size={14} className="text-sky-400" />
                  Google Cloud Client ID (OAuth2)
                </span>
                <span className="text-[10px] text-slate-400">Opcional</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Para vincular con tu propia app de Google Cloud, puedes ingresar tu Client ID (OAuth 2.0). Si se deja en blanco, la app operará con el modo demostración local seguro.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: 123456789-xxxx.apps.googleusercontent.com"
                  value={customClientId}
                  onChange={e => setCustomClientId(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          )}

          {/* Sección 1: Estado y Selección de Cuenta Gmail */}
          <div className={`p-4 rounded-2xl border ${sectionBg} space-y-3`}>
            {googleUser ? (
              <div>
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
                        {googleUser.name.charAt(0)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-slate-100 truncate">{googleUser.name}</p>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                          Cuenta Activa
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-medium truncate">{googleUser.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setShowAccountSelector(!showAccountSelector)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Elegir o cambiar cuenta de Gmail"
                    >
                      <Users size={14} />
                      <span className="hidden sm:inline">Cambiar cuenta</span>
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${
                          showAccountSelector ? 'rotate-180' : ''
                        }`}
                      />
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
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-100">Cuenta de Gmail para Respaldo</p>
                  <p className="text-[11px] text-slate-400">
                    Elige la cuenta de Google en la cual guardar y sincronizar tus copias de seguridad.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleGoogleLogin()}
                    disabled={loadingAction === 'login'}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>{loadingAction === 'login' ? 'Abriendo selector...' : 'Elegir con Google'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Selector Desplegable de Cuentas de Gmail */}
            {(showAccountSelector || !googleUser) && (
              <div className="pt-3 border-t border-slate-800 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>Cuentas de Gmail disponibles:</span>
                  <button
                    type="button"
                    onClick={() => handleGoogleLogin()}
                    className="text-sky-400 hover:text-sky-300 font-bold hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <span>Abrir selector de Google</span>
                  </button>
                </div>

                {/* Lista de cuentas conocidas */}
                <div className="space-y-1.5">
                  {knownAccounts.map(email => {
                    const isSelected = googleUser?.email.toLowerCase() === email.toLowerCase();
                    return (
                      <div
                        key={email}
                        onClick={() => handleSelectAccount(email)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/10 border-sky-500/40 text-white'
                            : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg ${
                              isSelected ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <Mail size={14} />
                          </div>
                          <span className="text-xs font-semibold truncate">{email}</span>
                          {isSelected && (
                            <span className="text-[10px] text-sky-400 font-bold px-1.5 py-0.2 rounded-md bg-sky-500/20">
                              Seleccionada
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <Check size={16} className="text-emerald-400" />
                          ) : (
                            <button
                              type="button"
                              onClick={e => handleRemoveAccount(email, e)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                              title="Quitar de la lista"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Formulario para agregar otra cuenta de Gmail manualmente */}
                {showAddCustomEmail ? (
                  <form onSubmit={handleAddCustomAccount} className="pt-1 flex gap-2">
                    <input
                      type="email"
                      placeholder="ejemplo@gmail.com"
                      value={inputCustomEmail}
                      onChange={e => setInputCustomEmail(e.target.value)}
                      required
                      autoFocus
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Elegir
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomEmail(false)}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddCustomEmail(true)}
                    className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Agregar o escribir otra cuenta de Gmail</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Estado de última copia */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className={lastBackup ? 'text-emerald-400' : 'text-slate-500'} />
              Último Respaldo:
            </span>
            <span className="font-semibold text-slate-300">{formatFechaBackup(lastBackup)}</span>
          </div>

          {/* Sección: Automatización de Copias de Seguridad */}
          <div className={`p-4 rounded-2xl border space-y-3 ${sectionBg}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    autoBackup
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <RefreshCw size={17} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-100">Copia de Seguridad Automática</p>
                    {autoBackup && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Activa
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sincroniza tus finanzas en Google Drive en segundo plano sin interrumpirte.
                  </p>
                </div>
              </div>

              {/* Interruptor Toggle */}
              <button
                type="button"
                onClick={handleToggleAutoBackup}
                role="switch"
                aria-checked={autoBackup}
                title={autoBackup ? 'Desactivar copia automática' : 'Activar copia automática'}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoBackup ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoBackup ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {autoBackup && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">
                    Frecuencia de sincronización:
                  </span>
                  <span className="text-[10px] text-slate-400">En segundo plano</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChangeFrequency('cambios')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                      frequency === 'cambios'
                        ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Al cambiar datos
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeFrequency('diario')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                      frequency === 'diario'
                        ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Diaria
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeFrequency('semanal')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                      frequency === 'semanal'
                        ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Semanal
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {frequency === 'cambios' && '✨ Guarda en tu Google Drive 3 segundos después de cada movimiento, sin bloquear la pantalla.'}
                  {frequency === 'diario' && '📅 Guarda una copia en Google Drive cada 24 horas al abrir o usar la aplicación.'}
                  {frequency === 'semanal' && '🗓️ Guarda una copia cada 7 días al abrir la app.'}
                </p>
              </div>
            )}
          </div>

          {/* Sección 2: Copia en Google Drive */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Copia en Google Drive
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Botón Subir a Drive */}
              <button
                onClick={handleBackupToDrive}
                disabled={loadingAction === 'backup'}
                className="p-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 hover:bg-sky-500/15 text-sky-400 flex flex-col items-start gap-2.5 transition-all active:scale-98 text-left group cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-sky-500 text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                  <CloudUpload size={20} />
                </div>
                <div>
                  <p className="font-bold text-xs text-white">Guardar en Google Drive</p>
                  <p className="text-[11px] text-slate-300/80 mt-0.5">
                    Genera una copia en la nube con todas tus transacciones, presupuestos y ahorros.
                  </p>
                </div>
                {loadingAction === 'backup' && (
                  <span className="text-[10px] text-sky-400 font-bold flex items-center gap-1 animate-pulse">
                    <RefreshCw size={10} className="animate-spin" /> Guardando en Drive...
                  </span>
                )}
              </button>

              {/* Botón Restaurar desde Drive */}
              <button
                onClick={handleRestoreFromDrive}
                disabled={loadingAction === 'restore'}
                className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 flex flex-col items-start gap-2.5 transition-all active:scale-98 text-left group cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <CloudDownload size={20} />
                </div>
                <div>
                  <p className="font-bold text-xs text-white">Restaurar desde Drive</p>
                  <p className="text-[11px] text-slate-300/80 mt-0.5">
                    Recupera tu copia guardada en Google Drive para este dispositivo.
                  </p>
                </div>
                {loadingAction === 'restore' && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                    <RefreshCw size={10} className="animate-spin" /> Restaurando...
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Sección 3: Respaldo en Archivo Local (.json) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Respaldo en Archivo Local (.json)
            </h3>

            <div className={`p-4 rounded-2xl border space-y-3 ${sectionBg}`}>
              <p className="text-[11px] text-slate-400">
                También puedes descargar directamente un archivo con todos tus datos para tenerlo guardado en tu computadora o enviarlo por WhatsApp.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleDownloadFile}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-colors active:scale-95 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Descargar Archivo (.json)</span>
                </button>

                <label className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-colors active:scale-95 cursor-pointer text-center">
                  <Upload size={14} />
                  <span>Restaurar Archivo (.json)</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Nota de Privacidad */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5 text-[11px] text-slate-400">
            <Shield size={16} className="text-emerald-400 shrink-0" />
            <span>
              Privacidad garantizada: Tu información nunca sale a bases de datos de terceros. El archivo de respaldo solo se almacena en tu cuenta personal de Google Drive.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
