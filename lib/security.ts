/**
 * Utilidades de seguridad, gestión de PIN y control de sesión
 */

const PIN_STORAGE_KEY = 'finanzas_custom_pin';
const PIN_DISABLED_KEY = 'finanzas_pin_disabled';
const AUTH_SESSION_KEY = 'finanzas_auth';
const DEFAULT_PIN = '2706';

export function isPinDisabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PIN_DISABLED_KEY) === 'true';
}

export function setPinDisabled(disabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (disabled) {
    localStorage.setItem(PIN_DISABLED_KEY, 'true');
    setSessionAuthenticated(true);
  } else {
    localStorage.removeItem(PIN_DISABLED_KEY);
  }
}

export function isPinSetup(): boolean {
  if (typeof window === 'undefined') return true;
  if (isPinDisabled()) return false;
  return true;
}

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
  if (!currentPin) return true;
  return inputPin.trim() === currentPin;
}

export function saveCustomPin(newPin: string): boolean {
  if (!newPin || newPin.trim().length < 4 || newPin.trim().length > 6) {
    return false;
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(PIN_STORAGE_KEY, newPin.trim());
    localStorage.removeItem(PIN_DISABLED_KEY);
    return true;
  }
  return false;
}

export function isSessionAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  if (isPinDisabled()) return true;
  return (
    sessionStorage.getItem(AUTH_SESSION_KEY) === 'true' ||
    localStorage.getItem(AUTH_SESSION_KEY) === 'true'
  );
}

export function setSessionAuthenticated(authenticated: boolean): void {
  if (typeof window === 'undefined') return;
  if (authenticated) {
    sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
    localStorage.removeItem(AUTH_SESSION_KEY);
  } else {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
  }
}

export function logoutUser(): void {
  setSessionAuthenticated(false);
}
