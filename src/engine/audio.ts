/**
 * Sonido sintetizado con WebAudio.
 *
 * Ni un fichero de audio en el repo, por la misma razón que no hay un solo PNG:
 * cada wav son decenas de kilobytes que hay que descargar antes de poder jugar,
 * y un golpe de pico es un ruido corto que se describe en cuatro líneas.
 *
 * Todo sale de tres ladrillos —un oscilador, una envolvente y ruido blanco— y
 * de una regla: **nada suena a volumen constante**. Un efecto que se repite
 * sesenta veces por minuto con la misma nota exacta se convierte en un pitido
 * insoportable a los dos minutos, así que cada disparo mueve un poco el tono.
 *
 * El contexto no se crea hasta el primer gesto del usuario: los navegadores
 * bloquean el audio hasta entonces, y crearlo antes deja un contexto suspendido
 * que no vuelve a arrancar.
 */

/**
 * De qué está hecho lo que suena.
 *
 * Cada material tiene su golpe y su rotura, y son doce voces en vez de dos
 * porque es la diferencia entre picar un mundo y picar una hoja de cálculo:
 * hasta ahora la piedra, el tronco y la veta de oro sonaban exactamente igual,
 * y el oído es lo primero que nota que un juego es de mentira.
 */
export type MaterialAudio = 'piedra' | 'tierra' | 'madera' | 'metal' | 'planta' | 'vidrio';

export type Efecto =
  | 'picar'
  | 'romper'
  | `picar-${MaterialAudio}`
  | `romper-${MaterialAudio}`
  | 'colocar'
  | 'saltar'
  | 'aterrizar'
  | 'golpe'
  | 'espadazo'
  | 'flechazo'
  | 'dano'
  | 'muerte'
  | 'muerte-bicho'
  | 'gruñido'
  | 'huesos'
  | 'chillido'
  | 'gorgoteo'
  | 'aullido'
  | 'rugido'
  | 'recoger'
  | 'craftear'
  | 'chapoteo'
  | 'quemar';

interface Voz {
  /** Forma de onda del tono, o null si el efecto es solo ruido. */
  onda: OscillatorType | null;
  /** Frecuencia inicial y final del barrido, en hercios. */
  desde: number;
  hasta: number;
  /** Duración en segundos. */
  duracion: number;
  /** Volumen relativo, 0-1. */
  volumen: number;
  /** Mezcla de ruido blanco, 0-1. */
  ruido: number;
  /** Corte del filtro paso bajo del ruido. */
  corte: number;
}

const VOCES: Record<Efecto, Voz> = {
  // Picar: un golpe seco y grave, casi todo ruido. Suena muchas veces seguidas,
  // así que es corto y discreto a propósito.
  picar: { onda: 'square', desde: 190, hasta: 90, duracion: 0.06, volumen: 0.1, ruido: 0.7, corte: 1800 },
  romper: { onda: 'triangle', desde: 320, hasta: 70, duracion: 0.2, volumen: 0.22, ruido: 0.8, corte: 2600 },
  colocar: { onda: 'square', desde: 420, hasta: 260, duracion: 0.07, volumen: 0.13, ruido: 0.3, corte: 2200 },
  saltar: { onda: 'square', desde: 340, hasta: 620, duracion: 0.1, volumen: 0.12, ruido: 0, corte: 800 },
  aterrizar: { onda: 'sine', desde: 150, hasta: 60, duracion: 0.13, volumen: 0.18, ruido: 0.55, corte: 900 },
  golpe: { onda: 'sawtooth', desde: 240, hasta: 130, duracion: 0.1, volumen: 0.16, ruido: 0.45, corte: 3000 },
  dano: { onda: 'sawtooth', desde: 300, hasta: 110, duracion: 0.22, volumen: 0.26, ruido: 0.35, corte: 1600 },
  muerte: { onda: 'sawtooth', desde: 240, hasta: 50, duracion: 0.7, volumen: 0.3, ruido: 0.3, corte: 1100 },
  // Recoger y fabricar son los dos únicos que suben de tono: son las dos cosas
  // buenas que pasan, y el oído lo entiende sin que nadie se lo explique.
  recoger: { onda: 'triangle', desde: 720, hasta: 1180, duracion: 0.08, volumen: 0.1, ruido: 0, corte: 800 },
  craftear: { onda: 'triangle', desde: 520, hasta: 980, duracion: 0.18, volumen: 0.16, ruido: 0.1, corte: 1400 },
  chapoteo: { onda: null, desde: 0, hasta: 0, duracion: 0.26, volumen: 0.2, ruido: 1, corte: 1300 },
  quemar: { onda: 'sawtooth', desde: 120, hasta: 70, duracion: 0.3, volumen: 0.22, ruido: 0.85, corte: 900 },

  // --- Picar y romper, material a material ---------------------------------
  //
  // Lo que distingue un material de otro para el oído es sobre todo el corte
  // del filtro: la tierra se lleva todo lo agudo por delante y suena a
  // "pom", el metal deja pasar los armónicos altos y tintinea, y la planta es
  // ruido puro sin nota, porque una hoja al partirse no tiene tono ninguno.
  'picar-tierra': { onda: 'sine', desde: 150, hasta: 70, duracion: 0.07, volumen: 0.1, ruido: 0.85, corte: 700 },
  'romper-tierra': { onda: 'sine', desde: 180, hasta: 55, duracion: 0.18, volumen: 0.2, ruido: 0.95, corte: 620 },
  'picar-piedra': { onda: 'square', desde: 210, hasta: 95, duracion: 0.06, volumen: 0.1, ruido: 0.7, corte: 2400 },
  'romper-piedra': { onda: 'triangle', desde: 300, hasta: 80, duracion: 0.2, volumen: 0.22, ruido: 0.85, corte: 3000 },
  'picar-madera': { onda: 'square', desde: 265, hasta: 155, duracion: 0.07, volumen: 0.11, ruido: 0.45, corte: 1400 },
  'romper-madera': { onda: 'triangle', desde: 330, hasta: 120, duracion: 0.19, volumen: 0.21, ruido: 0.55, corte: 1600 },
  'picar-metal': { onda: 'triangle', desde: 620, hasta: 390, duracion: 0.08, volumen: 0.1, ruido: 0.3, corte: 4400 },
  'romper-metal': { onda: 'triangle', desde: 900, hasta: 300, duracion: 0.24, volumen: 0.19, ruido: 0.28, corte: 5400 },
  'picar-planta': { onda: null, desde: 0, hasta: 0, duracion: 0.07, volumen: 0.09, ruido: 1, corte: 5200 },
  'romper-planta': { onda: null, desde: 0, hasta: 0, duracion: 0.16, volumen: 0.16, ruido: 1, corte: 6000 },
  'picar-vidrio': { onda: 'sine', desde: 950, hasta: 700, duracion: 0.06, volumen: 0.09, ruido: 0.4, corte: 6000 },
  'romper-vidrio': { onda: 'triangle', desde: 1600, hasta: 480, duracion: 0.26, volumen: 0.2, ruido: 0.8, corte: 8000 },

  // --- Armas ---------------------------------------------------------------
  // Los dos son solo aire: un mandoble no tiene nota, y darle una lo convierte
  // en un láser. Lo que los separa es el corte —la espada barre más grave que
  // la flecha— y la duración.
  espadazo: { onda: null, desde: 0, hasta: 0, duracion: 0.14, volumen: 0.13, ruido: 1, corte: 3200 },
  flechazo: { onda: null, desde: 0, hasta: 0, duracion: 0.1, volumen: 0.11, ruido: 1, corte: 5200 },

  // --- Voces de los bichos --------------------------------------------------
  // La muerte de un bicho no es la del jugador: más corta y menos grave, para
  // que no parezca que ha pasado algo malo cada vez que matas un slime.
  'muerte-bicho': { onda: 'sawtooth', desde: 300, hasta: 60, duracion: 0.34, volumen: 0.2, ruido: 0.5, corte: 1200 },
  gruñido: { onda: 'sawtooth', desde: 130, hasta: 78, duracion: 0.36, volumen: 0.13, ruido: 0.45, corte: 700 },
  huesos: { onda: 'square', desde: 95, hasta: 70, duracion: 0.2, volumen: 0.11, ruido: 0.9, corte: 1700 },
  chillido: { onda: 'sine', desde: 1450, hasta: 880, duracion: 0.12, volumen: 0.09, ruido: 0.2, corte: 4200 },
  gorgoteo: { onda: 'sine', desde: 230, hasta: 120, duracion: 0.2, volumen: 0.1, ruido: 0.5, corte: 700 },
  aullido: { onda: 'sawtooth', desde: 430, hasta: 250, duracion: 0.5, volumen: 0.13, ruido: 0.15, corte: 1200 },
  rugido: { onda: 'sawtooth', desde: 92, hasta: 44, duracion: 0.8, volumen: 0.28, ruido: 0.5, corte: 520 },
};

/** Ticks mínimos entre dos disparos del mismo efecto. */
const ANTIRREBOTE: Partial<Record<Efecto, number>> = {
  picar: 70,
  'picar-tierra': 70,
  'picar-piedra': 70,
  'picar-madera': 70,
  'picar-metal': 70,
  'picar-planta': 70,
  'picar-vidrio': 70,
  recoger: 45,
  chapoteo: 200,
  quemar: 260,
  // Las voces de los bichos se cortan entre ellas: con cinco zombis alrededor
  // y sin antirrebote, lo que se oye no son cinco zombis sino una sirena.
  gruñido: 700,
  huesos: 700,
  chillido: 500,
  gorgoteo: 700,
  aullido: 1400,
  rugido: 1800,
};

export interface Audio {
  /** Dispara un efecto. `tono` desplaza la frecuencia (1 = tal cual). */
  sonar(efecto: Efecto, tono?: number): void;
  /** Volumen general, 0-1. */
  volumen: number;
  silenciado: boolean;
  /** Arranca el contexto tras el primer gesto. Idempotente. */
  despertar(): void;
  readonly disponible: boolean;
}

export function crearAudio(): Audio {
  let ctx: AudioContext | null = null;
  let maestro: GainNode | null = null;
  let ruidoBuffer: AudioBuffer | null = null;
  let volumen = 0.55;
  let silenciado = false;
  const ultimo = new Map<Efecto, number>();

  function iniciar(): void {
    if (ctx) return;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    maestro = ctx.createGain();
    maestro.gain.value = silenciado ? 0 : volumen;
    maestro.connect(ctx.destination);

    // Un segundo de ruido blanco, generado una vez y reutilizado por todos los
    // efectos: crear el buffer en cada golpe de pico sería asignar 44.000
    // números por sonido.
    const muestras = ctx.sampleRate;
    ruidoBuffer = ctx.createBuffer(1, muestras, ctx.sampleRate);
    const datos = ruidoBuffer.getChannelData(0);
    for (let i = 0; i < muestras; i++) datos[i] = Math.random() * 2 - 1;
  }

  return {
    get volumen() {
      return volumen;
    },
    set volumen(v: number) {
      volumen = Math.max(0, Math.min(1, v));
      if (maestro) maestro.gain.value = silenciado ? 0 : volumen;
    },
    get silenciado() {
      return silenciado;
    },
    set silenciado(v: boolean) {
      silenciado = v;
      if (maestro) maestro.gain.value = v ? 0 : volumen;
    },
    get disponible() {
      return ctx !== null;
    },
    despertar() {
      iniciar();
      if (ctx?.state === 'suspended') void ctx.resume();
    },
    sonar(efecto, tono = 1) {
      if (!ctx || !maestro || silenciado || volumen <= 0) return;

      const ahora = performance.now();
      const espera = ANTIRREBOTE[efecto];
      if (espera !== undefined && ahora - (ultimo.get(efecto) ?? -1e9) < espera) return;
      ultimo.set(efecto, ahora);

      const v = VOCES[efecto];
      const t0 = ctx.currentTime;
      const t1 = t0 + v.duracion;
      // Variación de tono en cada disparo: sin ella, picar treinta bloques
      // seguidos suena a alarma de despertador.
      const desafine = 0.92 + Math.random() * 0.16;
      const salida = ctx.createGain();
      salida.gain.setValueAtTime(0.0001, t0);
      // Ataque de tres milisegundos: un salto instantáneo a volumen máximo
      // produce un chasquido en los altavoces.
      salida.gain.exponentialRampToValueAtTime(v.volumen, t0 + 0.003);
      salida.gain.exponentialRampToValueAtTime(0.0001, t1);
      salida.connect(maestro);

      if (v.onda) {
        const osc = ctx.createOscillator();
        osc.type = v.onda;
        osc.frequency.setValueAtTime(v.desde * tono * desafine, t0);
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(20, v.hasta * tono * desafine),
          t1,
        );
        osc.connect(salida);
        osc.start(t0);
        osc.stop(t1);
      }

      if (v.ruido > 0 && ruidoBuffer) {
        const fuente = ctx.createBufferSource();
        fuente.buffer = ruidoBuffer;
        // Empezar en un punto al azar del buffer: si todos los golpes leen la
        // misma zona, todos suenan exactamente igual y se nota.
        const desplazamiento = Math.random() * (ruidoBuffer.duration - v.duracion);
        const filtro = ctx.createBiquadFilter();
        filtro.type = 'lowpass';
        filtro.frequency.setValueAtTime(v.corte * tono, t0);
        filtro.frequency.exponentialRampToValueAtTime(Math.max(120, v.corte * 0.3), t1);
        const gRuido = ctx.createGain();
        gRuido.gain.value = v.ruido;
        fuente.connect(filtro).connect(gRuido).connect(salida);
        fuente.start(t0, Math.max(0, desplazamiento), v.duracion);
      }
    },
  };
}
