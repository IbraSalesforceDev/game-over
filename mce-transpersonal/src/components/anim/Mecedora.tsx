import { motion } from 'framer-motion';
import { cx } from '../../lib/utilidades';

/**
 * La mecedora de la metáfora de MCE, dibujada como un trazo a mano.
 * Se dibuja al aparecer y luego se mece despacio (sin vaivén si el usuario
 * pide reducir el movimiento).
 */
const trazos = [
  // patín (balancín), doble línea para darle grosor a mano
  { d: 'M34 318c58 40 214 52 330-14', ancho: 3.2 },
  { d: 'M52 322c62 30 196 34 300-14', ancho: 1.4, opacidad: 0.55 },
  // respaldo + pata trasera: ligeramente curvo, inclinado hacia atrás
  { d: 'M128 338C118 250 104 150 86 62', ancho: 3 },
  { d: 'M142 338C132 252 120 156 102 66', ancho: 1.4, opacidad: 0.55 },
  // remate superior del respaldo
  { d: 'M78 66c8-14 24-18 34-6', ancho: 2.6 },
  // travesaños del respaldo
  { d: 'M96 116c9-3 17-1 22 3M104 166c9-3 17-1 22 3', ancho: 1.6, opacidad: 0.7 },
  // asiento, con el borde delantero redondeado
  { d: 'M118 236c50-6 104-8 150-6c8 0 12 4 12 10', ancho: 3 },
  // cojín
  { d: 'M126 234c28-18 92-20 136-8', ancho: 1.8, opacidad: 0.75 },
  // pata delantera
  { d: 'M270 244l18 94', ancho: 3 },
  // brazo curvo con remate en voluta
  { d: 'M112 168c48-16 112-20 164-6c12 3 14 14 4 16c-6 1-9-4-5-7', ancho: 2.6 },
  { d: 'M266 176c-2 22-4 42-8 58', ancho: 2.2 },
  // manta doblada sobre el brazo
  { d: 'M160 160c4 24 2 42-6 58M178 158c5 22 4 38-2 52', ancho: 1.6, opacidad: 0.7, color: 'text-terracota' },
];

export default function Mecedora({ className, mecer = true }: { className?: string; mecer?: boolean }) {
  return (
    <svg viewBox="0 0 400 380" className={cx('overflow-visible', className)} role="img" aria-label="Dibujo de una mecedora">
      <g className={mecer ? 'mecer' : undefined}>
        {trazos.map((t, i) => (
          <motion.path
            key={i}
            d={t.d}
            fill="none"
            stroke="currentColor"
            strokeWidth={t.ancho}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={t.color}
            style={{ opacity: t.opacidad ?? 1 }}
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, delay: 0.25 + i * 0.12, ease: [0.65, 0, 0.35, 1] }}
          />
        ))}
      </g>
      {/* sombra en el suelo */}
      <motion.path
        d="M70 352c80 10 200 10 270 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="2 7"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.45 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 1.8 }}
      />
    </svg>
  );
}
