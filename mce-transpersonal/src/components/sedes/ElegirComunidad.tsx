import { Link } from 'react-router';
import { comunidades, sedesDe, type ComunidadId } from '../../data/sedes';
import { cx } from '../../lib/utilidades';
import { Escalonado, hijoEscalonado, Revelar } from '../anim/Revelar';
import { FlechaMano, Subrayado } from '../anim/Trazo';
import { motion } from 'framer-motion';

/**
 * Bloque "Elige tu comunidad autónoma · ¿Con quién quieres hablar?".
 * - Con `alElegir`: botones que filtran en la misma página (Sedes).
 * - Sin él: enlaces a /sedes con el filtro aplicado (Inicio).
 */
export default function ElegirComunidad({
  alElegir,
  oscuro = false,
}: {
  alElegir?: (c: ComunidadId) => void;
  oscuro?: boolean;
}) {
  const claseItem = cx(
    'group relative isolate flex w-full items-baseline justify-between gap-6 overflow-hidden px-1 py-6 text-left transition-[color,padding] duration-500 ease-[var(--ease-suave)] hover:px-5 sm:py-7',
    oscuro ? 'text-marfil hover:text-carbon' : 'text-carbon hover:text-marfil',
  );

  const contenido = (nombre: string, total: number) => (
    <>
      <span
        aria-hidden
        className={cx(
          'absolute inset-0 -z-10 origin-bottom scale-y-0 rounded-xl transition-transform duration-500 ease-[var(--ease-suave)] group-hover:scale-y-100',
          oscuro ? 'bg-marfil' : 'bg-carbon',
        )}
      />
      <span className="font-serif text-[clamp(1.6rem,3.6vw,2.5rem)] leading-tight transition-transform duration-500 ease-[var(--ease-suave)] group-hover:translate-x-2 group-hover:italic">
        {nombre}
      </span>
      <span className="flex shrink-0 items-center gap-4 text-sm opacity-70">
        <span className="tabular-nums">
          {total} {total === 1 ? 'sede' : 'sedes'}
        </span>
        <FlechaMano className="h-4 w-8 -translate-x-2 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100" />
      </span>
    </>
  );

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
      <Revelar className="lg:col-span-5">
        <p className={cx('etiqueta', oscuro && '!text-marfil/70')}>Elige tu comunidad autónoma</p>
        <h2 className="mt-5 text-[clamp(2.2rem,5vw,3.8rem)]">
          ¿Con quién{' '}
          <span className="relative inline-block italic">
            quieres hablar
            <Subrayado retraso={0.5} />
          </span>
          ?
        </h2>
      </Revelar>

      <Escalonado
        className={cx('divide-y border-y lg:col-span-7', oscuro ? 'divide-marfil/20 border-marfil/20' : 'filete divide-carbon/15')}
      >
        {comunidades.map((c) => (
          <motion.li key={c.id} variants={hijoEscalonado}>
            {alElegir ? (
              <button type="button" className={claseItem} onClick={() => alElegir(c.id)}>
                {contenido(c.nombre, sedesDe(c.id).length)}
              </button>
            ) : (
              <Link to={`/sedes?comunidad=${c.id}#listado`} className={claseItem}>
                {contenido(c.nombre, sedesDe(c.id).length)}
              </Link>
            )}
          </motion.li>
        ))}
      </Escalonado>
    </div>
  );
}
