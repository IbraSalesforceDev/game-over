/**
 * Render en el servidor, solo para generar el HTML de cada página en el build
 * (scripts/prerender.mjs). En el navegador la web arranca desde main.tsx.
 */
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './App';

export { paginasSeo, tituloCompleto } from './data/seo';
export { escuela } from './data/escuela';

export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>,
  );
}
