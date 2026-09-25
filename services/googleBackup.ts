/**
 * Servicio de Autenticación de Google y Respaldo en Google Drive
 * Permite a los usuarios iniciar sesión con su cuenta de Google (Gmail)
 * y realizar copias de seguridad / restauraciones de sus finanzas.
 */
import {
  exportAllAppData,
  restoreAllAppData,
  setLastBackupTime,
  getLastBackupTime,
  AppBackupData,
} from '@/lib/localStorageEngine';
import { Transaction } from '@/types';

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
const STORAGE_KEY_CUSTOM_CLIENT_ID = 'finanzas_google_client_id';
const STORAGE_KEY_KNOWN_GMAILS = 'finanzas_known_gmails';
const STORAGE_KEY_PROFILES_MAP = 'finanzas_google_profiles_map';
const BACKUP_FILE_NAME = 'FinanzasPersonales_Backup.json';

export function getKnownGmailAccounts(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_KNOWN_GMAILS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error leyendo cuentas Gmail conocidas:', e);
  }
  return ['bnpanadisi@gmail.com'];
}

export function saveKnownGmailAccount(email: string): void {
  if (typeof window === 'undefined') return;
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes('@')) return;
  const current = getKnownGmailAccounts();
  const set = new Set([clean, ...current]);
  localStorage.setItem(STORAGE_KEY_KNOWN_GMAILS, JSON.stringify(Array.from(set)));
}

export function removeKnownGmailAccount(email: string): void {
  if (typeof window === 'undefined') return;
  const clean = email.trim().toLowerCase();
  const current = getKnownGmailAccounts().filter(e => e.toLowerCase() !== clean);
  localStorage.setItem(STORAGE_KEY_KNOWN_GMAILS, JSON.stringify(current));
}

export function getSavedGoogleProfilesMap(): Record<string, GoogleUserProfile> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES_MAP);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function selectGmailAccount(email: string): GoogleUserProfile {
  const cleanEmail = email.trim().toLowerCase();
  saveKnownGmailAccount(cleanEmail);
  const map = getSavedGoogleProfilesMap();
  let profile = map[cleanEmail];
  if (!profile) {
    const name = cleanEmail.split('@')[0] || 'Usuario Gmail';
    profile = {
      name,
      email: cleanEmail,
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=fff`,
      accessToken: 'demo_token_' + Date.now(),
      expiresAt: Date.now() + 3600 * 1000,
    };
  }
  saveStoredGoogleUser(profile);
  return profile;
}

export function getStoredGoogleUser(): GoogleUserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GOOGLE_USER);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error leyendo perfil de Google:', e);
  }
  return null;
}

export function saveStoredGoogleUser(user: GoogleUserProfile | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(STORAGE_KEY_GOOGLE_USER, JSON.stringify(user));
    if (user.email) {
      saveKnownGmailAccount(user.email);
      const map = getSavedGoogleProfilesMap();
      map[user.email.toLowerCase()] = user;
      localStorage.setItem(STORAGE_KEY_PROFILES_MAP, JSON.stringify(map));
    }
  } else {
    localStorage.removeItem(STORAGE_KEY_GOOGLE_USER);
  }
}

export function getGoogleClientId(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(STORAGE_KEY_CUSTOM_CLIENT_ID);
    if (custom && custom.trim()) return custom.trim();
  }
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
}

export function setCustomGoogleClientId(clientId: string): void {
  if (typeof window === 'undefined') return;
  if (clientId && clientId.trim()) {
    localStorage.setItem(STORAGE_KEY_CUSTOM_CLIENT_ID, clientId.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_CLIENT_ID);
  }
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

/**
 * Inicia el flujo de autenticación de Google con OAuth2
 * permitiendo elegir explícitamente la cuenta de Gmail (prompt: 'select_account')
 */
export async function requestGoogleAccessToken(
  clientIdParam?: string,
  targetEmail?: string
): Promise<{
  token?: string;
  user?: GoogleUserProfile;
  error?: string;
}> {
  const clientId = clientIdParam || getGoogleClientId();

  // Si no hay Client ID de Google configurado, permitimos seleccionar/ingresar la cuenta Gmail deseada
  if (!clientId) {
    const email = targetEmail?.trim() || 'bnpanadisi@gmail.com';
    const profile = selectGmailAccount(email);
    return { token: profile.accessToken, user: profile };
  }

  await loadGoogleGsiScript();

  if (!window.google?.accounts?.oauth2) {
    return { error: 'El SDK de Google no está disponible.' };
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
            resolve({ error: 'No se recibió token de acceso.' });
            return;
          }

          try {
            // Obtener perfil del usuario
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const userData = await userRes.json();

            const profile: GoogleUserProfile = {
              name: userData.name || userData.given_name || 'Usuario Google',
              email: userData.email,
              picture: userData.picture,
              accessToken,
              expiresAt: Date.now() + (response.expires_in || 3600) * 1000,
            };

            saveStoredGoogleUser(profile);
            resolve({ token: accessToken, user: profile });
          } catch (e: unknown) {
            console.error('Error al obtener perfil:', e);
            resolve({ token: accessToken, error: 'No se pudo obtener información de la cuenta' });
          }
        },
      });

      // prompt: 'select_account' para que Google SIEMPRE muestre la pantalla de elegir cuenta
      client.requestAccessToken({
        prompt: 'select_account',
        hint: targetEmail || undefined,
      });
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      resolve({ error: errObj.message || 'Error al iniciar flujo de Google' });
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
 * Sube o actualiza la copia de seguridad en Google Drive
 */
export async function uploadBackupToGoogleDrive(
  accessToken?: string,
  currentTransactions?: Transaction[]
): Promise<{ success: boolean; message: string; date?: string }> {
  const user = getStoredGoogleUser();
  const token = accessToken || user?.accessToken;

  // Modo Demo / Local si no hay token real
  if (!token || token.startsWith('demo_token_')) {
    const snapshot = exportAllAppData(currentTransactions);
    const dateIso = new Date().toISOString();
    setLastBackupTime(dateIso);
    if (typeof window !== 'undefined') {
      const mockKey = user?.email
        ? `finanzas_cloud_mock_backup_${user.email.toLowerCase()}`
        : 'finanzas_cloud_mock_backup';
      localStorage.setItem(mockKey, JSON.stringify(snapshot));
      localStorage.setItem('finanzas_cloud_mock_backup', JSON.stringify(snapshot));
    }
    const accLabel = user?.email ? ` (${user.email})` : '';
    return {
      success: true,
      message: `Copia de seguridad guardada con éxito para la cuenta${accLabel}.`,
      date: dateIso,
    };
  }

  try {
    const backupData = exportAllAppData(currentTransactions);
    const backupJsonString = JSON.stringify(backupData, null, 2);

    const existingFileId = await findBackupFileInDrive(token);

    if (existingFileId) {
      // Actualizar archivo existente
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
      const updateRes = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: backupJsonString,
      });

      if (!updateRes.ok) {
        throw new Error('Error al actualizar el respaldo en Google Drive');
      }
    } else {
      // Crear nuevo archivo con metadata multipart
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
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      if (!createRes.ok) {
        throw new Error('Error al crear archivo de respaldo en Google Drive');
      }
    }

    const dateIso = new Date().toISOString();
    setLastBackupTime(dateIso);

    return {
      success: true,
      message: '¡Copia de seguridad guardada en tu Google Drive correctamente!',
      date: dateIso,
    };
  } catch (err: unknown) {
    const errObj = err as { message?: string };
    console.error('Error al subir a Google Drive:', err);
    return {
      success: false,
      message: errObj.message || 'Error al conectar con Google Drive',
    };
  }
}

/**
 * Descarga y restaura la copia de seguridad desde Google Drive
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

  // Modo Demo / Mock si no hay token real
  if (!token || token.startsWith('demo_token_')) {
    if (typeof window !== 'undefined') {
      const mockKey = user?.email
        ? `finanzas_cloud_mock_backup_${user.email.toLowerCase()}`
        : 'finanzas_cloud_mock_backup';
      const mockRaw = localStorage.getItem(mockKey) || localStorage.getItem('finanzas_cloud_mock_backup');
      if (mockRaw) {
        try {
          const parsed = JSON.parse(mockRaw);
          const res = restoreAllAppData(parsed);
          if (res.success) {
            const accLabel = user?.email ? ` (${user.email})` : '';
            return {
              success: true,
              message: `Copia restaurada exitosamente para la cuenta${accLabel}.`,
              counts: res.counts,
            };
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    return {
      success: false,
      message: `No se encontró ninguna copia previa en la nube para la cuenta ${user?.email || 'seleccionada'}.`,
    };
  }

  try {
    const existingFileId = await findBackupFileInDrive(token);
    if (!existingFileId) {
      return {
        success: false,
        message: 'No se encontró ningún archivo de respaldo en tu cuenta de Google Drive.',
      };
    }

    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${existingFileId}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Error al descargar el archivo de respaldo desde Google Drive.');
    }

    const backupData: AppBackupData = await res.json();
    const result = restoreAllAppData(backupData);

    if (result.success) {
      return {
        success: true,
        message: `¡Restauración exitosa! Se recuperaron ${result.counts.transactions} movimientos y ${result.counts.categories} categorías.`,
        counts: result.counts,
      };
    } else {
      return {
        success: false,
        message: result.error || 'El archivo descargado tiene un formato incompatible.',
      };
    }
  } catch (err: unknown) {
    const errObj = err as { message?: string };
    console.error('Error restaurando desde Google Drive:', err);
    return {
      success: false,
      message: errObj.message || 'Error de conexión con Google Drive',
    };
  }
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
