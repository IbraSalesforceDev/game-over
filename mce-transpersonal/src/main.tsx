import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router';

// Tipografías incluidas en el proyecto: no se pide nada a Google Fonts ni a
// ningún tercero (importante para la política de privacidad).
// Cormorant Garamond (titulares, con cursiva real) y Figtree (texto).
import '@fontsource-variable/cormorant-garamond/wght.css';
import '@fontsource-variable/cormorant-garamond/wght-italic.css';
import '@fontsource-variable/figtree/index.css';
import './index.css';

import App from './App';

// En la versión de un solo archivo no hay servidor: rutas con # (index.html#/sedes).
const Router = import.meta.env.MODE === 'archivo' ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
);
