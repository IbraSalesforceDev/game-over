/**
 * Título y descripción de cada página para Google y para las vistas previas
 * (WhatsApp, redes). Se escriben en el HTML de cada página al hacer el build
 * (scripts/prerender.mjs). El título de la pestaña lo pone cada página al
 * navegar (useTitulo), con el mismo formato.
 */
import { escuela } from './escuela';

export type PaginaSeo = {
  ruta: string;
  /** Sin el « · MCE Transpersonal» del final (se añade solo). Vacío en Inicio. */
  titulo: string;
  descripcion: string;
  /** Archivo que se genera en dist/. */
  archivo: string;
  /** false: Google no debe indexarla (la página de error). */
  indexar?: boolean;
};

const sedes = 'Valencia, Alicante Sur, Benidorm, Sevilla, Granada y Madrid';

export const paginasSeo: PaginaSeo[] = [
  {
    ruta: '/',
    titulo: '',
    archivo: 'index.html',
    descripcion: `${escuela.siglas}, ${escuela.lema}: escuela transpersonal fundada por ${escuela.fundadora}. Formaciones en Inteligencia Emocional Transpersonal y sedes en ${sedes}.`,
  },
  {
    ruta: '/sobre-mce',
    titulo: 'Sobre MCE',
    archivo: 'sobre-mce.html',
    descripcion: `Qué es ${escuela.siglas}, ${escuela.lema}, cómo trabaja y su historia: la escuela transpersonal fundada por ${escuela.fundadora}.`,
  },
  {
    ruta: '/formaciones',
    titulo: 'Formaciones',
    archivo: 'formaciones.html',
    descripcion:
      'Niveles de Inteligencia Emocional Transpersonal, Experto, Especialista Transpersonal Sistémico, 7H, Monográficos Transpersonales, charlas, eventos y Congreso de MCE.',
  },
  {
    ruta: '/equipo',
    titulo: 'Equipo',
    archivo: 'equipo.html',
    descripcion: `${escuela.fundadora} y los facilitadores de ${escuela.siglas} en cada sede: ${sedes}.`,
  },
  {
    ruta: '/sedes',
    titulo: 'Sedes',
    archivo: 'sedes.html',
    descripcion: `Las sedes de ${escuela.siglas}: ${sedes}. Facilitadores, teléfonos y redes de cada una.`,
  },
  {
    ruta: '/contacto',
    titulo: 'Contacto',
    archivo: 'contacto.html',
    descripcion: `Contacta con ${escuela.siglas} por correo o por Instagram, o habla directamente con tu sede.`,
  },
  {
    ruta: '/aviso-legal',
    titulo: 'Aviso legal',
    archivo: 'aviso-legal.html',
    descripcion: `Aviso legal de la web de ${escuela.nombre}: datos del titular y condiciones de uso.`,
  },
  {
    ruta: '/privacidad',
    titulo: 'Política de privacidad',
    archivo: 'privacidad.html',
    descripcion: `Política de privacidad de ${escuela.nombre}: qué datos se tratan y cómo ejercer tus derechos.`,
  },
  {
    ruta: '/cookies',
    titulo: 'Política de cookies',
    archivo: 'cookies.html',
    descripcion: `Política de cookies de ${escuela.nombre}: la web solo usa almacenamiento técnico.`,
  },
  {
    // Cualquier dirección que no exista. El hosting la sirve con código 404.
    ruta: '/pagina-no-encontrada',
    titulo: 'Página no encontrada',
    archivo: '404.html',
    descripcion: 'Esta página no existe.',
    indexar: false,
  },
];

/** Igual que el título de la pestaña (useTitulo). */
export function tituloCompleto(titulo: string): string {
  return titulo ? `${titulo} · ${escuela.nombre}` : `${escuela.nombre} · ${escuela.lema}`;
}
