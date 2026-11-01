import { useEffect, useRef, useState } from 'react';
import logoUrl from '../../assets/logo.png';
import { detenerScroll, reanudarScroll } from '../../lib/scroll';
import { prefiereMenosMovimiento } from '../../lib/utilidades';

/**
 * Logo de MCE formado por partículas en el espacio.
 *
 * 1. Las partículas vibran en ondas circulares (como el sonido sobre una
 *    superficie) alrededor del centro.
 * 2. Poco a poco, cada una viaja a su sitio y juntas dibujan el loto y las
 *    letras MCE.
 * 3. Una vez formado, el logo sigue "respirando": las partículas oscilan,
 *    salen ondas suaves del centro y se apartan al pasar el dedo o el ratón.
 *
 * `formar = false` → aparece ya formado (visitas posteriores en la sesión).
 * Con "reducir movimiento" se dibuja una sola vez, quieto.
 */

type Particula = {
  tx: number; ty: number; // destino (en el logo)
  ox: number; oy: number; // desplazamiento por el puntero
  anillo: number; angulo: number; retraso: number; fase: number;
  tam: number; color: string;
};

const ORO = ['#e8cf86', '#d4b25e', '#c4a24f', '#f2e2b0'];
const CREMA = '#f6eedb';

function suavizar(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function LogoParticulas({
  formar,
  duracion,
  alFormarse,
  className,
}: {
  formar: boolean;
  duracion: number;
  alFormarse?: () => void;
  className?: string;
}) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [saltado, setSaltado] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const saltar = useRef(false);

  useEffect(() => {
    const canvas = lienzo.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const quieto = prefiereMenosMovimiento();
    const movil = window.matchMedia('(max-width: 640px)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let ancho = 0;
    let alto = 0;
    let particulas: Particula[] = [];
    let estrellas: { x: number; y: number; r: number; f: number }[] = [];
    let cx = 0;
    let cy = 0;
    let radioBase = 0;
    let raf = 0;
    let visible = true;
    let avisado = false;
    const inicio = performance.now() - (formar && !quieto ? 0 : duracion * 1000 + 2000);
    const puntero = { x: -9999, y: -9999, activo: false };

    if (formar && !quieto) detenerScroll();
    const liberar = () => {
      if (avisado) return;
      avisado = true;
      setTerminado(true);
      reanudarScroll();
      alFormarse?.();
    };

    const imagen = new Image();
    imagen.src = logoUrl;

    function muestrear() {
      // Caja del logo: centrada, algo por encima de la mitad.
      // Limitado también por la altura, para que el lema de debajo nunca lo pise.
      const anchoLogo = Math.min(ancho * (movil ? 0.84 : 0.46), 560, ((alto * (movil ? 0.34 : 0.44)) * 557) / 414);
      const altoLogo = (anchoLogo * 414) / 557;
      cx = ancho / 2;
      cy = alto * (movil ? 0.4 : 0.37);
      radioBase = Math.min(ancho, alto);
      const off = document.createElement('canvas');
      off.width = Math.round(anchoLogo);
      off.height = Math.round(altoLogo);
      const o = off.getContext('2d', { willReadFrequently: true });
      if (!o) return;
      o.drawImage(imagen, 0, 0, off.width, off.height);
      const datos = o.getImageData(0, 0, off.width, off.height).data;
      const maximo = movil ? 1500 : 2800;
      let paso = Math.max(2, Math.round(anchoLogo / 210));
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
      // Submuestreo aleatorio si sobran (nunca en las letras, que necesitan densidad)
      const letras = puntos.filter((p) => p.letra);
      const trazos = puntos.filter((p) => !p.letra);
      while (trazos.length + letras.length > maximo && trazos.length > 0) trazos.splice(Math.floor(Math.random() * trazos.length), 1);
      puntos = [...trazos, ...letras];

      const x0 = cx - anchoLogo / 2;
      const y0 = cy - altoLogo / 2;
      const anillos = 7;
      particulas = puntos.map((p, i) => ({
        tx: x0 + p.x,
        ty: y0 + p.y,
        ox: 0,
        oy: 0,
        anillo: i % anillos,
        angulo: Math.random() * Math.PI * 2,
        retraso: Math.random() * 0.55,
        fase: Math.random() * Math.PI * 2,
        tam: (p.letra ? 2 : 1.25 + Math.random() * 0.9) * (movil ? 1.05 : 1),
        color: p.letra ? CREMA : ORO[i % ORO.length]!,
      }));
      estrellas = Array.from({ length: movil ? 90 : 170 }, () => ({
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

    function dibujar(ahora: number) {
      let t = (ahora - inicio) / 1000;
      if (saltar.current) t = Math.max(t, duracion + 1);
      const T1 = duracion * 0.3; // fin de la vibración sola
      const T2 = duracion; // logo formado
      const scroll = Math.min(1, window.scrollY / Math.max(1, alto));

      ctx!.clearRect(0, 0, ancho, alto);

      // estrellas que titilan
      for (const e of estrellas) {
        const a = quieto ? 0.5 : 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + e.f));
        ctx!.fillStyle = `rgba(246,238,219,${a})`;
        ctx!.fillRect(e.x, e.y - scroll * 40 * e.r, e.r, e.r);
      }

      // ondas que salen del centro (vibraciones), siempre suaves
      if (!quieto) {
        const periodo = 3.2;
        for (let k = 0; k < 3; k++) {
          const fase = ((t + k * (periodo / 3)) % periodo) / periodo;
          const r = radioBase * (0.08 + fase * 0.6);
          ctx!.beginPath();
          ctx!.arc(cx, cy, r, 0, Math.PI * 2);
          ctx!.strokeStyle = `rgba(212,178,94,${0.16 * (1 - fase) * (t > T2 ? 0.7 : 1)})`;
          ctx!.lineWidth = 1;
          ctx!.stroke();
        }
      }

      ctx!.globalCompositeOperation = 'lighter';
      const respira = 1 + 0.012 * Math.sin(t * 0.9);
      const dispersion = scroll * 0.45;
      for (const p of particulas) {
        // posición en la onda: anillos que vibran
        const rAnillo = radioBase * (0.1 + p.anillo * 0.055);
        const vib = Math.sin(p.angulo * 6 + t * 3.2 + p.anillo) * radioBase * 0.018;
        const giro = p.angulo + t * (0.12 + p.anillo * 0.015);
        const wx = cx + Math.cos(giro) * (rAnillo + vib);
        const wy = cy + Math.sin(giro) * (rAnillo + vib);

        // destino con respiración, oscilación propia y dispersión al hacer scroll
        let dx = cx + (p.tx - cx) * respira;
        let dy = cy + (p.ty - cy) * respira;
        if (!quieto) {
          dx += Math.sin(t * 1.4 + p.fase) * 0.8 + (p.tx - cx) * dispersion * (0.6 + Math.sin(p.fase) * 0.4);
          dy += Math.cos(t * 1.2 + p.fase) * 0.8 + (p.ty - cy) * dispersion * (0.6 + Math.cos(p.fase) * 0.4) - dispersion * 60;
        }

        // el puntero aparta las partículas cercanas
        if (puntero.activo && t > T2) {
          const ddx = dx + p.ox - puntero.x;
          const ddy = dy + p.oy - puntero.y;
          const d2 = ddx * ddx + ddy * ddy;
          const radio = 70;
          if (d2 < radio * radio) {
            const d = Math.sqrt(d2) || 1;
            const fuerza = (1 - d / radio) * 22;
            p.ox += ((ddx / d) * fuerza - p.ox) * 0.2;
            p.oy += ((ddy / d) * fuerza - p.oy) * 0.2;
          }
        }
        p.ox *= 0.94;
        p.oy *= 0.94;

        let x: number;
        let y: number;
        let alfa = 1;
        if (t < T1) {
          x = wx;
          y = wy;
          alfa = Math.min(1, t / (T1 * 0.6));
        } else {
          const k = suavizar(Math.min(1, Math.max(0, (t - T1 - p.retraso) / (T2 - T1 - 0.55))));
          x = wx + (dx - wx) * k + p.ox;
          y = wy + (dy - wy) * k + p.oy;
        }
        ctx!.globalAlpha = alfa * (1 - scroll * 0.55);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(x - p.tam / 2, y - p.tam / 2, p.tam, p.tam);
      }
      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = 'source-over';

      if (t >= T2) liberar();
      if (!quieto && visible) raf = requestAnimationFrame(dibujar);
    }

    const alCargar = () => {
      redimensionar();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(dibujar);
    };
    if (imagen.complete && imagen.naturalWidth) alCargar();
    else imagen.onload = alCargar;

    const ro = new ResizeObserver(() => {
      redimensionar();
      if (quieto) requestAnimationFrame(dibujar);
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(([e]) => {
      const antes = visible;
      visible = Boolean(e?.isIntersecting);
      if (visible && !antes && !quieto) raf = requestAnimationFrame(dibujar);
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
      liberar();
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
          className="absolute bottom-6 right-6 z-10 rounded-full px-4 py-2 text-sm text-marfil/60 transition-colors duration-200 hover:text-marfil"
        >
          Saltar animación
        </button>
      )}
    </>
  );
}
