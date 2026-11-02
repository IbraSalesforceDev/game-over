/**
 * Sedes de MCE, agrupadas por comunidad autónoma.
 *
 * - Solo existen estas seis sedes: Valencia, Alicante Sur, Benidorm, Sevilla,
 *   Granada y Madrid. No añadir otras.
 * - Sin direcciones postales.
 * - Facilitadores: solo los confirmados. El resto llegará más adelante.
 *   Nombres como en la web oficial (salvo Daniel Jesús Salido, por
 *   indicación de la escuela).
 *
 * TODO fotos de facilitadores (pendiente: desde este entorno no se puede
 * acceder a mcetranspersonal.com). Imágenes de la web oficial, en
 * https://mcetranspersonal.com/wp-content/uploads/…:
 *   Anabel Martínez      2024/01/anabel-1-150x150.png (Benidorm) · 2024/01/anabel-150x150.png (Valencia)
 *   Vicente Baldó        2024/01/Vicen3-150x150.png
 *   Daniela Russo        2024/01/daniela-150x150.png
 *   Silvia Díaz          2024/01/silvia-150x150.png
 *   Daniel Jesús Salido  2020/12/Daniel-150x150.jpg
 *   Noelia Domínguez     2024/01/noe-150x150.png
 */

export type Facilitador = {
  nombre: string;
  rol?: string;
  /** Ruta dentro de /public, p. ej. '/images/facilitadores/anabel-martinez.jpg' */
  foto?: string;
};

export type Sede = {
  id: string;
  nombre: string;
  comunidad: ComunidadId;
  instagram: string | null;
  facebook: string | null;
  telefonos: string[];
  facilitadores: Facilitador[];
  /** Aviso discreto cuando la sede aún no tiene datos propios. */
  aviso?: string;
  /** Sede de la que toma prestados los datos de contacto. */
  contactoDe?: string;
};

export type ComunidadId = 'comunidad-valenciana' | 'andalucia' | 'madrid';

export type Comunidad = { id: ComunidadId; nombre: string };

export const comunidades: Comunidad[] = [
  { id: 'comunidad-valenciana', nombre: 'Comunidad Valenciana' },
  { id: 'andalucia', nombre: 'Andalucía' },
  { id: 'madrid', nombre: 'Comunidad de Madrid' },
];

const ig = (usuario: string) => `https://www.instagram.com/${usuario}/`;
const fb = (ruta: string) => `https://www.facebook.com/${ruta}`;

const anabel: Facilitador = { nombre: 'Anabel Martínez' };
const vicente: Facilitador = { nombre: 'Vicente Baldó' };
const daniela: Facilitador = { nombre: 'Daniela Russo' };
const silvia: Facilitador = { nombre: 'Silvia Díaz' };
const danielSalido: Facilitador = { nombre: 'Daniel Jesús Salido' };
const noelia: Facilitador = { nombre: 'Noelia Domínguez' };

const telefonosAlicanteSur = ['633 171 860', '619 313 778'];

export const sedes: Sede[] = [
  // ── Comunidad Valenciana ────────────────────────────────────────────
  {
    id: 'alicante-sur',
    nombre: 'Alicante Sur',
    comunidad: 'comunidad-valenciana',
    instagram: ig('mce_alicantesur'),
    facebook: fb('danielarusso.coach.trainer'),
    telefonos: telefonosAlicanteSur,
    facilitadores: [daniela],
  },
  {
    id: 'benidorm',
    nombre: 'Benidorm',
    comunidad: 'comunidad-valenciana',
    instagram: ig('mcebenidorm'),
    facebook: fb('mcebenidorm'),
    telefonos: ['611 020 574', '692 327 932'],
    facilitadores: [anabel, vicente],
  },
  {
    id: 'valencia',
    nombre: 'Valencia',
    comunidad: 'comunidad-valenciana',
    // TODO: el Instagram que nos pasaron coincide con el de Granada (mcegranada).
    // No se muestra hasta confirmar el correcto.
    instagram: null,
    facebook: fb('mcevalencia'),
    telefonos: ['611 020 574'],
    facilitadores: [anabel, vicente],
  },

  // ── Andalucía ───────────────────────────────────────────────────────
  {
    id: 'sevilla',
    nombre: 'Sevilla',
    comunidad: 'andalucia',
    instagram: ig('daniel_jesus_salido_duran'),
    facebook: fb('CONSCIENCIASOCIALSL'),
    telefonos: ['644 473 497'],
    facilitadores: [danielSalido],
  },
  {
    id: 'granada',
    nombre: 'Granada',
    comunidad: 'andalucia',
    instagram: ig('mcegranada'),
    facebook: fb('profile.php?id=100002877662454'),
    telefonos: ['686 723 666'],
    facilitadores: [noelia],
  },

  // ── Comunidad de Madrid ─────────────────────────────────────────────
  {
    id: 'madrid',
    nombre: 'Madrid',
    comunidad: 'madrid',
    instagram: ig('mcemadrid'),
    facebook: fb('MCEMadridMallorca'),
    telefonos: ['690 748 305'],
    facilitadores: [silvia],
  },
];

export function sedesDe(comunidad: ComunidadId): Sede[] {
  return sedes.filter((s) => s.comunidad === comunidad);
}

export function nombreComunidad(id: ComunidadId): string {
  return comunidades.find((c) => c.id === id)?.nombre ?? id;
}

export function esComunidad(valor: string | null): valor is ComunidadId {
  return comunidades.some((c) => c.id === valor);
}

/** Facilitadores únicos con las sedes en las que están. Se calcula desde los datos. */
export function facilitadoresConSedes(): { facilitador: Facilitador; sedes: string[] }[] {
  const mapa = new Map<string, { facilitador: Facilitador; sedes: string[] }>();
  for (const sede of sedes) {
    for (const f of sede.facilitadores) {
      const entrada = mapa.get(f.nombre) ?? { facilitador: f, sedes: [] };
      entrada.sedes.push(sede.nombre);
      mapa.set(f.nombre, entrada);
    }
  }
  return [...mapa.values()];
}
