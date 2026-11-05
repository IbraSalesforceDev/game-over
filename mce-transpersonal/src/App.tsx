import { useEffect, useLayoutEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { AnimatePresence, MotionConfig } from 'framer-motion';

import { ProveedorConsentimiento } from './lib/consentimiento';
import { irAlAncla } from './lib/utilidades';
import { iniciarScroll, irA } from './lib/scroll';
import { fijarDestino } from './lib/transicion';
import Cabecera from './components/layout/Cabecera';
import ProgresoLectura from './components/anim/ProgresoLectura';
import Pie from './components/layout/Pie';
import BannerCookies from './components/legal/BannerCookies';
import ModalLegal from './components/legal/ModalLegal';

import Inicio from './pages/Inicio';
import SobreMce from './pages/SobreMce';
import Formaciones from './pages/Formaciones';
import Equipo from './pages/Equipo';
import Sedes from './pages/Sedes';
import Contacto from './pages/Contacto';
import Privacidad from './pages/Privacidad';
import Cookies from './pages/Cookies';
import AvisoLegal from './pages/AvisoLegal';
import NoEncontrada from './pages/NoEncontrada';

export default function App() {
  const location = useLocation();
  const primeraCarga = useRef(true);
  const rutaPrevia = useRef(location.pathname);

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    return iniciarScroll();
  }, []);

  // Nombre de la página de destino, para la cortina de transición.
  useLayoutEffect(() => {
    fijarDestino(location.pathname);
  }, [location.pathname]);

  // Navegación dentro de la misma página (p. ej. estar en "/" y pulsar "/#betty").
  // El cambio de página lo gestiona onExitComplete, cuando la cortina ya tapa.
  useEffect(() => {
    const mismaPagina = rutaPrevia.current === location.pathname;
    rutaPrevia.current = location.pathname;
    if (primeraCarga.current) {
      primeraCarga.current = false;
      if (location.hash) irAlAncla(location.hash, false);
      return;
    }
    if (!mismaPagina) return;
    if (location.hash) irAlAncla(location.hash);
  }, [location.pathname, location.hash, location.key]);

  // Hash de la ruta actual según el router (sirve igual con BrowserRouter y HashRouter).
  const hashActual = useRef(location.hash);
  hashActual.current = location.hash;

  // Al terminar la transición de salida: arriba del todo, o al ancla si la hay.
  const alCambiarDePagina = () => {
    irA(0, { inmediato: true });
    // Con ancla: se espera a que la página nueva termine de entrar y se baja con suavidad.
    const hash = hashActual.current;
    if (hash) window.setTimeout(() => irAlAncla(hash), 1100);
  };

  return (
    <MotionConfig reducedMotion="user">
      <ProveedorConsentimiento>
        <button
          type="button"
          onClick={() => document.getElementById('contenido')?.focus()}
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-carbon focus:px-5 focus:py-3 focus:text-marfil"
        >
          Saltar al contenido
        </button>
        <ProgresoLectura />
        <Cabecera />
        {/* El contenido va por encima del pie: al llegar al final, se "levanta"
            y descubre el pie, que está fijo debajo. */}
        <div className="relative z-10 overflow-clip rounded-b-[2rem] bg-marfil shadow-[0_40px_80px_-30px_rgba(0,0,0,0.45)] sm:rounded-b-[3rem]">
          <AnimatePresence mode="wait" onExitComplete={alCambiarDePagina}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Inicio />} />
              <Route path="/sobre-mce" element={<SobreMce />} />
              <Route path="/formaciones" element={<Formaciones />} />
              <Route path="/equipo" element={<Equipo />} />
              <Route path="/sedes" element={<Sedes />} />
              <Route path="/contacto" element={<Contacto />} />
              <Route path="/privacidad" element={<Privacidad />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/aviso-legal" element={<AvisoLegal />} />
              <Route path="*" element={<NoEncontrada />} />
            </Routes>
          </AnimatePresence>
        </div>
        <Pie />
        <BannerCookies />
        <ModalLegal />
      </ProveedorConsentimiento>
    </MotionConfig>
  );
}
