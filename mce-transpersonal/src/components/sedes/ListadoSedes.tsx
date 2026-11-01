import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { comunidades, sedes, sedesDe, type ComunidadId } from '../../data/sedes';
import { cx } from '../../lib/utilidades';
import FichaSede from './FichaSede';

/** Botonera de filtro por comunidad autónoma, con indicador que se desliza. */
export function FiltroComunidades({
  activa,
  alCambiar,
}: {
  activa: ComunidadId | null;
  alCambiar: (c: ComunidadId | null) => void;
}) {
  const opciones: { id: ComunidadId | null; nombre: string; total: number }[] = [
    { id: null, nombre: 'Todas', total: sedes.length },
    ...comunidades.map((c) => ({ id: c.id, nombre: c.nombre, total: sedesDe(c.id).length })),
  ];
  const visibles = activa ? sedesDe(activa).length : sedes.length;

  return (
    <div className="flex flex-col gap-3 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
      <LayoutGroup id="filtro">
        <div
          role="group"
          aria-label="Filtrar por comunidad autónoma"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {opciones.map((o, n) => {
            const sel = o.id === activa;
            return (
              <motion.button
                key={o.id ?? 'todas'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 + n * 0.06, ease: [0.16, 1, 0.3, 1] }}
                type="button"
                aria-pressed={sel}
                onClick={() => alCambiar(o.id)}
                className={cx(
                  'relative shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[0.92rem] transition-colors duration-300',
                  sel ? 'text-marfil' : 'text-carbon-suave hover:text-carbon',
                )}
              >
                {sel && (
                  <motion.span
                    layoutId="filtro-activo"
                    className="absolute inset-0 rounded-full bg-carbon"
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  />
                )}
                {!sel && <span className="absolute inset-0 rounded-full border border-carbon/15" aria-hidden />}
                <span className="relative">
                  {o.nombre}
                  <span className={cx('ml-2 text-[0.78rem] tabular-nums', sel ? 'text-dorado-claro' : 'text-carbon-suave/80')}>{o.total}</span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </LayoutGroup>
      <p aria-live="polite" className="text-sm text-carbon-suave">
        Mostrando <span className="font-medium tabular-nums text-carbon">{visibles}</span> de {sedes.length} sedes
      </p>
    </div>
  );
}

/** Sedes agrupadas por comunidad. Al filtrar, las fichas salen y entran con transición. */
export function ListadoSedes({ activa, compacta = false }: { activa: ComunidadId | null; compacta?: boolean }) {
  const grupos = comunidades.filter((c) => !activa || c.id === activa);
  let contador = 0;
  const numeros = new Map(sedes.map((s) => [s.id, ++contador]));

  return (
    <div className="relative">
      <AnimatePresence mode="popLayout" initial={false}>
        {grupos.map((c) => (
          <motion.section
            key={c.id}
            layout
            aria-labelledby={`grupo-${c.id}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="pt-12 first:pt-6"
          >
            <div className="flex items-baseline justify-between gap-6 pb-2">
              <h2 id={`grupo-${c.id}`} className="flex items-center gap-3 font-sans text-[1rem] font-semibold text-mar">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-mar" />
                {c.nombre}
              </h2>
              <span className="text-sm tabular-nums text-carbon-suave">
                {sedesDe(c.id).length} {sedesDe(c.id).length === 1 ? 'sede' : 'sedes'}
              </span>
            </div>
            <ul className="filete divide-y divide-carbon/15 border-y">
              {sedesDe(c.id).map((s, i) => (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
                >
                  <FichaSede sede={s} numero={numeros.get(s.id) ?? 0} compacta={compacta} />
                </motion.li>
              ))}
            </ul>
          </motion.section>
        ))}
      </AnimatePresence>
    </div>
  );
}
