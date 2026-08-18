/**
 * Entrar y salir.
 *
 * Correo y contraseña. La confirmación por correo va apagada en el panel porque
 * el SMTP que trae Supabase solo entrega a las direcciones del equipo: dejarla
 * puesta significaría que los invitados esperan un correo que no va a llegar
 * nunca. Está explicado en `docs/PENDIENTE-PANEL.md`.
 *
 * Los mensajes de error se traducen aquí. Los de Supabase vienen en inglés y
 * son de programador ("Invalid login credentials"); lo que tiene que leer quien
 * está jugando es otra cosa.
 */

import { nube } from './cliente';

export interface Cuenta {
  id: string;
  correo: string;
}

/** Longitud mínima. La misma que se le pide al panel, para no discrepar. */
export const MINIMO_CONTRASENA = 8;

export type CambioSesion = (cuenta: Cuenta | null) => void;

function aCuenta(usuario: { id: string; email?: string } | null | undefined): Cuenta | null {
  if (!usuario) return null;
  return { id: usuario.id, correo: usuario.email ?? '' };
}

/**
 * Traduce el error a algo que se pueda leer.
 *
 * Sin caso por defecto que enseñe el mensaje original: si aparece uno nuevo,
 * más vale un "no se ha podido entrar" que un párrafo en inglés hablando de
 * credenciales.
 */
export function mensajeDeError(error: { message?: string } | null, entrando: boolean): string {
  const bruto = (error?.message ?? '').toLowerCase();
  if (bruto.includes('invalid login credentials')) return 'El correo o la contraseña no son correctos';
  if (bruto.includes('user already registered')) return 'Ese correo ya tiene cuenta. Prueba a entrar';
  if (bruto.includes('password should be at least') || bruto.includes('weak'))
    return `La contraseña tiene que tener al menos ${MINIMO_CONTRASENA} caracteres`;
  if (bruto.includes('pwned') || bruto.includes('leaked'))
    return 'Esa contraseña aparece en filtraciones conocidas. Pon otra';
  if (bruto.includes('unable to validate email') || bruto.includes('invalid email'))
    return 'Ese correo no tiene buena pinta';
  if (bruto.includes('email not confirmed')) return 'Esa cuenta está sin confirmar';
  if (bruto.includes('rate limit') || bruto.includes('too many'))
    return 'Demasiados intentos. Espera un momento';
  if (bruto.includes('failed to fetch') || bruto.includes('network'))
    return 'No hay conexión con el servidor';
  return entrando ? 'No se ha podido entrar' : 'No se ha podido crear la cuenta';
}

/** Comprobaciones antes de molestar al servidor. Devuelve null si todo va bien. */
export function revisarCredenciales(correo: string, contrasena: string): string | null {
  if (!correo.trim()) return 'Falta el correo';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) return 'Ese correo no tiene buena pinta';
  if (contrasena.length < MINIMO_CONTRASENA)
    return `La contraseña tiene que tener al menos ${MINIMO_CONTRASENA} caracteres`;
  return null;
}

export interface Resultado {
  ok: boolean;
  /** Ya listo para enseñar. Vacío si `ok`. */
  error: string;
}

export async function entrar(correo: string, contrasena: string): Promise<Resultado> {
  const mal = revisarCredenciales(correo, contrasena);
  if (mal) return { ok: false, error: mal };
  const sb = await nube();
  const { error } = await sb.auth.signInWithPassword({
    email: correo.trim(),
    password: contrasena,
  });
  return error ? { ok: false, error: mensajeDeError(error, true) } : { ok: true, error: '' };
}

export async function registrarse(correo: string, contrasena: string): Promise<Resultado> {
  const mal = revisarCredenciales(correo, contrasena);
  if (mal) return { ok: false, error: mal };
  const sb = await nube();
  const { data, error } = await sb.auth.signUp({
    email: correo.trim(),
    password: contrasena,
  });
  if (error) return { ok: false, error: mensajeDeError(error, false) };
  // Con la confirmación apagada, registrarse deja sesión abierta. Si algún día
  // se enciende, no la deja, y hay que decirlo en vez de fingir que se entró.
  if (!data.session) {
    return { ok: false, error: 'Cuenta creada. Falta confirmarla antes de entrar' };
  }
  return { ok: true, error: '' };
}

export async function salir(): Promise<void> {
  const sb = await nube();
  await sb.auth.signOut();
}

/** Quién hay ahora mismo, o null. */
export async function quienSoy(): Promise<Cuenta | null> {
  const sb = await nube();
  const { data } = await sb.auth.getSession();
  return aCuenta(data.session?.user);
}

/** Avisa cada vez que se entra o se sale. Devuelve cómo dejar de escuchar. */
export async function alCambiarSesion(fn: CambioSesion): Promise<() => void> {
  const sb = await nube();
  const { data } = sb.auth.onAuthStateChange((_evento, sesion) => {
    fn(aCuenta(sesion?.user));
  });
  return () => data.subscription.unsubscribe();
}
