import { useId, useMemo } from 'react';
import { motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from 'framer-motion';
import { cx } from '../../lib/utilidades';
import Mecedora from './Mecedora';

/**
 * Ventana en arco que da al mar, con la mecedora dentro de casa.
 * `progreso` (0 → 1) recorre el día: 0 mediodía, ~0.6 atardecer, 1 noche.
 * Se puede pasar un valor fijo (`momento`) o un MotionValue ligado al scroll.
 * Ilustración hecha en código (no es una imagen).
 */

// Semilla fija: las estrellas salen siempre en el mismo sitio.
function estrellas(n: number) {
  let s = 7;
  const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => ({ x: 20 + azar() * 360, y: 20 + azar() * 260, r: 0.6 + azar() * 1.4 }));
}

export default function Ventana({
  progreso,
  momento = 0,
  className,
  conMecedora = true,
  conMaceta = true,
}: {
  progreso?: MotionValue<number>;
  momento?: number;
  className?: string;
  conMecedora?: boolean;
  conMaceta?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const reducido = useReducedMotion();
  const fijo = useMotionValue(momento);
  const p = progreso ?? fijo;
  const puntos = useMemo(() => estrellas(46), []);

  // Cielo: noche de base, atardecer y día encima con opacidad.
  const opDia = useTransform(p, [0, 0.3, 0.6], [1, 1, 0]);
  const opTarde = useTransform(p, [0, 0.72, 0.95], [1, 1, 0]);
  const yaSol = useTransform(p, [0, 0.78], [150, 362]);
  const colorSol = useTransform(p, [0, 0.55], ['#fff2c9', '#f2793f']);
  const halo = useTransform(p, [0, 0.55, 0.8], [0.35, 0.6, 0]);
  const opMar = useTransform(p, [0, 0.55], [1, 0]);
  const opMarTarde = useTransform(p, [0.3, 0.6, 0.95], [0, 1, 0]);
  const opNoche = useTransform(p, [0.7, 1], [0, 1]);
  const opEstrellas = useTransform(p, [0.72, 0.98], [0, 1]);
  const opLuces = useTransform(p, [0.78, 1], [0, 1]);
  const opReflejo = useTransform(p, [0, 0.5, 0.8], [0.55, 0.9, 0]);

  const arco = 'M0 500V200A200 200 0 0 1 400 200V500Z';

  return (
    <svg viewBox="0 0 400 500" className={cx('overflow-visible', className)} role="img" aria-label="Ventana en arco que da al mar, con una mecedora dentro de casa">
      <defs>
        <clipPath id={`arco-${id}`}>
          <path d={arco} />
        </clipPath>
        <linearGradient id={`dia-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fc6dc" />
          <stop offset="1" stopColor="#f6e6c6" />
        </linearGradient>
        <linearGradient id={`tarde-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a7fa6" />
          <stop offset="0.45" stopColor="#ec8a6a" />
          <stop offset="1" stopColor="#f8cf86" />
        </linearGradient>
        <linearGradient id={`noche-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d1530" />
          <stop offset="1" stopColor="#2b3b66" />
        </linearGradient>
        <radialGradient id={`halo-${id}`}>
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#arco-${id})`}>
        {/* cielo */}
        <rect width="400" height="500" fill={`url(#noche-${id})`} />
        <motion.rect width="400" height="500" fill={`url(#tarde-${id})`} style={{ opacity: opTarde }} />
        <motion.rect width="400" height="500" fill={`url(#dia-${id})`} style={{ opacity: opDia }} />

        {/* estrellas y luna */}
        <motion.g style={{ opacity: opEstrellas }} fill="#fff8e6">
          {puntos.map((e, i) => (
            <circle key={i} cx={e.x} cy={e.y} r={e.r} />
          ))}
          <circle cx="300" cy="96" r="18" />
          <circle cx="309" cy="90" r="16" fill="#16203d" />
        </motion.g>

        {/* sol */}
        <motion.circle cx="210" cy={yaSol} r="90" fill={`url(#halo-${id})`} style={{ opacity: halo }} />
        <motion.circle cx="210" cy={yaSol} r="34" style={{ fill: colorSol }} />

        {/* colinas lejanas con casas */}
        <path d="M0 336c40-26 82-30 120-16 30 10 52 4 74-6v22H0Z" fill="#7f8a4a" />
        <path d="M250 340c34-22 76-30 150-14v14H250Z" fill="#6c7740" />
        <motion.path d="M0 336c40-26 82-30 120-16 30 10 52 4 74-6v22H0ZM250 340c34-22 76-30 150-14v14H250Z" fill="#141c35" style={{ opacity: opNoche }} />
        <motion.g style={{ opacity: opLuces }} fill="#ffcf6b">
          <rect x="44" y="322" width="4" height="4" rx="1" />
          <rect x="70" y="317" width="4" height="4" rx="1" />
          <rect x="96" y="321" width="4" height="4" rx="1" />
          <rect x="300" y="327" width="4" height="4" rx="1" />
          <rect x="338" y="324" width="4" height="4" rx="1" />
        </motion.g>

        {/* mar */}
        <rect y="340" width="400" height="160" fill="#101a33" />
        <motion.rect y="340" width="400" height="160" fill="#3d5f7d" style={{ opacity: opMarTarde }} />
        <motion.rect y="340" width="400" height="160" fill="#2e7a93" style={{ opacity: opMar }} />
        {/* reflejo del sol */}
        <motion.g style={{ opacity: opReflejo }} stroke="#ffd98a" strokeWidth="2.4" strokeLinecap="round">
          <path d="M186 352h48M178 364h64M192 376h36M184 390h52M198 404h24" />
        </motion.g>
        {/* olas */}
        <g className={reducido ? undefined : 'olas'} stroke="#ffffff" strokeOpacity="0.28" strokeWidth="1.6" fill="none" strokeLinecap="round">
          <path d="M-40 360q20-6 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0" />
          <path d="M-60 384q20-6 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0" />
          <path d="M-30 410q20-6 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0" />
        </g>
      </g>

      {/* carpintería: parteluz y travesaño */}
      <path d="M200 6V430M0 200H400" stroke="#efebe2" strokeWidth="7" />
      {/* marco */}
      <path d={arco} fill="none" stroke="#efebe2" strokeWidth="14" />
      <path d={arco} fill="none" stroke="#1f2433" strokeOpacity="0.14" strokeWidth="1.5" />

      {/* alféizar y pared */}
      <rect x="-22" y="428" width="444" height="16" rx="5" fill="#e3ddd0" />
      <rect x="-22" y="444" width="444" height="56" fill="#efebe2" />

      {/* maceta */}
      {conMaceta && (
        <g>
          <path d="M318 428l-8-36h52l-8 36Z" fill="#c13e55" />
          <rect x="306" y="386" width="60" height="9" rx="3" fill="#9a2338" />
          <path d="M336 386c-2-24-14-40-34-48 22 0 34 16 36 36M338 386c4-28 18-44 40-50-16 10-26 28-28 50M336 384c-8-16-24-24-40-22" fill="none" stroke="#4e5a23" strokeWidth="5" strokeLinecap="round" />
        </g>
      )}

      {/* mecedora, dentro de casa */}
      {conMecedora && (
        <svg x="-30" y="246" width="250" height="238" viewBox="0 0 400 380" overflow="visible">
          <Mecedora className="text-carbon" halo="#f8f6f1" dibujar={false} />
        </svg>
      )}
    </svg>
  );
}
