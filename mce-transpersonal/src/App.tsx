import { useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { AnimatePresence, MotionConfig } from 'framer-motion';

import { ProveedorConsentimiento } from './lib/consentimiento';
import { irAlAncla } from './lib/utilidades';
import Cabecera from './components/layout/Cabecera';
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
import NoEncontrada from './pages/NoEncontrada';

export default function App() {
  const location = useLocation();
  const primeraCarga = useRef(true);
  const rutaPrevia = useRef(location.pathname);

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);

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
    if (hashActual.current) irAlAncla(hashActual.current, false);
    else window.scrollTo(0, 0);
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
        <Cabecera />
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
            <Route path="*" element={<NoEncontrada />} />
          </Routes>
        </AnimatePresence>
        <Pie />
        <BannerCookies />
        <ModalLegal />
      </ProveedorConsentimiento>
    </MotionConfig>
  );
}
