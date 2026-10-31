import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'framer-motion';

import { contacto, menu } from '../../data/navegacion';
import { cx } from '../../lib/utilidades';
import { clasesBoton, RellenoBoton } from '../ui/Boton';
import Magnetico from '../anim/Magnetico';
import Logo from './Logo';
import MenuMovil from './MenuMovil';

/**
 * Cabecera: logo, menú y botón "Contacto". Sin barra superior oscura y sin
 * iconos de redes. Al bajar se compacta y gana un fondo marfil translúcido;
 * al subir reaparece si se había ocultado.
 */
export default function Cabecera() {
  const [compacta, setCompacta] = useState(false);
  const [oculta, setOculta] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { scrollY, scrollYProgress } = useScroll();
  const progreso = useSpring(scrollYProgress, { stiffness: 200, damping: 30, mass: 0.3 });
  const { pathname } = useLocation();

  useMotionValueEvent(scrollY, 'change', (y) => {
    const previo = scrollY.getPrevious() ?? 0;
    setCompacta(y > 24);
    setOculta(y > 320 && y > previo + 4 && !menuAbierto);
    if (y < previo - 4) setOculta(false);
  });

  useEffect(() => setMenuAbierto(false), [pathname]);

  return (
    <>
      <motion.header
        className={cx(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-500',
          compacta && !menuAbierto ? 'bg-marfil/88 shadow-[0_1px_0_rgba(46,42,38,0.08)] backdrop-blur-md' : 'bg-transparent',
        )}
        animate={{ y: oculta ? '-100%' : '0%' }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={cx('marco flex items-center justify-between gap-6 transition-[height] duration-500', compacta ? 'h-[4.5rem]' : 'h-[5.5rem] lg:h-24')}>
          <Link to="/" className="relative z-[61] shrink-0 rounded-sm" aria-label="MCE Transpersonal, ir al inicio">
            <Logo />
          </Link>

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {menu.map((e) => (
                <li key={e.ruta}>
                  <NavLink to={e.ruta} end className="group relative block px-4 py-2 text-[0.95rem]">
                    {({ isActive }) => (
                      <>
                        <span className={cx('transition-colors duration-300', isActive ? 'text-carbon' : 'text-carbon-suave group-hover:text-carbon')}>
                          {e.nombre}
                        </span>
                        {isActive ? (
                          <motion.svg
                            layoutId="menu-activo"
                            aria-hidden
                            viewBox="0 0 100 10"
                            preserveAspectRatio="none"
                            className="absolute inset-x-3 bottom-0 h-2 w-[calc(100%-1.5rem)] text-dorado"
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                          >
                            <path d="M2 6.5C25 3.5 60 3 98 5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                          </motion.svg>
                        ) : (
                          <span
                            aria-hidden
                            className="absolute inset-x-4 bottom-1 h-px origin-left scale-x-0 bg-carbon/40 transition-transform duration-500 ease-[var(--ease-suave)] group-hover:scale-x-100"
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <Magnetico className="hidden sm:inline-flex">
              <Link to={contacto.ruta} className={clasesBoton('principal', '!px-6 !py-2.5')}>
                <RellenoBoton />
                <span className="relative transition-colors duration-500 group-hover:text-marfil">{contacto.nombre}</span>
              </Link>
            </Magnetico>

            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-expanded={menuAbierto}
              aria-controls="menu-movil"
              className="relative z-[61] -mr-2 flex items-center gap-3 rounded-full px-3 py-2 text-[0.95rem] lg:hidden"
            >
              <span className="relative inline-block w-14 overflow-hidden text-right">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={menuAbierto ? 'cerrar' : 'menu'}
                    className="block"
                    initial={{ y: '100%' }}
                    animate={{ y: '0%' }}
                    exit={{ y: '-100%' }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {menuAbierto ? 'Cerrar' : 'Menú'}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span aria-hidden className="relative block h-3 w-6">
                <motion.span
                  className="absolute left-0 top-0 h-px w-full bg-carbon"
                  animate={menuAbierto ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.span
                  className="absolute bottom-0 left-0 h-px w-full bg-carbon"
                  animate={menuAbierto ? { rotate: -45, y: -5, width: '100%' } : { rotate: 0, y: 0, width: '70%' }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            </button>
          </div>
        </div>
        {/* Progreso de lectura */}
        <motion.span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-dorado"
          style={{ scaleX: progreso, opacity: compacta && !menuAbierto ? 1 : 0 }}
        />
      </motion.header>

      <MenuMovil abierto={menuAbierto} alCerrar={() => setMenuAbierto(false)} />
    </>
  );
}
