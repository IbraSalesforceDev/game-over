# game-over

Juego sandbox 2D de tiles inspirado en Terraria: físicas de plataformas, minar y
construir, generación de mundo con cuevas y minerales, iluminación, inventario y
crafteo. Web, sin backend, desplegado en Vercel.

Se construye por fases, cada una jugable y desplegable por separado.

📋 **[Hoja de ruta por fases → `docs/ROADMAP.md`](docs/ROADMAP.md)**

## Estado

- ✅ **Fase 0** — Andamiaje y despliegue
- ✅ **Fase 1** — Laboratorio de físicas
- ⬜ **Fase 2** — Minar y construir

Ahora mismo el juego es un banco de pruebas: un nivel hecho a mano con diez
tramos, cada uno para verificar una regla concreta de la física (escalones,
techos bajos, un pozo para alcanzar la velocidad terminal, plataformas de una
dirección, pasillos justos de alto...). La idea es afinar el "feel" del
movimiento antes de construir nada encima.

## Controles

| Tecla | Acción |
|---|---|
| `A` `D` o `←` `→` | Moverse |
| `W`, `↑` o `Espacio` | Saltar (mantener = salto más alto) |
| `S` o `↓` + salto | Bajar por una plataforma |
| `R` | Volver al punto de aparición |
| `F3` | Overlay de diagnóstico |
| `F4` | Panel de constantes de física |
| `F5` | Rejilla de chunks |

El panel `F4` permite tocar en caliente la gravedad, el salto, la fricción y
todo lo demás; el botón **Copiar** vuelca el ajuste para pegarlo en
`src/entities/physics.ts`.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm test         # tests de físicas, cámara y mundo
npm run build    # comprobación de tipos + build de producción a dist/
```

## Stack

Vite + TypeScript · Canvas2D · vitest · Vercel (estático, `dist/`)

Sin dependencias de motor ni un solo PNG: los tiles y el personaje se dibujan
por código al arrancar.
