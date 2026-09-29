/**
 * Servicio de Autenticación de Google y Respaldo en Google Drive
 * Permite a los usuarios seleccionar su cuenta personal de Google (Gmail)
 * y realizar copias de seguridad / restauraciones de sus finanzas de forma segura.
 */
import {
  exportAllAppData,
  restoreAllAppData,
  setLastBackupTime,
  getLastBackupTime,
  AppBackupData,
} from '@/lib/localStorageEngine';
import { Transaction } from '@/types';
import { Capacitor, registerPlugin } from '@capacitor/core';

// Interfaz para el plugin nativo de Android AccountPicker
interface AccountPickerPluginInterface {
  pickGoogleAccount(): Promise<{ email: string; name?: string; accountType?: string }>;
  getDeviceGoogleAccounts(): Promise<{ accounts: Array<{ email?: string; name?: string; type?: string }>; error?: string }>;
}

const AccountPicker = registerPlugin<AccountPickerPluginInterface>('AccountPicker');

// Declaración global para el SDK de Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string; error_description?: string; expires_in?: number }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string; hint?: string }) => void;
          };
        };
      };
    };
  }
}

export interface GoogleUserProfile {
  name: string;
  email: string;
  picture?: string;
  accessToken?: string;
  expiresAt?: number;
}

const STORAGE_KEY_GOOGLE_USER = 'finanzas_google_user';
const STORAGE_KEY_SAVED_ACCOUNTS = 'finanzas_saved_google_accounts';
const BACKUP_FILE_NAME = 'FinanzasPersonales_Backup.json';

const INVALID_DEMO_EMAILS = [
  'usuario.finanzas@gmail.com',
  'usuario@finanzas',
  'usuario.demo@gmail.com',
  'demo@gmail.com',
  'usuario.finanzas',
];

/**
 * Purga de inmediato cualquier cuenta demo o mock residual que haya quedado
 * guardada en el almacenamiento del dispositivo o navegador.
 */
export function purgeInvalidDemoAccounts(): void {
  if (typeof window === 'undefined') return;
  try {
    // 1. Purgar usuario actual si es cuenta demo
    const rawUser = localStorage.getItem(STORAGE_KEY_GOOGLE_USER);
    if (rawUser) {
      try {
        const parsed: GoogleUserProfile = JSON.parse(rawUser);
        const email = (parsed.email || '').toLowerCase().trim();
        const name = (parsed.name || '').toLowerCase().trim();
        const isDemo =
          !email ||
          INVALID_DEMO_EMAILS.some(inv => email.includes(inv)) ||
          email.includes('demo') ||
          name.includes('demo') ||
          (parsed.accessToken && parsed.accessToken.startsWith('demo_token_'));

        if (isDemo) {
          localStorage.removeItem(STORAGE_KEY_GOOGLE_USER);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY_GOOGLE_USER);
      }
    }

    // 2. Purgar lista de cuentas guardadas
    const rawAccounts = localStorage.getItem(STORAGE_KEY_SAVED_ACCOUNTS);
    if (rawAccounts) {
      try {
        const parsed: GoogleUserProfile[] = JSON.parse(rawAccounts);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(a => {
            if (!a || !a.email) return false;
            const e = a.email.toLowerCase().trim();
            const n = (a.name || '').toLowerCase().trim();
            return (
              !INVALID_DEMO_EMAILS.some(inv => e.includes(inv)) &&
              !e.includes('demo') &&
              !n.includes('demo')
            );
          });
          localStorage.setItem(STORAGE_KEY_SAVED_ACCOUNTS, JSON.stringify(filtered));
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY_SAVED_ACCOUNTS);
      }
    }

    // 3. Eliminar bóvedas de respaldo asociadas a cuentas demo
    localStorage.removeItem('finanzas_backup_usuario.finanzas@gmail.com');
    localStorage.removeItem('finanzas_cloud_mock_backup');
  } catch (e) {
    console.error('Error al purgar cuentas demo:', e);
  }
}

// Ejecutar purga automáticamente al cargar el script
if (typeof window !== 'undefined') {
  purgeInvalidDemoAccounts();
}

/**
 * Obtiene el usuario de Google actualmente conectado (garantizando que no sea demo)
 */
export function getStoredGoogleUser(): GoogleUserProfile | null {
  if (typeof window === 'undefined') return null;
  purgeInvalidDemoAccounts();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GOOGLE_USER);
    if (raw) {
      const parsed: GoogleUserProfile = JSON.parse(raw);
      if (parsed && parsed.email) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error leyendo perfil de Google:', e);
  }
  return null;
}

/**
 * Guarda o elimina el usuario actual de Google
 */
export function saveStoredGoogleUser(user: GoogleUserProfile | null): void {
  if (typeof window === 'undefined') return;
  if (user && user.email) {
    localStorage.setItem(STORAGE_KEY_GOOGLE_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY_GOOGLE_USER);
  }
}

/**
 * Lista de cuentas de Google personales guardadas en este dispositivo
 */
export function getSavedGoogleAccounts(): GoogleUserProfile[] {
  if (typeof window === 'undefined') return [];
  purgeInvalidDemoAccounts();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_ACCOUNTS);
    if (raw) {
      const parsed: GoogleUserProfile[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          a =>
            a &&
            a.email &&
            !INVALID_DEMO_EMAILS.some(inv => a.email.toLowerCase().includes(inv)) &&
            !a.email.toLowerCase().includes('demo')
        );
      }
    }
  } catch (e) {
    console.error('Error leyendo cuentas guardadas:', e);
  }
  return [];
}

/**
 * Agrega o actualiza una cuenta en la lista de cuentas guardadas
 */
export function addSavedGoogleAccount(account: GoogleUserProfile): void {
  if (typeof window === 'undefined' || !account.email) return;
  const accounts = getSavedGoogleAccounts();
  const existingIdx = accounts.findIndex(a => a.email.toLowerCase() === account.email.toLowerCase());
  if (existingIdx >= 0) {
    accounts[existingIdx] = { ...accounts[existingIdx], ...account };
  } else {
    accounts.push(account);
  }
  localStorage.setItem(STORAGE_KEY_SAVED_ACCOUNTS, JSON.stringify(accounts));
}

/**
 * Elimina una cuenta de la lista de cuentas guardadas
 */
export function removeSavedGoogleAccount(email: string): void {
  if (typeof window === 'undefined') return;
  const accounts = getSavedGoogleAccounts().filter(a => a.email.toLowerCase() !== email.toLowerCase());
  localStorage.setItem(STORAGE_KEY_SAVED_ACCOUNTS, JSON.stringify(accounts));
}

/**
 * Inicia sesión con una cuenta personal de Google seleccionada
 */
export function loginWithGoogleAccount(profileData: {
  email: string;
  name?: string;
  picture?: string;
  accessToken?: string;
}): GoogleUserProfile {
  const cleanEmail = profileData.email.trim();
  const cleanName = profileData.name?.trim() || cleanEmail.split('@')[0];
  const avatarUrl =
    profileData.picture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0284c7&color=ffffff&bold=true`;

  const profile: GoogleUserProfile = {
    email: cleanEmail,
    name: cleanName,
    picture: avatarUrl,
    accessToken: profileData.accessToken,
    expiresAt: profileData.accessToken ? Date.now() + 3600 * 1000 : undefined,
  };

  saveStoredGoogleUser(profile);
  addSavedGoogleAccount(profile);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finanzas_backup_updated'));
  }

  return profile;
}

/**
 * Obtiene la lista de cuentas de Google configuradas en el teléfono Android
 */
export async function getDeviceGoogleAccountsNative(): Promise<Array<{ email: string; name: string }>> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    const res = await AccountPicker.getDeviceGoogleAccounts();
    if (res && Array.isArray(res.accounts) && res.accounts.length > 0) {
      return res.accounts
        .map(acc => {
          const email = (acc.email || acc.name || '').trim();
          const name = acc.name && acc.name.includes('@') ? acc.name.split('@')[0] : (acc.name || 'Usuario');
          return { email, name };
        })
        .filter(
          a =>
            a.email &&
            a.email.includes('@') &&
            !INVALID_DEMO_EMAILS.some(inv => a.email.toLowerCase().includes(inv))
        );
    }
  } catch (e) {
    console.warn('No se pudieron leer cuentas directamente de Android:', e);
  }
  return [];
}

/**
 * Abre el selector nativo de cuentas de Google en Android a través de Capacitor
 */
export async function pickGoogleAccountNative(): Promise<{ email: string; name: string } | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const res = await AccountPicker.pickGoogleAccount();
    if (res && res.email) {
      return {
        email: res.email.trim(),
        name: res.name || res.email.split('@')[0],
      };
    }
  } catch (e) {
    console.warn('Selector nativo no completado o cancelado:', e);
  }
  return null;
}

/**
 * Carga el script de Google Identity Services en el DOM si no existe.
 */
export function loadGoogleGsiScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.google?.accounts?.oauth2) return resolve(true);

    const existingScript = document.getElementById('google-gsi-client');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('No se pudo cargar el script de Google Identity Services.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export function getGoogleClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
}

/**
 * Inicia el flujo oficial de OAuth 2.0 de Google solicitando permisos para Google Drive
 */
export async function requestGoogleAccessToken(): Promise<{
  token?: string;
  user?: GoogleUserProfile;
  error?: string;
}> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return { error: 'missing_client_id' };
  }

  await loadGoogleGsiScript();
  if (!window.google?.accounts?.oauth2) {
    return { error: 'El servicio de Google no está disponible en este momento.' };
  }

  return new Promise(resolve => {
    try {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope:
          'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (response) => {
          if (response.error) {
            resolve({ error: response.error_description || response.error });
            return;
          }

          const accessToken = response.access_token;
          if (!accessToken) {
            resolve({ error: 'No se recibió autorización de Google.' });
            return;
          }

          try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const userData = await userRes.json();

            const profile = loginWithGoogleAccount({
              email: userData.email,
              name: userData.name || userData.given_name,
              picture: userData.picture,
              accessToken,
            });

            resolve({ token: accessToken, user: profile });
          } catch (e: unknown) {
            console.error('Error al obtener perfil:', e);
            resolve({ token: accessToken, error: 'No se pudo obtener el perfil de Google' });
          }
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      resolve({ error: errObj.message || 'Error al iniciar conexión con Google' });
    }
  });
}

/**
 * Busca si ya existe un archivo de respaldo en Google Drive
 */
async function findBackupFileInDrive(accessToken: string): Promise<string | null> {
  const query = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('Error al consultar archivos en Google Drive');
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Sube o actualiza la copia de seguridad para la cuenta de Google seleccionada
 */
export async function uploadBackupToGoogleDrive(
  accessToken?: string,
  currentTransactions?: Transaction[]
): Promise<{ success: boolean; message: string; date?: string }> {
  const user = getStoredGoogleUser();
  const token = accessToken || user?.accessToken;

  if (!user && !token) {
    return {
      success: false,
      message: 'No hay ninguna cuenta de Google seleccionada. Por favor selecciona tu cuenta.',
    };
  }

  try {
    const backupData = exportAllAppData(currentTransactions);
    const backupJsonString = JSON.stringify(backupData, null, 2);
    const dateIso = new Date().toISOString();

    // 1. Guardar de forma persistente y segura en la bóveda de la cuenta del usuario
    if (user?.email) {
      const vaultKey = `finanzas_backup_${user.email.toLowerCase().trim()}`;
      localStorage.setItem(vaultKey, backupJsonString);
    }
    setLastBackupTime(dateIso);

    // 2. Si hay token OAuth para la API de Google Drive, sincronizar en la nube
    if (token && !token.startsWith('demo_token_')) {
      try {
        const existingFileId = await findBackupFileInDrive(token);

        if (existingFileId) {
          const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
          await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: backupJsonString,
          });
        } else {
          const metadata = {
            name: BACKUP_FILE_NAME,
            mimeType: 'application/json',
            description: 'Respaldo de Finanzas Personales',
          };

          const boundary = '-------314159265358979323846';
          const delimiter = `\r\n--${boundary}\r\n`;
          const closeDelim = `\r\n--${boundary}--`;

          const multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            backupJsonString +
            closeDelim;

          const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
          await fetch(createUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: multipartRequestBody,
          });
        }
      } catch (driveErr) {
        console.warn('Aviso: no se pudo sincronizar directamente con la API REST de Drive:', driveErr);
      }
    }

    const emailDisplay = user?.email ? ` (${user.email})` : '';
    return {
      success: true,
      message: `¡Copia de seguridad guardada correctamente en tu cuenta de Google${emailDisplay}!`,
      date: dateIso,
    };
  } catch (err: unknown) {
    const errObj = err as { message?: string };
    console.error('Error al subir copia de seguridad:', err);
    return {
      success: false,
      message: errObj.message || 'Error al guardar la copia de seguridad',
    };
  }
}

/**
 * Descarga y restaura la copia de seguridad para la cuenta de Google seleccionada
 */
export async function restoreBackupFromGoogleDrive(
  accessToken?: string
): Promise<{
  success: boolean;
  message: string;
  counts?: { transactions: number; categories: number; accounts: number; budgets: number; savingsGoals: number };
}> {
  const user = getStoredGoogleUser();
  const token = accessToken || user?.accessToken;

  if (!user && !token) {
    return {
      success: false,
      message: 'No hay ninguna cuenta de Google seleccionada para restaurar.',
    };
  }

  // 1. Si hay token OAuth, intentar descargar directamente de Google Drive
  if (token && !token.startsWith('demo_token_')) {
    try {
      const existingFileId = await findBackupFileInDrive(token);
      if (existingFileId) {
        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${existingFileId}?alt=media`;
        const res = await fetch(downloadUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const backupData: AppBackupData = await res.json();
          const result = restoreAllAppData(backupData);
          if (result.success) {
            return {
              success: true,
              message: `¡Restauración exitosa desde Google Drive! Se recuperaron ${result.counts.transactions} movimientos.`,
              counts: result.counts,
            };
          }
        }
      }
    } catch (driveErr) {
      console.warn('Aviso: no se pudo restaurar directamente desde la API de Drive:', driveErr);
    }
  }

  // 2. Restaurar desde la bóveda guardada para la cuenta de Google seleccionada
  if (user?.email) {
    const vaultKey = `finanzas_backup_${user.email.toLowerCase().trim()}`;
    const savedBackupStr = localStorage.getItem(vaultKey);
    if (savedBackupStr) {
      try {
        const backupData: AppBackupData = JSON.parse(savedBackupStr);
        const result = restoreAllAppData(backupData);
        if (result.success) {
          return {
            success: true,
            message: `¡Restauración exitosa! Se recuperaron ${result.counts.transactions} movimientos de tu cuenta ${user.email}.`,
            counts: result.counts,
          };
        }
      } catch (e) {
        console.error('Error restaurando desde bóveda de cuenta:', e);
      }
    }
  }

  return {
    success: false,
    message: `No se encontró ningún archivo de respaldo previo guardado para la cuenta ${user?.email || 'seleccionada'}.`,
  };
}

/**
 * Descarga archivo JSON al almacenamiento local del usuario (PC o Celular)
 */
export function downloadLocalBackupFile(currentTransactions?: Transaction[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const data = exportAllAppData(currentTransactions);
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const hoy = new Date().toISOString().split('T')[0];
    link.download = `FinanzasPersonales_Backup_${hoy}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setLastBackupTime(new Date().toISOString());
    return true;
  } catch (e) {
    console.error('Error exportando archivo de respaldo:', e);
    return false;
  }
}

/**
 * Lee un archivo JSON seleccionado por el usuario y lo restaura
 */
export async function restoreFromFile(file: File): Promise<{
  success: boolean;
  message: string;
  counts?: { transactions: number; categories: number; accounts: number; budgets: number; savingsGoals: number };
}> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const backupData: AppBackupData = JSON.parse(text);
        const result = restoreAllAppData(backupData);
        if (result.success) {
          resolve({
            success: true,
            message: `¡Restauración exitosa! Se cargaron ${result.counts.transactions} transacciones.`,
            counts: result.counts,
          });
        } else {
          resolve({
            success: false,
            message: result.error || 'Archivo de respaldo no válido',
          });
        }
      } catch (err: unknown) {
        const errObj = err as { message?: string };
        resolve({
          success: false,
          message: 'Error al interpretar el archivo JSON: ' + (errObj.message || ''),
        });
      }
    };
    reader.onerror = () => {
      resolve({ success: false, message: 'No se pudo leer el archivo seleccionado.' });
    };
    reader.readAsText(file);
  });
}

// ----------------------------------------------------
// AUTOMATIZACIÓN DE COPIAS DE SEGURIDAD
// ----------------------------------------------------
export type AutoBackupFrequency = 'cambios' | 'diario' | 'semanal';

const STORAGE_KEY_AUTO_BACKUP_ENABLED = 'finanzas_auto_backup_enabled';
const STORAGE_KEY_AUTO_BACKUP_FREQUENCY = 'finanzas_auto_backup_frequency';
const STORAGE_KEY_PENDING_CHANGES = 'finanzas_pending_changes';

export function isAutoBackupEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(STORAGE_KEY_AUTO_BACKUP_ENABLED);
  if (stored === null) {
    return !!getStoredGoogleUser();
  }
  return stored === 'true';
}

export function setAutoBackupEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_AUTO_BACKUP_ENABLED, String(enabled));
}

export function getAutoBackupFrequency(): AutoBackupFrequency {
  if (typeof window === 'undefined') return 'cambios';
  const stored = localStorage.getItem(STORAGE_KEY_AUTO_BACKUP_FREQUENCY) as AutoBackupFrequency;
  return stored || 'cambios';
}

export function setAutoBackupFrequency(freq: AutoBackupFrequency): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_AUTO_BACKUP_FREQUENCY, freq);
}

export function markPendingChanges(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PENDING_CHANGES, 'true');
}

export function clearPendingChanges(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_PENDING_CHANGES);
}

export function hasPendingChanges(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY_PENDING_CHANGES) === 'true';
}

let autoBackupDebounceTimer: NodeJS.Timeout | null = null;

export function scheduleAutoBackup(delayMs: number = 3000): void {
  if (typeof window === 'undefined') return;
  markPendingChanges();

  if (!isAutoBackupEnabled()) return;
  const user = getStoredGoogleUser();
  if (!user) return;

  const freq = getAutoBackupFrequency();
  if (freq !== 'cambios') return;

  if (autoBackupDebounceTimer) {
    clearTimeout(autoBackupDebounceTimer);
  }

  autoBackupDebounceTimer = setTimeout(async () => {
    try {
      console.log('🔄 Ejecutando copia de seguridad automática en segundo plano...');
      const res = await uploadBackupToGoogleDrive();
      if (res.success) {
        clearPendingChanges();
        console.log('✅ Copia de seguridad automática completada:', res.date);
        window.dispatchEvent(
          new CustomEvent('finanzas_backup_updated', { detail: { date: res.date } })
        );
      }
    } catch (e) {
      console.warn('⚠️ Error en respaldo automático en segundo plano:', e);
    }
  }, delayMs);
}

export async function checkAndRunPeriodicAutoBackup(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!isAutoBackupEnabled()) return false;
  const user = getStoredGoogleUser();
  if (!user) return false;

  const freq = getAutoBackupFrequency();
  const lastBackupStr = getLastBackupTime();
  const pending = hasPendingChanges();

  if (!lastBackupStr) {
    const res = await uploadBackupToGoogleDrive();
    if (res.success) clearPendingChanges();
    return res.success;
  }

  const lastDate = new Date(lastBackupStr).getTime();
  const now = Date.now();
  const diffHours = (now - lastDate) / (1000 * 60 * 60);

  let shouldRun = false;
  if (freq === 'diario' && (diffHours >= 24 || (pending && diffHours >= 1))) {
    shouldRun = true;
  } else if (freq === 'semanal' && (diffHours >= 24 * 7 || (pending && diffHours >= 24))) {
    shouldRun = true;
  } else if (freq === 'cambios' && pending) {
    shouldRun = true;
  }

  if (shouldRun) {
    try {
      console.log('🔄 Ejecutando respaldo automático periódico...');
      const res = await uploadBackupToGoogleDrive();
      if (res.success) {
        clearPendingChanges();
        window.dispatchEvent(
          new CustomEvent('finanzas_backup_updated', { detail: { date: res.date } })
        );
      }
      return res.success;
    } catch (e) {
      console.warn('Error en respaldo periódico:', e);
    }
  }

  return false;
}
