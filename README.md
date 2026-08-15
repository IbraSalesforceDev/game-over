# game-over

Juego sandbox 2D de tiles inspirado en Terraria: físicas de plataformas, minar y
construir, generación de mundo con cuevas y minerales, iluminación, inventario y
crafteo. Web, sin backend, desplegado en Vercel.

Se construye por fases, cada una jugable y desplegable por separado.

📋 **[Hoja de ruta por fases → `docs/ROADMAP.md`](docs/ROADMAP.md)**

## Estado

- ✅ **Fase 0** — Andamiaje y despliegue
- ✅ **Fase 1** — Laboratorio de físicas
- ✅ **Fase 2** — Minar y construir
- ⬜ **Fase 3** — Generación de mundo

Ahora mismo el escenario es un banco de pruebas: un nivel hecho a mano con diez
tramos, cada uno para verificar una regla concreta de la física (escalones,
techos bajos, un pozo para alcanzar la velocidad terminal, plataformas de una
dirección, pasillos justos de alto...), y encima ya se puede excavar y
construir sobre las dos capas, bloques y paredes.

## Controles

| Tecla | Acción |
|---|---|
| `A` `D` o `←` `→` | Moverse |
| `W`, `↑` o `Espacio` | Saltar (mantener = salto más alto) |
| `S` o `↓` + salto | Bajar por una plataforma |
| Clic izquierdo | Minar (mantener; la dureza marca lo que tarda) |
| Clic derecho | Colocar el material seleccionado |
| `1`–`5` o rueda | Elegir material |
| `Tab` | Alternar capa bloque / pared |
| `R` | Volver al punto de aparición |
| `F3` | Overlay de diagnóstico |
| `F4` | Panel de constantes de física |
| `F5` | Rejilla de chunks |

Construir tiene reglas: un bloque necesita apoyo (un vecino o una pared detrás),
no se puede colocar un macizo dentro del propio jugador, y todo ocurre dentro
de un alcance de 5,5 tiles. El recuadro del puntero se pone rojo cuando la
acción no es posible.

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
