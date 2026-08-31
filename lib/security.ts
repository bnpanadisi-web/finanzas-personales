/**
 * Utilidades de seguridad, gestión de PIN y control de sesión
 */

const PIN_STORAGE_KEY = 'finanzas_custom_pin';
const AUTH_SESSION_KEY = 'finanzas_auth';
const DEFAULT_PIN = '2706';

export function getStoredPin(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_APP_PIN || DEFAULT_PIN;
  }
  const customPin = localStorage.getItem(PIN_STORAGE_KEY);
  if (customPin && customPin.trim().length >= 4) {
    return customPin.trim();
  }
  return process.env.NEXT_PUBLIC_APP_PIN || DEFAULT_PIN;
}

export function verifyPin(inputPin: string): boolean {
  const currentPin = getStoredPin();
  return inputPin.trim() === currentPin;
}

export function saveCustomPin(newPin: string): boolean {
  if (!newPin || newPin.trim().length < 4 || newPin.trim().length > 6) {
    return false;
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(PIN_STORAGE_KEY, newPin.trim());
    return true;
  }
  return false;
}

export function isSessionAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  // Comprobamos sessionStorage primero (para auto-bloqueo al cerrar pestaña)
  // o localStorage si la sesión previa era persistente
  return (
    sessionStorage.getItem(AUTH_SESSION_KEY) === 'true' ||
    localStorage.getItem(AUTH_SESSION_KEY) === 'true'
  );
}

export function setSessionAuthenticated(authenticated: boolean): void {
  if (typeof window === 'undefined') return;
  if (authenticated) {
    sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
    // Para máxima seguridad al cerrar el navegador, quitamos la llave permanente
    localStorage.removeItem(AUTH_SESSION_KEY);
  } else {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
  }
}

export function logoutUser(): void {
  setSessionAuthenticated(false);
}
