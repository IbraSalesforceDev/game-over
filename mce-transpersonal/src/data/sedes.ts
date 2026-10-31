/**
 * Sedes de MCE, agrupadas por comunidad autónoma.
 *
 * - Barcelona y Cataluña NO existen en la web: no añadirlas.
 * - Sin direcciones postales.
 * - Facilitadores: solo los confirmados. El resto llegará más adelante.
 *   Las fotos van en public/images/facilitadores/nombre-apellido.jpg.
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

export type ComunidadId = 'comunidad-valenciana' | 'andalucia' | 'madrid-baleares' | 'castilla-la-mancha';

export type Comunidad = { id: ComunidadId; nombre: string };

export const comunidades: Comunidad[] = [
  { id: 'comunidad-valenciana', nombre: 'Comunidad Valenciana' },
  { id: 'andalucia', nombre: 'Andalucía' },
  // Madrid y Mallorca son una sola ficha: por eso tienen un grupo propio.
  { id: 'madrid-baleares', nombre: 'Madrid y Baleares' },
  { id: 'castilla-la-mancha', nombre: 'Castilla-La Mancha' },
];

const ig = (usuario: string) => `https://www.instagram.com/${usuario}/`;
const fb = (ruta: string) => `https://www.facebook.com/${ruta}`;

const anabel: Facilitador = { nombre: 'Anabel Martínez' };
const vicente: Facilitador = { nombre: 'Vicente Baldó' };
const daniela: Facilitador = { nombre: 'Daniela Russo' };
const enrique: Facilitador = { nombre: 'Enrique Gala' };
const silvia: Facilitador = { nombre: 'Silvia Díaz' };

const telefonosAlicanteSur = ['633 171 860', '619 313 778'];

export const sedes: Sede[] = [
  // ── Comunidad Valenciana ────────────────────────────────────────────
  {
    id: 'alicante',
    nombre: 'Alicante',
    comunidad: 'comunidad-valenciana',
    instagram: ig('mce_alicante'),
    facebook: fb('MCEAlicante'),
    telefonos: ['619 217 810', '630 713 091'],
    facilitadores: [], // TODO: facilitadores de Alicante
  },
  {
    id: 'alicante-sur',
    nombre: 'Alicante Sur',
    comunidad: 'comunidad-valenciana',
    instagram: ig('mce_alicantesur'),
    facebook: fb('danielarusso.coach.trainer'),
    telefonos: telefonosAlicanteSur,
    facilitadores: [daniela, enrique],
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
    facilitadores: [], // TODO: facilitadores de Sevilla
  },
  {
    id: 'granada',
    nombre: 'Granada',
    comunidad: 'andalucia',
    instagram: ig('mcegranada'),
    facebook: fb('profile.php?id=100002877662454'),
    telefonos: ['686 723 666'],
    facilitadores: [], // TODO: facilitadores de Granada
  },
  {
    id: 'malaga',
    nombre: 'Málaga',
    comunidad: 'andalucia',
    instagram: ig('mcemalaga'),
    facebook: fb('profile.php?id=100076013896882'),
    telefonos: ['658 704 573', '657 854 948'],
    facilitadores: [], // TODO: facilitadores de Málaga
  },
  {
    id: 'almeria',
    nombre: 'Almería',
    comunidad: 'andalucia',
    // TODO: Almería no tiene redes propias todavía.
    instagram: null,
    facebook: null,
    telefonos: telefonosAlicanteSur,
    facilitadores: [daniela, enrique],
    contactoDe: 'Alicante Sur',
    aviso: 'De momento, Almería se atiende con los teléfonos de la sede de Alicante Sur.',
  },

  // ── Madrid y Baleares ───────────────────────────────────────────────
  {
    id: 'madrid-mallorca',
    nombre: 'Madrid y Mallorca',
    comunidad: 'madrid-baleares',
    instagram: ig('mcemadrid'),
    facebook: fb('MCEMadridMallorca'),
    telefonos: ['690 748 305'],
    facilitadores: [silvia],
  },

  // ── Castilla-La Mancha ──────────────────────────────────────────────
  {
    id: 'talavera',
    nombre: 'Talavera de la Reina',
    comunidad: 'castilla-la-mancha',
    // TODO: Talavera no tiene datos propios todavía.
    instagram: null,
    facebook: null,
    telefonos: [],
    facilitadores: [],
    aviso: 'De momento, Talavera de la Reina se atiende desde el contacto general de MCE.',
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
