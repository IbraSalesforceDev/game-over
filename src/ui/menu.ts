import {
  dificultad,
  DIFICULTADES,
  DIFICULTAD_POR_DEFECTO,
} from '../core/dificultad';
import type { MetaMundo, SaveAdapter } from '../world/almacen';
import { semillaAleatoria } from '../world/gen/rng';
import { TAMANOS, type NombreTamano } from '../world/gen/worldgen';

/**
 * Menú de mundos: crear, cargar y borrar.
 *
 * Es DOM sobre el canvas, como el resto de la interfaz. Devuelve una promesa
 * que se resuelve con lo que el jugador elija, de modo que el arranque queda
 * como una secuencia lineal en `main.ts` en vez de un enredo de callbacks.
 */

export type Eleccion =
  | {
      tipo: 'nuevo';
      semilla: string;
      tamano: NombreTamano;
      nombre: string;
      dificultad: number;
      hardcore: boolean;
    }
  | { tipo: 'cargar'; meta: MetaMundo };

const ESTILO = `
#menu {
  position: fixed; inset: 0; z-index: 90; pointer-events: auto;
  display: flex; align-items: center; justify-content: center; padding: 24px;
  background: radial-gradient(ellipse at 50% 35%, #1b2430 0%, #0d1117 70%), #0d1117;
  font: 12px ui-monospace, monospace; color: #d8cfc0;
}
#menu .caja { width: min(560px, 100%); max-height: 100%; overflow-y: auto; }
#menu h1 {
  font-size: clamp(1.6rem, 6vw, 2.6rem); letter-spacing: .16em; text-transform: uppercase;
  color: #e8b64c; text-shadow: 0 0 22px rgba(232,182,76,.3), 0 3px 0 #000; margin-bottom: 4px;
}
#menu .lema { color: #6d7a8a; letter-spacing: .28em; text-transform: uppercase; font-size: 10px; margin-bottom: 22px; }
#menu h2 { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #8b98a8; margin: 18px 0 8px; }
#menu .mundo {
  display: flex; align-items: center; gap: 10px; padding: 9px 11px; margin-bottom: 6px;
  background: #131a22; border: 1px solid #2a343f;
}
#menu .mundo:hover { border-color: #3d4a58; }
#menu .mundo .datos { flex: 1; min-width: 0; }
#menu .mundo .nombre { color: #d8cfc0; margin-bottom: 3px; }
#menu .mundo .detalle { color: #6d7a8a; font-size: 10px; }
#menu button {
  padding: 7px 12px; cursor: pointer; background: #1c242e; color: #d8cfc0;
  border: 1px solid #38434f; font: 11px ui-monospace, monospace; white-space: nowrap;
}
#menu button:hover { background: #26313d; border-color: #4a5765; }
#menu button.principal { background: #3a2f16; border-color: #7a6428; color: #e8b64c; }
#menu button.principal:hover { background: #4a3c1c; }
#menu button.peligro:hover { background: #3a1c1a; border-color: #7a3630; color: #e0857a; }
#menu .campos { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end; }
#menu label { display: flex; flex-direction: column; gap: 4px; color: #8b98a8; font-size: 10px; }
#menu input, #menu select {
  padding: 7px 9px; background: #131a22; color: #d8cfc0;
  border: 1px solid #38434f; font: 11px ui-monospace, monospace;
}
#menu input { width: 150px; }
#menu .vacio { color: #6d7a8a; padding: 10px 0 4px; }
#menu .resumen-dif {
  width: 100%; margin-top: 8px; color: #8b98a8; font-size: 10px; line-height: 1.6;
}
#menu .resumen-dif b { color: #e8b64c; font-weight: normal; }
#menu .aviso-dif { color: #b08a4a; }
#menu label.hardcore {
  flex-direction: row; align-items: center; gap: 6px; padding-bottom: 7px;
  color: #d8cfc0; cursor: pointer;
}
#menu label.hardcore input { accent-color: #a33a3a; cursor: pointer; }
#menu .sello {
  margin-left: 8px; padding: 1px 6px; font-size: 9px; letter-spacing: .1em;
  text-transform: uppercase; border: 1px solid #7a3630; color: #e0857a;
}
#menu .sello.caido { background: #3a1c1a; color: #ffb3aa; }
#menu .pie { margin-top: 22px; color: #55606d; font-size: 10px; line-height: 1.7; }
`;

function fecha(ms: number): string {
  return new Date(ms).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function duracion(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

function peso(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function mostrarMenu(
  contenedor: HTMLElement,
  almacen: SaveAdapter,
  persistente: boolean,
): Promise<Eleccion> {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const menu = document.createElement('div');
  menu.id = 'menu';
  const caja = document.createElement('div');
  caja.className = 'caja';
  menu.appendChild(caja);
  contenedor.appendChild(menu);

  return new Promise<Eleccion>((resolver) => {
    function cerrar(eleccion: Eleccion): void {
      menu.remove();
      estilo.remove();
      resolver(eleccion);
    }

    async function pintar(): Promise<void> {
      caja.innerHTML = '';

      const titulo = document.createElement('h1');
      titulo.textContent = 'Game Over';
      const lema = document.createElement('div');
      lema.className = 'lema';
      lema.textContent = 'Cava · construye · sobrevive';
      caja.append(titulo, lema);

      // --- Mundo nuevo ---
      const h2nuevo = document.createElement('h2');
      h2nuevo.textContent = 'Mundo nuevo';
      caja.appendChild(h2nuevo);

      const campos = document.createElement('div');
      campos.className = 'campos';

      const lNombre = document.createElement('label');
      lNombre.textContent = 'Nombre';
      const iNombre = document.createElement('input');
      iNombre.value = 'Mi mundo';
      iNombre.maxLength = 40;
      lNombre.appendChild(iNombre);

      const lSemilla = document.createElement('label');
      lSemilla.textContent = 'Semilla';
      const iSemilla = document.createElement('input');
      iSemilla.value = semillaAleatoria();
      iSemilla.maxLength = 32;
      lSemilla.appendChild(iSemilla);

      const lTam = document.createElement('label');
      lTam.textContent = 'Tamaño';
      const sTam = document.createElement('select');
      for (const [clave, t] of Object.entries(TAMANOS)) {
        const op = document.createElement('option');
        op.value = clave;
        op.textContent = `${t.nombre} · ${t.ancho}×${t.alto}`;
        sTam.appendChild(op);
      }
      lTam.appendChild(sTam);

      // La dificultad se fija al crear el mundo y ya no se toca: por eso se
      // explica aquí en una línea, y no en un menú de opciones donde nadie la
      // leería hasta después de morir.
      const lDif = document.createElement('label');
      lDif.textContent = 'Dificultad';
      const sDif = document.createElement('select');
      for (const d of DIFICULTADES) {
        const op = document.createElement('option');
        op.value = String(d.id);
        op.textContent = `${d.id} · ${d.nombre}`;
        sDif.appendChild(op);
      }
      sDif.value = String(DIFICULTAD_POR_DEFECTO);
      lDif.appendChild(sDif);

      // El hardcore va aparte de la dificultad porque son dos ejes distintos:
      // se puede querer un mundo tranquilo del que no se pueda volver.
      const lHardcore = document.createElement('label');
      lHardcore.className = 'hardcore';
      const iHardcore = document.createElement('input');
      iHardcore.type = 'checkbox';
      const textoHardcore = document.createElement('span');
      textoHardcore.textContent = 'Hardcore';
      lHardcore.append(iHardcore, textoHardcore);

      const resumenDif = document.createElement('div');
      resumenDif.className = 'resumen-dif';
      const pintarResumen = (): void => {
        const d = dificultad(Number(sDif.value));
        const extra =
          d.id >= 7
            ? ' <span class="aviso-dif">No se puede cambiar después.</span>'
            : '';
        const hc = iHardcore.checked
          ? ' <span class="aviso-dif">Hardcore: al morir, el mundo se cierra.</span>'
          : '';
        resumenDif.innerHTML = `<b>${d.nombre}</b> — ${d.resumen}${extra}${hc}`;
      };
      pintarResumen();
      sDif.addEventListener('change', pintarResumen);
      iHardcore.addEventListener('change', pintarResumen);

      const crear = document.createElement('button');
      crear.className = 'principal';
      crear.textContent = 'Crear y jugar';
      crear.addEventListener('click', () =>
        cerrar({
          tipo: 'nuevo',
          semilla: iSemilla.value.trim() || semillaAleatoria(),
          tamano: sTam.value as NombreTamano,
          nombre: iNombre.value.trim() || 'Mi mundo',
          dificultad: Number(sDif.value),
          hardcore: iHardcore.checked,
        }),
      );

      campos.append(lNombre, lSemilla, lTam, lDif, lHardcore, crear, resumenDif);
      caja.appendChild(campos);

      // --- Mundos guardados ---
      const h2guardados = document.createElement('h2');
      h2guardados.textContent = 'Mundos guardados';
      caja.appendChild(h2guardados);

      let mundos: MetaMundo[] = [];
      try {
        mundos = await almacen.listar();
      } catch (e) {
        console.warn('No se han podido listar los mundos:', e);
      }

      if (mundos.length === 0) {
        const vacio = document.createElement('div');
        vacio.className = 'vacio';
        vacio.textContent = 'Todavía no hay ninguno. Crea uno arriba.';
        caja.appendChild(vacio);
      }

      for (const meta of mundos) {
        const fila = document.createElement('div');
        fila.className = 'mundo';

        const datos = document.createElement('div');
        datos.className = 'datos';
        const nombre = document.createElement('div');
        nombre.className = 'nombre';
        nombre.textContent = meta.nombre;
        if (meta.hardcore) {
          const sello = document.createElement('span');
          sello.className = meta.caido ? 'sello caido' : 'sello';
          sello.textContent = meta.caido ? 'caído' : 'hardcore';
          nombre.appendChild(sello);
        }
        const detalle = document.createElement('div');
        detalle.className = 'detalle';
        detalle.textContent =
          `${meta.ancho}×${meta.alto} · semilla ${meta.semilla} · ` +
          `${duracion(meta.jugado)} jugados · ${peso(meta.bytes)} · ${fecha(meta.modificado)}`;
        datos.append(nombre, detalle);

        const jugar = document.createElement('button');
        jugar.className = 'principal';
        // Un hardcore caído se abre para verlo, no para seguir jugándolo.
        jugar.textContent = meta.caido ? 'Ver' : 'Jugar';
        jugar.addEventListener('click', () => cerrar({ tipo: 'cargar', meta }));

        const borrar = document.createElement('button');
        borrar.className = 'peligro';
        borrar.textContent = 'Borrar';
        borrar.addEventListener('click', async () => {
          // Confirmación en dos pasos, sin diálogo del navegador: borrar un
          // mundo de horas por un clic de más no tiene vuelta atrás.
          if (borrar.dataset.confirmar !== '1') {
            borrar.dataset.confirmar = '1';
            borrar.textContent = '¿Seguro?';
            setTimeout(() => {
              borrar.dataset.confirmar = '0';
              borrar.textContent = 'Borrar';
            }, 3000);
            return;
          }
          await almacen.borrar(meta.id);
          await pintar();
        });

        fila.append(datos, jugar, borrar);
        caja.appendChild(fila);
      }

      const pie = document.createElement('div');
      pie.className = 'pie';
      pie.innerHTML = persistente
        ? 'Las partidas se guardan en este navegador. El juego guarda solo cada 30 s y al salir.'
        : '⚠ Este navegador no permite guardar (¿modo privado?). Puedes jugar, pero el mundo se perderá al cerrar.';
      caja.appendChild(pie);
    }

    void pintar();
  });
}
