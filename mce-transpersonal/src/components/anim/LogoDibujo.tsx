import { useEffect, useRef, useState } from 'react';
import logoUrl from '../../assets/logo.png';
import { detenerScroll, reanudarScroll } from '../../lib/scroll';
import { fijarIntroActiva } from '../../lib/transicion';
import { cx, prefiereMenosMovimiento } from '../../lib/utilidades';

/**
 * El logo de MCE se dibuja trazo a trazo al cargar.
 *
 * Cómo: a cada píxel del logo original se le asigna un "momento" según su
 * distancia, recorriendo el propio trazo, desde el centro del loto. Así el
 * dibujo avanza por las líneas como si se trazara con un pincel. Las letras
 * MCE se escriben al final, de izquierda a derecha. Lo que aparece es siempre
 * el logo real, con sus colores, sin recolorear.
 *
 * `dibujar = false` → aparece ya completo. Con "reducir movimiento", también.
 */
export default function LogoDibujo({
  dibujar,
  duracion,
  alTerminar,
  className,
}: {
  dibujar: boolean;
  duracion: number;
  alTerminar?: () => void;
  className?: string;
}) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const saltar = useRef(false);
  const [terminado, setTerminado] = useState(!dibujar);
  const [saltado, setSaltado] = useState(false);

  useEffect(() => {
    const canvas = lienzo.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    const animar = dibujar && !prefiereMenosMovimiento();
    let raf = 0;
    let avisado = !animar;

    const raiz = document.documentElement;
    const overflowPrevio = raiz.style.overflow;
    if (animar) {
      detenerScroll();
      raiz.style.overflow = 'hidden';
      fijarIntroActiva(true);
    }
    const desbloquear = () => {
      raiz.style.overflow = overflowPrevio;
      reanudarScroll();
      fijarIntroActiva(false);
    };
    const terminar = () => {
      if (avisado) return;
      avisado = true;
      desbloquear();
      setTerminado(true);
      alTerminar?.();
    };

    const img = new Image();
    img.src = logoUrl;
    img.onload = () => {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      canvas.width = W;
      canvas.height = H;
      ctx.drawImage(img, 0, 0);
      if (!animar) return;

      let fuente: ImageData;
      try {
        fuente = ctx.getImageData(0, 0, W, H);
      } catch {
        // No se pueden leer los píxeles: el logo se queda tal cual.
        terminar();
        return;
      }
      ctx.clearRect(0, 0, W, H);
      const src = fuente.data;
      const salida = ctx.createImageData(W, H);
      const out = salida.data;
      const N = W * H;

      // 1. Clasificar píxeles: trazo dorado o letra. Primero se busca la caja de
      //    las letras (píxeles oscuros); todo lo que cae dentro (incluido su borde
      //    suavizado, que es más claro) cuenta como letra.
      const tipo = new Uint8Array(N); // 0 vacío, 1 trazo, 2 letra
      let lx0 = W, lx1 = 0, ly0 = H, ly1 = 0;
      for (let i = 0; i < N; i++) {
        const a = src[i * 4 + 3]!;
        if (a < 60) continue;
        const lum = 0.3 * src[i * 4]! + 0.59 * src[i * 4 + 1]! + 0.11 * src[i * 4 + 2]!;
        if (lum < 95) {
          const x = i % W;
          const y = (i / W) | 0;
          if (x < lx0) lx0 = x;
          if (x > lx1) lx1 = x;
          if (y < ly0) ly0 = y;
          if (y > ly1) ly1 = y;
        }
      }
      for (let i = 0; i < N; i++) {
        if (src[i * 4 + 3]! < 8) continue;
        const x = i % W;
        const y = (i / W) | 0;
        tipo[i] = x >= lx0 - 3 && x <= lx1 + 3 && y >= ly0 - 3 && y <= ly1 + 3 ? 2 : 1;
      }

      // 2. Distancia por el trazo desde el centro del loto (BFS por componentes)
      const dist = new Float32Array(N).fill(-1);
      const cola = new Int32Array(N);
      const sx = W * 0.47;
      const sy = H * 0.6;
      const pendientes: number[] = [];
      for (let i = 0; i < N; i++) if (tipo[i] === 1) pendientes.push(i);
      pendientes.sort((a, b) => {
        const da = (a % W - sx) ** 2 + (((a / W) | 0) - sy) ** 2;
        const db = (b % W - sx) ** 2 + (((b / W) | 0) - sy) ** 2;
        return da - db;
      });
      let maxD = 1;
      for (const semilla of pendientes) {
        if (dist[semilla]! >= 0) continue;
        const ex = semilla % W - sx;
        const ey = ((semilla / W) | 0) - sy;
        dist[semilla] = Math.sqrt(ex * ex + ey * ey) * 0.6;
        let ini = 0;
        let fin = 0;
        cola[fin++] = semilla;
        while (ini < fin) {
          const i = cola[ini++]!;
          const x = i % W;
          const y = (i / W) | 0;
          const d = dist[i]!;
          if (d > maxD) maxD = d;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
              const j = ny * W + nx;
              if (tipo[j] !== 1 || dist[j]! >= 0) continue;
              dist[j] = d + (dx && dy ? 1.414 : 1);
              cola[fin++] = j;
            }
          }
        }
      }

      // 3. Orden de aparición: trazos (0 → 1) y luego letras (1 → 1.3)
      const orden: { i: number; t: number }[] = [];
      for (let i = 0; i < N; i++) {
        if (tipo[i] === 1) orden.push({ i, t: dist[i]! / maxD });
        else if (tipo[i] === 2) orden.push({ i, t: 1 + ((i % W - lx0) / Math.max(1, lx1 - lx0)) * 0.3 });
      }
      orden.sort((a, b) => a.t - b.t);
      const tiempos = Float32Array.from(orden, (o) => o.t);
      const indices = Int32Array.from(orden, (o) => o.i);

      let cursor = 0;
      const inicio = performance.now();
      const fase = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

      const cuadro = (ahora: number) => {
        const p = saltar.current ? 1 : Math.min(1, (ahora - inicio) / (duracion * 1000));
        const limite = fase(p) * 1.3;
        while (cursor < indices.length && tiempos[cursor]! <= limite) {
          const k = indices[cursor]! * 4;
          out[k] = src[k]!;
          out[k + 1] = src[k + 1]!;
          out[k + 2] = src[k + 2]!;
          out[k + 3] = src[k + 3]!;
          cursor++;
        }
        ctx.putImageData(salida, 0, 0);
        // Chispa en el frente del trazo
        if (p < 1 && cursor > 0 && cursor < indices.length) {
          const i = indices[Math.max(0, cursor - 1)]!;
          const x = i % W;
          const y = (i / W) | 0;
          const g = ctx.createRadialGradient(x, y, 0, x, y, 14);
          g.addColorStop(0, 'rgba(255,244,214,0.95)');
          g.addColorStop(0.4, 'rgba(214,186,110,0.5)');
          g.addColorStop(1, 'rgba(214,186,110,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, 14, 0, Math.PI * 2);
          ctx.fill();
        }
        if (p < 1) raf = requestAnimationFrame(cuadro);
        else {
          ctx.clearRect(0, 0, W, H);
          ctx.drawImage(img, 0, 0);
          terminar();
        }
      };
      raf = requestAnimationFrame(cuadro);
    };

    const seguro = window.setTimeout(terminar, (duracion + 2) * 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(seguro);
      if (!avisado) desbloquear();
    };
    // Solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <canvas ref={lienzo} role="img" aria-label="Logo de MCE: un loto dorado con las letras MCE" className={cx('object-contain', className)} />
      {dibujar && !terminado && !saltado && (
        <button
          type="button"
          onClick={() => {
            saltar.current = true;
            setSaltado(true);
          }}
          className="fixed bottom-5 right-5 z-[60] rounded-full border border-carbon/15 bg-marfil/80 px-4 py-2 text-sm text-carbon-suave backdrop-blur transition-colors duration-200 hover:text-carbon"
        >
          Saltar animación
        </button>
      )}
    </>
  );
}
