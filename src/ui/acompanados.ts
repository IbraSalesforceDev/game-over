/**
 * Quién está contigo, y si de verdad lo está.
 *
 * Hasta 7.11.1 la partida acompañada no se veía por ningún lado. Lo único que
 * decía algo eran dos avisos de segundo y medio —«Conectado», «Fulano ha
 * entrado»— y, si se perdían, ya no había forma de saber si estabas en una
 * partida con alguien, solo, o esperando a que apareciera.
 *
 * Eso no era un detalle de acabado: era la razón por la que un fallo de
 * conexión se sentía como «el multijugador no funciona» en vez de como «no ha
 * conectado». Un jugador que ve «esperando a que entre alguien» sabe que le
 * toca esperar; uno que no ve nada supone que está roto.
 *
 * Se enseña solo en las partidas de la nube, que son las únicas que pueden
 * tener a alguien más.
 */

export type EstadoAcompanados = 'conectando' | 'conectado' | 'solo' | 'fallo';

const ESTILO = `
#acompanados {
  pointer-events: none;
  /* Debajo del cartel de suceso: los dos viven en esta esquina y el de suceso
     es el que no puede quedar tapado. */
  position: fixed; left: 14px; top: 44px; z-index: 46; display: none;
  padding: 6px 10px; min-width: 108px;
  background: rgba(13,17,23,.78); border: 1px solid #2b3440; border-radius: 8px;
  font: 10px ui-monospace, monospace; color: #c9d4e0;
}
#acompanados.visible { display: block; }
#acompanados .papel {
  letter-spacing: .12em; text-transform: uppercase; color: #8b98a8;
  display: flex; align-items: center; gap: 6px;
}
#acompanados .luz {
  width: 6px; height: 6px; border-radius: 50%; background: #6a7686; flex: none;
}
#acompanados.conectado .luz { background: #7fd15a; }
#acompanados.conectando .luz { background: #e8b64c; }
#acompanados.fallo .luz { background: #e0857a; }
#acompanados.fallo .papel { color: #e0857a; }
#acompanados ul { margin: 4px 0 0; padding: 0; list-style: none; }
#acompanados li { color: #e8d9b0; margin-top: 2px; }
#acompanados .vida {
  height: 3px; margin-top: 2px; border-radius: 2px;
  background: rgba(8,10,14,.7); overflow: hidden;
}
#acompanados .vida i { display: block; height: 100%; }
#acompanados .vida.mucha i { background: #6fbf46; }
#acompanados .vida.media i { background: #e0a83a; }
#acompanados .vida.poca i { background: #d94f4f; }
#acompanados .nadie { color: #6a7686; font-style: italic; margin-top: 3px; }
`;

const TEXTO_ESTADO: Record<EstadoAcompanados, string> = {
  conectando: 'conectando…',
  conectado: 'en partida',
  solo: 'esperando',
  fallo: 'sin conexión',
};

/** Lo que hace falta saber de cada uno para pintarlo en la esquina. */
export interface Companero {
  nombre: string;
  vida: number;
  vidaMax: number;
}

export interface PanelAcompanados {
  /** Enseña el panel y dice de qué lado estás. */
  empezar(papel: 'anfitrion' | 'invitado'): void;
  estado(e: EstadoAcompanados, motivo?: string): void;
  /** Quiénes están contigo y cómo andan de vida. */
  compania(gente: readonly Companero[]): void;
  esconder(): void;
}

/**
 * El texto de la fila de arriba.
 *
 * Fuera del DOM para poder probarlo: es la única parte con reglas. Con gente
 * dentro manda «en partida» aunque el estado diga otra cosa —lo que se ve por
 * la ventana pesa más que lo que diga un contador— y sin nadie, el anfitrión
 * espera y el invitado busca.
 */
export function resumen(
  papel: 'anfitrion' | 'invitado',
  estado: EstadoAcompanados,
  cuantos: number,
): string {
  const quien = papel === 'anfitrion' ? 'Anfitrión' : 'Invitado';
  if (cuantos > 0) return `${quien} · ${cuantos === 1 ? '1 contigo' : `${cuantos} contigo`}`;
  if (estado === 'fallo') return `${quien} · ${TEXTO_ESTADO.fallo}`;
  if (estado === 'conectando') return `${quien} · ${TEXTO_ESTADO.conectando}`;
  return `${quien} · ${TEXTO_ESTADO.solo}`;
}

/**
 * Cuánta barra se pinta, de 0 a 100. `-1` es «no se sabe».
 *
 * Lo de «no se sabe» no es un caso raro de laboratorio: pasa de verdad durante
 * el primer segundo, entre que alguien entra y manda su primer estado, y pasa
 * entero si el otro juega con una versión anterior a la 7.13.0. En los dos
 * casos lo honesto es no pintar barra, porque una barra a cero dice «se está
 * muriendo» y una a tope dice «está perfecto», y las dos mentirían.
 */
export function anchoVida(vida: number, vidaMax: number): number {
  if (!(vidaMax > 0)) return -1;
  return Math.round(Math.max(0, Math.min(1, vida / vidaMax)) * 100);
}

/** Lo que se lee debajo cuando no hay nadie. Distinto según de qué lado estés. */
export function textoVacio(papel: 'anfitrion' | 'invitado', estado: EstadoAcompanados): string {
  if (estado === 'fallo') {
    return papel === 'anfitrion'
      ? 'No se ha podido abrir la sala'
      : 'No se ha podido conectar con el anfitrión';
  }
  return papel === 'anfitrion'
    ? 'Esperando a que entre alguien'
    : 'Buscando al anfitrión…';
}

export function crearAcompanados(contenedor: HTMLElement): PanelAcompanados {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const raiz = document.createElement('div');
  raiz.id = 'acompanados';
  const fila = document.createElement('div');
  fila.className = 'papel';
  const luz = document.createElement('span');
  luz.className = 'luz';
  const titulo = document.createElement('span');
  fila.append(luz, titulo);
  const cuerpo = document.createElement('div');
  raiz.append(fila, cuerpo);
  contenedor.appendChild(raiz);

  let papel: 'anfitrion' | 'invitado' = 'anfitrion';
  let ahora: EstadoAcompanados = 'conectando';
  let gente: readonly Companero[] = [];
  /** Lo último pintado, para no tocar el DOM sesenta veces por segundo. */
  let ultimo = '';

  function pintar(): void {
    const firma = `${papel}|${ahora}|${gente
      .map((g) => `${g.nombre}:${anchoVida(g.vida, g.vidaMax)}`)
      .join(',')}`;
    if (firma === ultimo) return;
    ultimo = firma;

    titulo.textContent = resumen(papel, ahora, gente.length);
    raiz.className = `visible ${gente.length > 0 ? 'conectado' : ahora}`;

    cuerpo.textContent = '';
    if (gente.length === 0) {
      const p = document.createElement('div');
      p.className = 'nadie';
      p.textContent = textoVacio(papel, ahora);
      cuerpo.appendChild(p);
      return;
    }
    const ul = document.createElement('ul');
    for (const g of gente) {
      const li = document.createElement('li');
      const nombre = document.createElement('div');
      nombre.textContent = `· ${g.nombre}`;
      li.appendChild(nombre);
      const pct = anchoVida(g.vida, g.vidaMax);
      if (pct >= 0) {
        const barra = document.createElement('div');
        barra.className = `vida ${pct > 50 ? 'mucha' : pct > 25 ? 'media' : 'poca'}`;
        const relleno = document.createElement('i');
        relleno.style.width = `${pct}%`;
        barra.appendChild(relleno);
        li.appendChild(barra);
      }
      ul.appendChild(li);
    }
    cuerpo.appendChild(ul);
  }

  return {
    empezar(p) {
      papel = p;
      raiz.classList.add('visible');
      pintar();
    },
    estado(e) {
      ahora = e;
      pintar();
    },
    compania(lista) {
      gente = lista.map((g) => ({ ...g }));
      pintar();
    },
    esconder() {
      raiz.classList.remove('visible');
    },
  };
}
