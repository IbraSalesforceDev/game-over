import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router';

// Tipografías incluidas en el proyecto: no se pide nada a Google Fonts ni a
// ningún tercero (importante para la política de privacidad).
import '@fontsource-variable/fraunces/opsz.css';
// Cursiva "full": incluye el eje WONK, que se desactiva en index.css para un aire más clásico.
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/dm-sans/index.css';
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
