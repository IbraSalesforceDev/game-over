import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { enServidor, useTitulo } from '../../lib/utilidades';
import { tomarRetrasoEntrada, useDestino } from '../../lib/transicion';

/**
 * Retraso (s) que deben respetar las animaciones de entrada de la página:
 * `inicial` para las que se lanzan al montar; `vivo` para las que dependen
 * del scroll (vale lo mismo al principio y pasa a 0 cuando la página ya está visible).
 */
const RetrasoPagina = createContext({ inicial: 0, vivo: 0 });
export const useRetrasoPagina = () => useContext(RetrasoPagina);

/** En la primera carga no hay cortina: solo al navegar entre páginas. */
let primeraPagina = true;

const curva = '50% 16vh';
const ease = [0.76, 0, 0.24, 1] as const;

const cortina: Variants = {
  // la página nueva aparece tapada…
  tapada: { y: '0%', borderTopLeftRadius: '0% 0vh', borderTopRightRadius: '0% 0vh', borderBottomLeftRadius: '0% 0vh', borderBottomRightRadius: '0% 0vh' },
  fuera: { y: '-101%' },
  // …y la cortina se retira hacia arriba curvándose por abajo
  abrir: {
    y: '-101%',
    borderBottomLeftRadius: curva,
    borderBottomRightRadius: curva,
    transition: { duration: 0.85, ease, delay: 0.1 },
  },
  // al salir, sube desde abajo curvada por arriba y se aplana al cubrir
  cerrar: {
    y: ['101%', '0%'],
    borderTopLeftRadius: [curva, '0% 0vh'],
    borderTopRightRadius: [curva, '0% 0vh'],
    borderBottomLeftRadius: '0% 0vh',
    borderBottomRightRadius: '0% 0vh',
    transition: { duration: 0.7, ease },
  },
};

function Cortina({ tapada }: { tapada: boolean }) {
  const destino = useDestino();
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-carbon"
      variants={cortina}
      initial={tapada ? 'tapada' : 'fuera'}
      animate="abrir"
      exit="cerrar"
    >
      <motion.div
        className="text-center text-marfil"
        variants={{
          tapada: { opacity: 1, y: 0 },
          fuera: { opacity: 0 },
          abrir: { opacity: 0, y: -30, transition: { duration: 0.4 } },
          cerrar: { opacity: [0, 1], y: [30, 0], transition: { duration: 0.5, delay: 0.25 } },
        }}
      >
        <p className="etiqueta !text-dorado-claro/80">MCE</p>
        <p className="mt-3 font-serif text-[clamp(2.4rem,7vw,5.5rem)] font-light italic leading-none">{destino}</p>
      </motion.div>
    </motion.div>
  );
}

export default function Pagina({ titulo, children }: { titulo?: string; children: ReactNode }) {
  useTitulo(titulo);
  const reducido = useReducedMotion();
  const [conCortina] = useState(() => !primeraPagina);
  const [retraso] = useState(() => tomarRetrasoEntrada());
  const [vivo, setVivo] = useState(retraso);
  useEffect(() => {
    primeraPagina = false;
    const t = window.setTimeout(() => setVivo(0), (retraso + 0.6) * 1000);
    return () => window.clearTimeout(t);
  }, [retraso]);

  return (
    <RetrasoPagina.Provider value={{ inicial: retraso, vivo }}>
      {/* La cortina va en un portal: así cubre también la cabecera y no le
          afectan los transform ni las capas del contenido. */}
      {!reducido && !enServidor && createPortal(<Cortina tapada={conCortina} />, document.body)}
      <motion.main
        id="contenido"
        tabIndex={-1}
        className="relative z-10 bg-marfil outline-none"
        initial={{ opacity: conCortina ? 0 : 1, y: conCortina && !reducido ? 60 : 0 }}
        animate={{ opacity: 1, y: 0, transition: { duration: reducido ? 0.2 : 0.9, delay: reducido ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] } }}
        exit={reducido ? { opacity: 0, transition: { duration: 0.15 } } : { y: -80, transition: { duration: 0.7, ease } }}
      >
        {children}
      </motion.main>
    </RetrasoPagina.Provider>
  );
}
