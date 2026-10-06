/**
 * Servicio de Autenticación Biométrica (Lector de huellas / Reconocimiento facial)
 * Utiliza WebAuthn / Platform Authenticator estándar compatible con Android (Capacitor y Web).
 */

const STORAGE_KEY_BIOMETRIC_CRED_ID = 'finanzas_biometric_credential_id';
const STORAGE_KEY_BIOMETRIC_ENABLED = 'finanzas_biometric_enabled';

/**
 * Comprueba si el dispositivo cuenta con lector de huellas o autenticador biométrico de plataforma.
 */
export async function isBiometricsAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if (
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return !!available;
    }
  } catch (err) {
    console.warn('Error verificando disponibilidad de biométricos:', err);
  }
  return false;
}

export function isBiometricsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_KEY_BIOMETRIC_ENABLED);
  // Por defecto habilitado si el dispositivo lo soporta
  return stored === null ? true : stored === 'true';
}

export function setBiometricsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
}

/**
 * Convierte un ArrayBuffer a string base64
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convierte un string base64 a Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Ejecuta el desbloqueo mediante huella digital / biometría del teléfono.
 */
export async function authenticateWithBiometrics(): Promise<{
  success: boolean;
  message?: string;
}> {
  if (typeof window === 'undefined') {
    return { success: false, message: 'Entorno no soportado' };
  }

  const available = await isBiometricsAvailable();
  if (!available) {
    return {
      success: false,
      message: 'El dispositivo no cuenta con sensor de huellas o biometría disponible.',
    };
  }

  const storedCredId = localStorage.getItem(STORAGE_KEY_BIOMETRIC_CRED_ID);

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // 1. Si ya se registró previamente una credencial en el dispositivo
    if (storedCredId) {
      try {
        const rawId = base64ToUint8Array(storedCredId);
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: 'required',
            allowCredentials: [
              {
                id: rawId as BufferSource,
                type: 'public-key',
                transports: ['internal'],
              },
            ],
          },
        });

        if (assertion) {
          return { success: true, message: 'Autenticación biométrica exitosa.' };
        }
      } catch (assertionErr: unknown) {
        const errObj = assertionErr as { name?: string };
        // Si el usuario canceló la huella, no borrar la credencial
        if (errObj.name === 'NotAllowedError' || errObj.name === 'AbortError') {
          return { success: false, message: 'Lectura de huella cancelada.' };
        }
        // Si falló por cambio de credencial, intentamos re-registrarla abajo
        console.warn('Fallo en assertion, intentando nuevo registro biométrico:', assertionErr);
      }
    }

    // 2. Primera vez o re-vinculación: Registrar credencial de huella en el teléfono
    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Finanzas Personales',
        },
        user: {
          id: userId,
          name: 'usuario@finanzas',
          displayName: 'Finanzas Personales',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: false,
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential;

    if (credential && credential.rawId) {
      const b64Id = bufferToBase64(credential.rawId);
      localStorage.setItem(STORAGE_KEY_BIOMETRIC_CRED_ID, b64Id);
      return { success: true, message: 'Huella digital vinculada y verificada con éxito.' };
    }

    return { success: false, message: 'No se pudo completar la verificación biométrica.' };
  } catch (err: unknown) {
    const errObj = err as { name?: string; message?: string };
    if (errObj.name === 'NotAllowedError' || errObj.name === 'AbortError') {
      return { success: false, message: 'Lectura de huella cancelada por el usuario.' };
    }
    return {
      success: false,
      message: errObj.message || 'Error al comunicarse con el sensor de huellas.',
    };
  }
}
