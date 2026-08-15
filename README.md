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
- ✅ **Fase 3** — Generación de mundo
- ✅ **Fase 4** — Guardado y carga
- ⬜ **Fase 5** — Iluminación y ciclo día-noche

Cada partida genera un mundo nuevo a partir de una semilla: relieve por ruido
fractal, capa de tierra, subsuelo de piedra con grietas sueltas, caverna con
salas grandes y galerías, cuatro minerales repartidos por profundidad y bosques
con claros en la superficie. Un mundo de 1400×450 tarda unos 140 ms en
generarse.

Las partidas se guardan en el navegador (IndexedDB). El juego arranca en un
menú donde se crean, cargan y borran mundos; guarda solo cada 30 segundos y al
ocultarse la pestaña, y con `F2` a mano. Un mundo de 1400×450 ocupa unos 24 KB
gracias al RLE más deflate.

Todo el guardado pasa por la interfaz `SaveAdapter` (`src/world/almacen.ts`) y
el mundo se serializa a un `Uint8Array` opaco. Ese es el punto: llevarse las
partidas a la nube es escribir un adaptador nuevo, no tocar el motor.

### Parámetros de URL

| Parámetro | Efecto |
|---|---|
| `?semilla=LOQUESEA` | Genera siempre el mismo mundo |
| `?tam=mediano` | Mundo de 2100×600 en vez de 1400×450 |
| `?lab=1` | Abre el laboratorio de físicas de la fase 1 en vez de un mundo |

El laboratorio sigue ahí a propósito: es donde se afinan las constantes de
movimiento con `F4`, y es más rápido comprobar una regla de la física en un
tramo hecho a mano que buscando el terreno adecuado en un mundo generado.

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
| `F2` | Guardar ahora |
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
npm test         # tests de físicas, cámara, mundo, edición y generación
npm run build    # comprobación de tipos + build de producción a dist/
```

Para mirar un mundo entero de un vistazo (relieve, cuevas, vetas y punto de
aparición) hay un volcado a PNG:

```bash
MAPA_SALIDA=/tmp/mapa.png MAPA_SEMILLA=LOQUESEA npx vitest run tests/_mapa.test.ts
```

## Stack

Vite + TypeScript · Canvas2D · vitest · Vercel (estático, `dist/`)

Sin dependencias de motor ni un solo PNG: los tiles y el personaje se dibujan
por código al arrancar.
