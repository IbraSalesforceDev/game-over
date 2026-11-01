import { useEffect, useRef, useState, type RefObject } from 'react';
import logoUrl from '../../assets/logo.png';
import { detenerScroll, reanudarScroll } from '../../lib/scroll';
import { fijarIntroActiva } from '../../lib/transicion';
import { prefiereMenosMovimiento } from '../../lib/utilidades';

/**
 * Logo de MCE formado por partículas en el espacio.
 *
 * 1. Las partículas vibran en ondas circulares alrededor del centro.
 * 2. Cada una viaja a su sitio y juntas dibujan el loto y las letras MCE.
 * 3. Ya formado, el logo "respira": las partículas oscilan, salen ondas
 *    suaves del centro y se apartan al pasar el dedo o el ratón.
 *
 * El logo se ajusta al hueco de `zona` (el espacio libre entre la cabecera y
 * el lema), así nunca se monta sobre el texto.
 * `formar = false` → aparece ya formado. Con "reducir movimiento" se dibuja
 * una sola vez, quieto.
 */

type Particula = {
  tx: number; ty: number;
  ox: number; oy: number;
  anillo: number; angulo: number; retraso: number; fase: number;
  tam: number; color: number;
};

const COLORES = ['#e8cf86', '#d4b25e', '#c4a24f', '#f2e2b0', '#f8f1df'];
const CREMA = 4; // índice del color de las letras

function suavizar(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Punto redondo pre-dibujado (más bonito y más rápido que arc() por partícula). */
function sprite(color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(8, 8, 0, 8, 8, 8);
  g.addColorStop(0, color);
  g.addColorStop(0.55, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 16, 16);
  return c;
}

export default function LogoParticulas({
  formar,
  duracion,
  zona,
  alFormarse,
  className,
}: {
  formar: boolean;
  duracion: number;
  zona: RefObject<HTMLElement | null>;
  alFormarse?: () => void;
  className?: string;
}) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [saltado, setSaltado] = useState(false);
  const [terminado, setTerminado] = useState(!formar);
  const saltar = useRef(false);

  useEffect(() => {
    const canvas = lienzo.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const quieto = prefiereMenosMovimiento();
    const animarFormacion = formar && !quieto;
    const movil = window.matchMedia('(max-width: 640px)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const sprites = COLORES.map(sprite);
    let ancho = 0;
    let alto = 0;
    let grupos: Particula[][] = COLORES.map(() => []);
    let estrellas: { x: number; y: number; r: number; f: number }[] = [];
    let cx = 0;
    let cy = 0;
    let radioBase = 0;
    let raf = 0;
    let visible = true;
    let avisado = !animarFormacion;
    let ultimo = 0;
    let sinParticulas: { x: number; y: number; w: number; h: number } | null = null;
    const inicio = performance.now() - (animarFormacion ? 0 : duracion * 1000 + 2000);
    const puntero = { x: -9999, y: -9999, activo: false };

    // Bloqueo del scroll mientras se forma (también el nativo, por si acaso).
    const raiz = document.documentElement;
    const overflowPrevio = raiz.style.overflow;
    if (animarFormacion) {
      detenerScroll();
      raiz.style.overflow = 'hidden';
      fijarIntroActiva(true);
    }
    const desbloquear = () => {
      raiz.style.overflow = overflowPrevio;
      reanudarScroll();
      fijarIntroActiva(false);
    };
    const liberar = () => {
      if (avisado) return;
      avisado = true;
      desbloquear();
      setTerminado(true);
      alFormarse?.();
    };

    const imagen = new Image();
    imagen.src = logoUrl;

    function muestrear() {
      // Hueco disponible: la `zona`, en coordenadas del lienzo.
      const rc = canvas!.getBoundingClientRect();
      const rz = zona.current?.getBoundingClientRect();
      const zx = rz ? rz.left - rc.left : 0;
      const zy = rz ? rz.top - rc.top : 0;
      const zw = rz ? rz.width : ancho;
      const zh = rz ? rz.height : alto;
      const anchoLogo = Math.max(60, Math.min(zw * (movil ? 0.86 : 0.7), 560, ((zh * 0.92) * 557) / 414));
      const altoLogo = (anchoLogo * 414) / 557;
      cx = zx + zw / 2;
      cy = zy + zh / 2;
      radioBase = Math.max(anchoLogo * 1.1, Math.min(ancho, alto) * 0.6);

      const off = document.createElement('canvas');
      off.width = Math.round(anchoLogo);
      off.height = Math.round(altoLogo);
      const o = off.getContext('2d', { willReadFrequently: true });
      if (!o) return;
      o.drawImage(imagen, 0, 0, off.width, off.height);
      let datos: Uint8ClampedArray;
      try {
        datos = o.getImageData(0, 0, off.width, off.height).data;
      } catch {
        // El navegador no deja leer los píxeles (p. ej. archivo abierto desde el disco
        // con la imagen fuera del HTML): se dibuja el logo tal cual, sin partículas.
        sinParticulas = { x: cx - anchoLogo / 2, y: cy - altoLogo / 2, w: anchoLogo, h: altoLogo };
        grupos = COLORES.map(() => []);
        return;
      }
      const maximo = movil ? 1300 : 2400;
      let paso = Math.max(2, Math.round(anchoLogo / 220));
      let puntos: { x: number; y: number; letra: boolean }[] = [];
      for (;;) {
        puntos = [];
        for (let y = 0; y < off.height; y += paso) {
          for (let x = 0; x < off.width; x += paso) {
            const i = (y * off.width + x) * 4;
            if (datos[i + 3]! > 110) {
              const lum = 0.3 * datos[i]! + 0.59 * datos[i + 1]! + 0.11 * datos[i + 2]!;
              puntos.push({ x, y, letra: lum < 80 });
            }
          }
        }
        if (puntos.length <= maximo * 1.6 || paso > 8) break;
        paso++;
      }
      // Submuestreo aleatorio de los trazos si sobran (las letras se conservan).
      const letras = puntos.filter((p) => p.letra);
      const trazos = puntos.filter((p) => !p.letra);
      while (trazos.length + letras.length > maximo && trazos.length > 0) trazos.splice(Math.floor(Math.random() * trazos.length), 1);

      const x0 = cx - anchoLogo / 2;
      const y0 = cy - altoLogo / 2;
      const escalaPunto = Math.max(0.8, Math.min(1.25, anchoLogo / 420));
      grupos = COLORES.map(() => []);
      [...trazos, ...letras].forEach((p, i) => {
        const color = p.letra ? CREMA : i % (COLORES.length - 1);
        grupos[color]!.push({
          tx: x0 + p.x,
          ty: y0 + p.y,
          ox: 0,
          oy: 0,
          anillo: i % 7,
          angulo: Math.random() * Math.PI * 2,
          retraso: Math.random() * 0.55,
          fase: Math.random() * Math.PI * 2,
          tam: (p.letra ? 3.2 : 2.4 + Math.random() * 1.6) * escalaPunto,
          color,
        });
      });
      estrellas = Array.from({ length: movil ? 80 : 150 }, () => ({
        x: Math.random() * ancho,
        y: Math.random() * alto,
        r: Math.random() * 1.1 + 0.2,
        f: Math.random() * Math.PI * 2,
      }));
    }

    function redimensionar() {
      const r = canvas!.getBoundingClientRect();
      ancho = r.width;
      alto = r.height;
      canvas!.width = Math.round(ancho * dpr);
      canvas!.height = Math.round(alto * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (imagen.complete && imagen.naturalWidth) muestrear();
    }

    function programar() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(dibujar);
    }

    function dibujar(ahora: number) {
      let t = (ahora - inicio) / 1000;
      if (saltar.current) t = Math.max(t, duracion + 1);
      const T1 = duracion * 0.3; // fin de la vibración sola
      const T2 = duracion; // logo formado

      // Ya formado: basta con ~30 fps para el movimiento suave (ahorra batería).
      if (!quieto && t > T2 + 0.5 && ahora - ultimo < 32) {
        if (visible) raf = requestAnimationFrame(dibujar);
        return;
      }
      ultimo = ahora;
      const scroll = Math.min(1, window.scrollY / Math.max(1, alto));

      ctx!.clearRect(0, 0, ancho, alto);

      // estrellas que titilan
      ctx!.fillStyle = '#f6eedb';
      for (const e of estrellas) {
        ctx!.globalAlpha = quieto ? 0.5 : 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + e.f));
        ctx!.fillRect(e.x, e.y - scroll * 40 * e.r, e.r, e.r);
      }
      ctx!.globalAlpha = 1;

      // ondas que salen del centro (vibraciones)
      if (!quieto) {
        const periodo = 3.2;
        ctx!.lineWidth = 1;
        for (let k = 0; k < 3; k++) {
          const fase = ((t + k * (periodo / 3)) % periodo) / periodo;
          ctx!.beginPath();
          ctx!.arc(cx, cy, radioBase * (0.12 + fase * 0.55), 0, Math.PI * 2);
          ctx!.strokeStyle = `rgba(212,178,94,${0.16 * (1 - fase) * (t > T2 ? 0.7 : 1)})`;
          ctx!.stroke();
        }
      }

      if (sinParticulas) {
        const { x, y, w, h } = sinParticulas;
        ctx!.globalAlpha = Math.min(1, t / 1.2);
        ctx!.drawImage(imagen, x, y, w, h);
        ctx!.globalAlpha = 1;
      }

      const respira = 1 + 0.012 * Math.sin(t * 0.9);
      const dispersion = scroll * 0.45;
      const opacidadGlobal = 1 - scroll * 0.55;
      for (let g = 0; g < grupos.length; g++) {
        const img = sprites[g]!;
        for (const p of grupos[g]!) {
          const rAnillo = radioBase * (0.14 + p.anillo * 0.06);
          const vib = Math.sin(p.angulo * 6 + t * 3.2 + p.anillo) * radioBase * 0.02;
          const giro = p.angulo + t * (0.12 + p.anillo * 0.015);
          const wx = cx + Math.cos(giro) * (rAnillo + vib);
          const wy = cy + Math.sin(giro) * (rAnillo + vib);

          let dx = cx + (p.tx - cx) * respira;
          let dy = cy + (p.ty - cy) * respira;
          if (!quieto) {
            dx += Math.sin(t * 1.4 + p.fase) * 0.8 + (p.tx - cx) * dispersion * (0.6 + Math.sin(p.fase) * 0.4);
            dy += Math.cos(t * 1.2 + p.fase) * 0.8 + (p.ty - cy) * dispersion * (0.6 + Math.cos(p.fase) * 0.4) - dispersion * 60;
          }

          if (puntero.activo && t > T2) {
            const ddx = dx + p.ox - puntero.x;
            const ddy = dy + p.oy - puntero.y;
            const d2 = ddx * ddx + ddy * ddy;
            if (d2 < 4900) {
              const d = Math.sqrt(d2) || 1;
              const fuerza = (1 - d / 70) * 22;
              p.ox += ((ddx / d) * fuerza - p.ox) * 0.2;
              p.oy += ((ddy / d) * fuerza - p.oy) * 0.2;
            }
          }
          p.ox *= 0.94;
          p.oy *= 0.94;

          let x: number;
          let y: number;
          let alfa = opacidadGlobal;
          if (t < T1) {
            x = wx;
            y = wy;
            alfa *= Math.min(1, t / (T1 * 0.6));
          } else {
            const k = suavizar(Math.min(1, Math.max(0, (t - T1 - p.retraso) / (T2 - T1 - 0.55))));
            x = wx + (dx - wx) * k + p.ox;
            y = wy + (dy - wy) * k + p.oy;
          }
          ctx!.globalAlpha = alfa;
          ctx!.drawImage(img, x - p.tam / 2, y - p.tam / 2, p.tam, p.tam);
        }
      }
      ctx!.globalAlpha = 1;

      if (t >= T2) liberar();
      if (!quieto && visible) raf = requestAnimationFrame(dibujar);
    }

    const alCargar = () => {
      redimensionar();
      programar();
    };
    if (imagen.complete && imagen.naturalWidth) alCargar();
    else imagen.onload = alCargar;

    const ro = new ResizeObserver(() => {
      redimensionar();
      if (quieto) programar();
    });
    ro.observe(canvas);
    if (zona.current) ro.observe(zona.current);

    const io = new IntersectionObserver(([e]) => {
      const antes = visible;
      visible = Boolean(e?.isIntersecting);
      if (visible && !antes && !quieto) programar();
    });
    io.observe(canvas);

    const mover = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      puntero.x = e.clientX - r.left;
      puntero.y = e.clientY - r.top;
      puntero.activo = true;
    };
    const salir = () => {
      puntero.activo = false;
    };
    canvas.addEventListener('pointermove', mover);
    canvas.addEventListener('pointerdown', mover);
    canvas.addEventListener('pointerleave', salir);
    canvas.addEventListener('pointerup', salir);

    // Seguro: nunca dejar el scroll bloqueado
    const seguro = window.setTimeout(liberar, (duracion + 1.5) * 1000);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.clearTimeout(seguro);
      canvas.removeEventListener('pointermove', mover);
      canvas.removeEventListener('pointerdown', mover);
      canvas.removeEventListener('pointerleave', salir);
      canvas.removeEventListener('pointerup', salir);
      // Al desmontar solo se libera el scroll (no se da por "formado").
      if (!avisado) desbloquear();
    };
    // Solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <canvas ref={lienzo} aria-hidden className={className} style={{ touchAction: 'pan-y' }} />
      {formar && !saltado && !terminado && (
        <button
          type="button"
          onClick={() => {
            saltar.current = true;
            setSaltado(true);
          }}
          className="absolute bottom-5 right-5 z-10 rounded-full px-4 py-2 text-sm text-marfil/70 transition-colors duration-200 hover:text-marfil"
        >
          Saltar animación
        </button>
      )}
    </>
  );
}
