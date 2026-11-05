export type Enlace = { ruta: string; nombre: string };

/** Menú principal. "Contacto" va aparte, como botón destacado. */
export const menu: Enlace[] = [
  { ruta: '/', nombre: 'Inicio' },
  { ruta: '/sobre-mce', nombre: 'Sobre MCE' },
  { ruta: '/formaciones', nombre: 'Formaciones' },
  { ruta: '/equipo', nombre: 'Equipo' },
  { ruta: '/sedes', nombre: 'Sedes' },
];

export const contacto: Enlace = { ruta: '/contacto', nombre: 'Contacto' };

export const legales: Enlace[] = [
  { ruta: '/privacidad', nombre: 'Política de privacidad' },
  { ruta: '/cookies', nombre: 'Política de cookies' },
  { ruta: '/aviso-legal', nombre: 'Aviso legal' },
];
