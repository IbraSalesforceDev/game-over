import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router';

// Tipografías incluidas en el proyecto (solo subconjunto latino): ver fuentes.css.
import './fuentes.css';
import './index.css';

import App from './App';

// Al recargar, el navegador no debe devolver la página a donde estaba: la web
// empieza siempre arriba (y en Inicio, con la formación del logo a la vista).
// Se fija antes de pintar nada para que el navegador no llegue a restaurarla.
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

// En la versión de un solo archivo no hay servidor: rutas con # (index.html#/sedes).
const Router = import.meta.env.MODE === 'archivo' ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
);
