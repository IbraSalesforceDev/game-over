import {
  dificultad,
  DIFICULTADES,
  DIFICULTAD_POR_DEFECTO,
} from '../core/dificultad';
import {
  hay,
  NOMBRE_ETAPA,
  version,
  VERSIONES,
  VERSION_ACTUAL,
} from '../core/versiones';
import { alMenos } from '../core/versiones';
import { destinosPosibles } from '../world/migracion';
import { VERSION_ANTES_DE_ELEGIR } from '../world/save';
import type { MetaMundo, SaveAdapter } from '../world/almacen';
import { semillaAleatoria } from '../world/gen/rng';
import { dimensiones, TAMANOS, type NombreTamano } from '../world/gen/worldgen';

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
      /** Versión del juego con la que se crea el mundo. */
      version: string;
    }
  | { tipo: 'cargar'; meta: MetaMundo; fuente: Fuente }
  | { tipo: 'migrar'; meta: MetaMundo; destino: string; fuente: Fuente };

/**
 * De dónde sale un mundo.
 *
 * Un mundo o es local o es de la nube, **nunca las dos cosas**. Esa es la
 * decisión que hace que no haya conflictos que resolver en ninguna parte: cada
 * mundo tiene siempre una sola copia con autoridad. Subir uno es una acción
 * explícita y de ida.
 */
export type Fuente = 'local' | 'nube';

/** Lo que el menú necesita de la nube. Lo enchufa `main.ts`. */
export interface FuenteNube {
  almacen: SaveAdapter;
  /** El correo de quien ha entrado, o null. */
  quien(): Promise<string | null>;
  /** Abre el panel de entrada. Devuelve si se ha entrado. */
  entrar(): Promise<boolean>;
  salir(): Promise<void>;
  /** Sube un mundo local a la nube. De ida: allí deja de ser local. */
  subir(meta: MetaMundo): Promise<void>;
  /** Canjea un código de invitación. */
  canjear(codigo: string): Promise<void>;
}

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
#menu .resumen-version {
  width: 100%; margin-top: 10px; padding: 10px 12px;
  background: #101720; border: 1px solid #26313d;
  color: #8b98a8; font-size: 10px; line-height: 1.6;
}
#menu .resumen-version .cabeza {
  display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px;
}
#menu .resumen-version b { color: #e8b64c; font-weight: normal; font-size: 11px; }
#menu .resumen-version .etapa {
  color: #6d7a8a; letter-spacing: .12em; text-transform: uppercase; font-size: 9px;
}
#menu .resumen-version ul { margin: 6px 0 0 14px; color: #7f8c9b; }
#menu .resumen-version li { margin-bottom: 2px; }
#menu .aviso-version { margin-top: 7px; color: #b08a4a; }
#menu select.migrar {
  max-width: 148px; padding: 6px 7px; font-size: 10px; flex: none;
}
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
  nube?: FuenteNube,
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

    /**
     * Una fila de mundo, la misma para la lista local y la de la nube.
     *
     * `fuente` viaja hasta la elección porque el juego tiene que saber de qué
     * almacén cargar: son dos sitios distintos y un mundo está en uno o en otro.
     */
    function pintarFila(meta: MetaMundo, tienda: SaveAdapter, fuente: Fuente): HTMLElement {
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
          `v${meta.versionJuego ?? '?'} · ${meta.ancho}×${meta.alto} · semilla ${meta.semilla} · ` +
          `${duracion(meta.jugado)} jugados · ${peso(meta.bytes)} · ${fecha(meta.modificado)}`;
        datos.append(nombre, detalle);

        const jugar = document.createElement('button');
        jugar.className = 'principal';
        // Un hardcore caído se abre para verlo, no para seguir jugándolo.
        jugar.textContent = meta.caido ? 'Ver' : 'Jugar';
        jugar.addEventListener('click', () => cerrar({ tipo: 'cargar', meta, fuente }));

        // --- Cambiar de versión ---
        //
        // Va en la fila del mundo y no en un menú aparte porque es una acción
        // sobre ese mundo concreto, como borrarlo. El desplegable lista todas
        // las versiones menos la suya, hacia delante y hacia atrás.
        const versionMundo = meta.versionJuego ?? VERSION_ANTES_DE_ELEGIR;
        const sMigrar = document.createElement('select');
        sMigrar.className = 'migrar';
        const vacia = document.createElement('option');
        vacia.value = '';
        vacia.textContent = 'Cambiar versión…';
        sMigrar.appendChild(vacia);
        for (const v of [...destinosPosibles(versionMundo)].reverse()) {
          const op = document.createElement('option');
          op.value = v.id;
          const flecha = alMenos(v.id, versionMundo) ? '↑' : '↓';
          op.textContent = `${flecha} ${v.id} · ${v.nombre}`;
          sMigrar.appendChild(op);
        }
        sMigrar.addEventListener('change', () => {
          const destino = sMigrar.value;
          sMigrar.value = '';
          if (destino) cerrar({ tipo: 'migrar', meta, destino, fuente });
        });

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
          await tienda.borrar(meta.id);
          await pintar();
        });

      fila.append(datos, sMigrar, jugar, borrar);
      return fila;
    }

    /**
     * «Subir a la nube», con confirmación en dos pasos.
     *
     * Es un viaje de ida: el mundo deja de estar en este navegador y pasa a
     * pedir cuenta. Eso es lo que hace que no haya nunca dos copias con
     * autoridad, y por eso se pregunta antes, como al borrar.
     */
    function botonSubir(meta: MetaMundo): HTMLElement {
      const b = document.createElement('button');
      b.textContent = 'Subir';
      b.title = 'Llevar este mundo a la nube. Deja de estar solo en este navegador.';
      b.addEventListener('click', async () => {
        if (b.dataset.confirmar !== '1') {
          b.dataset.confirmar = '1';
          b.textContent = '¿Subir?';
          setTimeout(() => {
            b.dataset.confirmar = '0';
            b.textContent = 'Subir';
          }, 3000);
          return;
        }
        b.disabled = true;
        b.textContent = 'Subiendo…';
        try {
          await nube!.subir(meta);
          await pintar();
        } catch (e) {
          b.disabled = false;
          b.textContent = 'Subir';
          decirEnPie(e instanceof Error ? e.message : 'No se ha podido subir', true);
        }
      });
      return b;
    }

    /** Recado al pie del menú, para lo que no cabe en un botón. */
    function decirEnPie(texto: string, mal: boolean): void {
      const pie = caja.querySelector('.pie');
      if (!pie) return;
      pie.textContent = texto;
      (pie as HTMLElement).style.color = mal ? '#e0857a' : '#8fc06a';
    }

    /** La sección de la nube: entrar, la lista de allí, y canjear invitaciones. */
    async function pintarNube(correo: string | null): Promise<void> {
      if (!nube) return;

      const h2 = document.createElement('h2');
      h2.textContent = 'Mundos en la nube';
      caja.appendChild(h2);

      if (!correo) {
        const vacio = document.createElement('div');
        vacio.className = 'vacio';
        vacio.textContent =
          'Entra con tu cuenta para tener las partidas en cualquier sitio y para que te inviten a las de otros.';
        const b = document.createElement('button');
        b.className = 'principal';
        b.textContent = 'Entrar o crear cuenta';
        b.style.marginTop = '8px';
        b.addEventListener('click', async () => {
          if (await nube.entrar()) await pintar();
        });
        caja.append(vacio, b);
        return;
      }

      const tira = document.createElement('div');
      tira.className = 'vacio';
      tira.textContent = `Has entrado como ${correo}. `;
      const bSalir = document.createElement('button');
      bSalir.textContent = 'Salir';
      bSalir.style.marginLeft = '8px';
      bSalir.addEventListener('click', async () => {
        await nube.salir();
        await pintar();
      });
      tira.appendChild(bSalir);
      caja.appendChild(tira);

      let deAlli: MetaMundo[] = [];
      try {
        deAlli = await nube.almacen.listar();
      } catch (e) {
        console.warn('No se han podido listar los mundos de la nube:', e);
        const mal = document.createElement('div');
        mal.className = 'vacio';
        mal.textContent = 'No se ha podido conectar con la nube.';
        caja.appendChild(mal);
        return;
      }

      if (deAlli.length === 0) {
        const vacio = document.createElement('div');
        vacio.className = 'vacio';
        vacio.textContent = 'Aquí no hay ninguno todavía. Sube uno de arriba con «Subir».';
        caja.appendChild(vacio);
      }
      for (const meta of deAlli) {
        caja.appendChild(pintarFila(meta, nube.almacen, 'nube'));
      }

      // --- Invitación ---
      const inv = document.createElement('div');
      inv.className = 'mundo';
      const campo = document.createElement('input');
      campo.placeholder = 'Código de invitación';
      campo.maxLength = 8;
      campo.style.flex = '1';
      campo.style.textTransform = 'uppercase';
      const bCanjear = document.createElement('button');
      bCanjear.textContent = 'Entrar al mundo';
      bCanjear.addEventListener('click', async () => {
        const codigo = campo.value.trim();
        if (!codigo) return;
        bCanjear.disabled = true;
        try {
          await nube.canjear(codigo);
          await pintar();
        } catch (e) {
          bCanjear.disabled = false;
          decirEnPie(e instanceof Error ? e.message : 'Esa invitación no vale', true);
        }
      });
      inv.append(campo, bCanjear);
      caja.appendChild(inv);
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
      for (const clave of Object.keys(TAMANOS)) {
        const op = document.createElement('option');
        op.value = clave;
        sTam.appendChild(op);
      }
      lTam.appendChild(sTam);

      /**
       * Reetiqueta los tamaños con las medidas de la versión elegida.
       *
       * Desde 6.0.0 los mundos son medio más altos, así que un "grande" mide
       * 3200×1125 o 3200×750 según con qué versión se cree. Enseñar siempre el
       * número de hoy sería mentir justo en el desplegable donde se elige.
       */
      const pintarTamanos = (): void => {
        const elegido = sTam.value;
        for (const op of Array.from(sTam.options)) {
          const t = TAMANOS[op.value as NombreTamano];
          const d = dimensiones(op.value as NombreTamano, sVersion.value);
          op.textContent = `${t.nombre} · ${d.ancho}×${d.alto}`;
        }
        if (elegido) sTam.value = elegido;
      };

      // La dificultad se fija al crear el mundo y ya no se toca: por eso se
      // explica aquí en una línea, y no en un menú de opciones donde nadie la
      // leería hasta después de morir.
      // --- Versión ---
      //
      // Va la primera de las opciones porque es la que manda sobre las demás:
      // en un mundo de 1.4.0 no hay dificultad que elegir ni hardcore que
      // marcar, porque ninguna de las dos existía todavía.
      const lVersion = document.createElement('label');
      lVersion.textContent = 'Versión';
      const sVersion = document.createElement('select');
      for (const v of [...VERSIONES].reverse()) {
        const op = document.createElement('option');
        op.value = v.id;
        op.textContent = `${v.id} · ${v.nombre}`;
        sVersion.appendChild(op);
      }
      sVersion.value = VERSION_ACTUAL;
      lVersion.appendChild(sVersion);

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

      const resumenVersion = document.createElement('div');
      resumenVersion.className = 'resumen-version';

      const resumenDif = document.createElement('div');
      resumenDif.className = 'resumen-dif';
      const pintarResumen = (): void => {
        const v = version(sVersion.value);
        pintarTamanos();
        const conDif = hay('dificultad', v.id);
        const conHc = hay('hardcore', v.id);
        // Lo que la versión no tiene no se enseña en gris: se esconde. Un
        // desplegable de dificultad apagado obliga a preguntarse por qué está
        // ahí, y la respuesta —"porque en 1.4.0 no existía"— cabe mejor en la
        // lista de cambios que en un control muerto.
        lDif.style.display = conDif ? '' : 'none';
        lHardcore.style.display = conHc ? '' : 'none';

        const cambios = v.cambios.map((c) => `<li>${c}</li>`).join('');
        const sello = v.id === VERSION_ACTUAL ? ' · la más nueva' : '';
        resumenVersion.innerHTML =
          `<div class="cabeza"><b>${v.id} ${v.nombre}</b>` +
          `<span class="etapa">${NOMBRE_ETAPA[v.etapa]}${sello}</span></div>` +
          `<div>${v.resumen}</div><ul>${cambios}</ul>` +
          (v.id === VERSION_ACTUAL
            ? ''
            : '<div class="aviso-version">Reconstrucción: el contenido y el ' +
              'aspecto son los de entonces —sprites, fondo, luz, iconos—, pero ' +
              'el motor y los menús son los de hoy.</div>');

        const d = dificultad(Number(sDif.value));
        const extra =
          d.id >= 7
            ? ' <span class="aviso-dif">No se puede cambiar después.</span>'
            : '';
        const hc = iHardcore.checked && conHc
          ? ' <span class="aviso-dif">Hardcore: al morir, el mundo se cierra.</span>'
          : '';
        resumenDif.innerHTML = conDif ? `<b>${d.nombre}</b> — ${d.resumen}${extra}${hc}` : '';
      };
      pintarResumen();
      sVersion.addEventListener('change', pintarResumen);
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
          // Lo que la versión no tenía no se manda, aunque el control guarde
          // su último valor: un mundo de 1.4.0 en hardcore sería un mundo con
          // una regla que en 1.4.0 no existía.
          dificultad: hay('dificultad', sVersion.value)
            ? Number(sDif.value)
            : DIFICULTAD_POR_DEFECTO,
          hardcore: hay('hardcore', sVersion.value) && iHardcore.checked,
          version: sVersion.value,
        }),
      );

      campos.append(
        lNombre,
        lSemilla,
        lTam,
        lVersion,
        lDif,
        lHardcore,
        crear,
        resumenVersion,
        resumenDif,
      );
      caja.appendChild(campos);

      // Se pregunta antes de pintar nada porque la lista local también depende:
      // el botón de subir solo tiene sentido con la sesión abierta.
      let correo: string | null = null;
      if (nube) {
        try {
          correo = await nube.quien();
        } catch (e) {
          console.warn('No se ha podido comprobar la sesión:', e);
        }
      }

      // --- Mundos guardados ---
      const h2guardados = document.createElement('h2');
      h2guardados.textContent = nube ? 'Mundos en este navegador' : 'Mundos guardados';
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
        const fila = pintarFila(meta, almacen, 'local');
        if (nube && correo) fila.insertBefore(botonSubir(meta), fila.lastChild);
        caja.appendChild(fila);
      }

      await pintarNube(correo);

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
