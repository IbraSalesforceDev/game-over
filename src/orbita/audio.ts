/**
 * Sonido sintetizado con WebAudio: ni un fichero. El motor es ruido filtrado
 * cuyo volumen sigue al acelerador; el resto son golpes cortos.
 */
import type { Evento } from './juego';

export interface Audio {
  motor(fuerza: number): void;
  evento(e: Evento): void;
  volumen: number;
  activar(): void;
}

export function crearAudio(): Audio {
  let ctx: AudioContext | null = null;
  let maestro: GainNode | null = null;
  let motorGain: GainNode | null = null;
  let ruido: AudioBuffer | null = null;
  const ultimo = new Map<Evento, number>();
  const a: Audio = {
    volumen: 0.5,
    activar() {
      if (ctx) {
        void ctx.resume();
        return;
      }
      try {
        ctx = new AudioContext();
      } catch {
        return;
      }
      maestro = ctx.createGain();
      maestro.gain.value = a.volumen;
      maestro.connect(ctx.destination);
      ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = ruido.getChannelData(0);
      let ultimoR = 0;
      for (let i = 0; i < d.length; i++) {
        // Ruido marrón: más grave, suena a motor y no a radio.
        ultimoR = (ultimoR + (Math.random() * 2 - 1) * 0.02) / 1.02;
        d[i] = ultimoR * 3.5;
      }
      const src = ctx.createBufferSource();
      src.buffer = ruido;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 500;
      motorGain = ctx.createGain();
      motorGain.gain.value = 0;
      src.connect(f).connect(motorGain).connect(maestro);
      src.start();
    },
    motor(fuerza) {
      if (!ctx || !motorGain) return;
      motorGain.gain.setTargetAtTime(Math.min(1, fuerza) * 0.9, ctx.currentTime, 0.08);
      if (maestro) maestro.gain.value = a.volumen;
    },
    evento(e) {
      if (!ctx || !maestro || !ruido) return;
      const ahora = ctx.currentTime;
      const minimo = e === 'disparo' ? 0.05 : e === 'rayo' ? 0.12 : 0.04;
      if ((ultimo.get(e) ?? -1) > ahora - minimo) return;
      ultimo.set(e, ahora);
      const g = ctx.createGain();
      g.connect(maestro);
      const det = 1 + (Math.random() - 0.5) * 0.12;
      const tono = (tipo: OscillatorType, f0: number, f1: number, dur: number, vol: number) => {
        const o = ctx!.createOscillator();
        o.type = tipo;
        o.frequency.setValueAtTime(f0 * det, ahora);
        o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * det), ahora + dur);
        g.gain.setValueAtTime(vol, ahora);
        g.gain.exponentialRampToValueAtTime(0.001, ahora + dur);
        o.connect(g);
        o.start(ahora);
        o.stop(ahora + dur);
      };
      const golpe = (dur: number, vol: number, frec: number) => {
        const s = ctx!.createBufferSource();
        s.buffer = ruido;
        const f = ctx!.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(frec, ahora);
        f.frequency.exponentialRampToValueAtTime(60, ahora + dur);
        g.gain.setValueAtTime(vol, ahora);
        g.gain.exponentialRampToValueAtTime(0.001, ahora + dur);
        s.connect(f).connect(g);
        s.start(ahora, Math.random());
        s.stop(ahora + dur);
      };
      switch (e) {
        case 'disparo':
          tono('square', 420, 90, 0.07, 0.08);
          break;
        case 'misil':
          golpe(0.5, 0.5, 2500);
          break;
        case 'rayo':
          tono('sawtooth', 900, 1300, 0.12, 0.05);
          break;
        case 'impacto':
          tono('triangle', 200, 60, 0.1, 0.15);
          break;
        case 'explosion':
          golpe(1.4, 1.2, 1200);
          break;
        case 'alerta':
          tono('square', 880, 440, 0.5, 0.12);
          break;
        case 'etapa':
          golpe(0.25, 0.6, 3000);
          break;
        case 'aterriza':
          golpe(0.3, 0.5, 400);
          break;
        case 'venta':
          tono('sine', 880, 1760, 0.15, 0.12);
          break;
        case 'taladro':
          tono('sawtooth', 70, 60, 0.3, 0.05);
          break;
      }
    },
  };
  return a;
}
