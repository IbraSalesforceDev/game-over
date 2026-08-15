# Plan de trabajo — Juego sandbox 2D estilo Terraria

## Contexto

El repo `IbraSalesforceDev/game-over` está vacío (solo un `README.md` de una línea, un commit, rama `claude/terraria-game-plan-4ib6ix`). El objetivo es construir un juego sandbox 2D de tiles inspirado en Terraria, desplegado en Vercel como el resto de tus juegos (`green-war-nostalgy`, `random-game-me`, etc.: SPAs estáticas Vite + TypeScript, canvas a pantalla completa, UI en español, pantalla de carga y panel de error).

No se implementa todo de golpe: este documento es la **hoja de ruta por fases**. Cada fase se despliega y se juega. La fase 1 es minúscula a propósito — un laboratorio de físicas — porque el "feel" del movimiento es lo que define un Terraria y hay que afinarlo antes de construir nada encima.

## Decisiones ya tomadas

| Decisión | Elección |
|---|---|
| Alcance final | Núcleo sandbox sólido: físicas, minar/construir, worldgen con cuevas y minerales, iluminación, inventario/crafteo, día-noche, enemigos básicos, guardado. **Sin** jefes ni NPCs con casas |
| Gráficos | Pixel art **procedural por código** (tiles y sprites generados en carga con canvas + ruido). Cero assets externos; sustituibles por PNG más adelante |
| Guardado | `localStorage`/IndexedDB ahora, detrás de una interfaz `SaveAdapter` para poder mover a Supabase después |
| Móvil | Escritorio primero (teclado + ratón). La capa de input se abstrae desde la fase 1; los controles táctiles llegan en fase tardía |

### Sobre migrar el guardado a Supabase más adelante

Sí, es buena idea y es barato **si se prepara ahora**. La clave es que el mundo se serialice a un `Uint8Array` comprimido y que todo el acceso pase por:

```ts
interface SaveAdapter {
  list(): Promise<WorldMeta[]>;
  load(id: string): Promise<Uint8Array>;
  save(id: string, meta: WorldMeta, data: Uint8Array): Promise<void>;
  delete(id: string): Promise<void>;
}
```

Con eso, `LocalSaveAdapter` (IndexedDB) y un futuro `SupabaseSaveAdapter` (Supabase Storage para el blob + una tabla `worlds` para los metadatos, con RLS por `user_id`) son intercambiables. Lo único que Supabase añade es login y estado de red — el motor no se entera. Coste real de la migración: ~1 fase corta. Coste de *no* prepararlo: reescribir el guardado entero.

## Stack técnico

- **Vite + TypeScript**, sin framework de UI. Salida estática (`dist/`), igual que tus otros proyectos.
- **Renderer: Canvas2D con caché por chunk en `OffscreenCanvas`.** Cada chunk (64×64 tiles) se dibuja una vez a su propio canvas y se invalida solo cuando cambia un tile; el frame es un puñado de `drawImage`. Esto aguanta 60fps de sobra para lo que necesitamos y evita meter una dependencia de render (Pixi/WebGL) antes de tiempo.
  - *Ruta de escape*: si más adelante hace falta WebGL (muchísimas partículas, iluminación por shader), el cambio queda confinado a `src/render/`, porque el mundo y las físicas no conocen el renderer.
- **Iluminación**: buffer de 1 px por tile escalado con suavizado, dibujado en `globalCompositeOperation = 'multiply'`. Es el truco clásico y da luz suave casi gratis.
- **Dependencias**: mínimas. `vitest` para tests de funciones puras. Nada de motor de juego.

## Arquitectura

```
src/
  main.ts              arranque, pantalla de carga, captura de errores
  engine/
    loop.ts            bucle de paso fijo (60 Hz) + acumulador
    input.ts           teclado/ratón -> acciones abstractas (táctil se enchufa aquí)
    time.ts            reloj del juego, ciclo día-noche
  world/
    tiles.ts           catálogo de tiles (dureza, sólido, plataforma, luz emitida)
    world.ts           datos del mundo en TypedArrays + chunks
    chunk.ts           64x64, dirty flags
    gen/               generación: relieve, cuevas, minerales, biomas
    lighting.ts        propagación de luz
    save.ts            serialización + SaveAdapter
  entities/
    player.ts          estado del jugador
    physics.ts         integración + colisión AABB contra rejilla  <- corazón del juego
    enemy.ts           IA
  render/
    renderer.ts        cámara, capas, orden de dibujo
    chunkCache.ts      caché de chunks en OffscreenCanvas
    tileset.ts         generación procedural de texturas
    lightRender.ts
    debug.ts           overlay: FPS, pos, vel, hitboxes, bordes de chunk, luz
  ui/                  hotbar, inventario, menús (DOM sobre el canvas)
```

**Bucle**: paso fijo de 1/60 s con acumulador e interpolación en el render. Las físicas nunca dependen del framerate real.

**Modelo de datos** — TypedArrays paralelos, no objetos por tile:

```ts
tileId:  Uint16Array   // bloque delantero (0 = aire)
wallId:  Uint16Array   // pared de fondo
liquid:  Uint8Array    // 0-255 nivel de líquido
flags:   Uint8Array    // tipo de líquido, plataforma, orientación...
light:   Uint8Array    // nivel de luz calculado
frame:   Uint8Array    // índice de auto-tiling (bitmask de vecinos)
```

**Sin ECS.** Clases planas + arrays. El número de entidades vivas es pequeño; un ECS aquí es complejidad sin retorno.

**Coordenadas**: tres espacios, siempre explícitos en los nombres — `tx/ty` (tiles), `wx/wy` (píxeles de mundo, floats), `sx/sy` (pantalla). Conversión centralizada en la cámara.

## Especificación de físicas

Colisión **AABB contra rejilla de tiles, resuelta por ejes separados** (primero X, luego Y), consultando solo los tiles que solapan la caja. Nada de motor de física genérico.

Hitbox del jugador: **20 × 42 px** (1,25 × 2,6 tiles), como en Terraria. Tile = 16 px.

Constantes de partida (por tick de 1/60 s, afinables en un panel de debug):

| Parámetro | Valor inicial | En unidades/s |
|---|---|---|
| Gravedad | 0,40 px/tick² | 1440 px/s² |
| Velocidad terminal de caída | 10 px/tick | 600 px/s (37,5 tiles/s) |
| Aceleración al correr | 0,08 px/tick² | — |
| Velocidad máxima al correr | 3,0 px/tick | 180 px/s (11,25 tiles/s) |
| Fricción en suelo | 0,20 px/tick² | — |
| Control en aire | 60 % de la aceleración de suelo | — |
| Impulso de salto | −5,01 px/tick | — |
| Salto sostenido (altura variable) | 15 ticks manteniendo pulsado | ~5,5 tiles de altura |
| Coyote time | 6 ticks | 100 ms |
| Buffer de salto | 6 ticks | 100 ms |
| Auto-subida de escalón | 1 tile (1,5 con botas) | — |
| Daño por caída | a partir de 25 tiles de caída | — |
| Nado/agua | velocidad ×0,5, gravedad ×0,35, flotabilidad al mantener salto | — |
| Aliento bajo el agua | 200 ticks | ~3,3 s |

Reglas adicionales: plataformas de una dirección (se atraviesan desde abajo, se cae con abajo+salto), retroceso (knockback) como impulso puntual, y ningún tunneling — el desplazamiento por tick se limita a menos de un tile o se subdivide.

## Fases

Cada fase termina con un despliegue en Vercel jugable y un commit. `DoD` = definición de "hecho".

### Fase 0 — Andamiaje y despliegue (S)
Vite + TS + vitest, `index.html` con canvas a pantalla completa, pantalla de carga, panel de error, `.gitignore`, README. Proyecto conectado a Vercel desde el repo de GitHub.
**DoD**: la URL de Vercel carga un canvas con un fondo y "Hola" dibujado, y el push a la rama redespliega solo.

### Fase 1 — Laboratorio de físicas (M) ← la fase importante
Rejilla de tiles hecha a mano (~200×100), sin generación. Jugador como caja, colisión AABB por ejes, correr/saltar con todas las constantes de la tabla, cámara que sigue con suavizado, overlay de debug (FPS, pos, vel, estado de suelo, hitbox, tiles consultados) y un panel para tocar las constantes en caliente.
**DoD**: se puede correr, saltar con altura variable, subir escalones de 1 tile y caer sin atravesar nada, y el movimiento "se siente" bien. Tests de vitest sobre la resolución de colisiones.

### Fase 2 — Minar y construir (M)
Catálogo de tiles con dureza, ratón para romper/colocar con alcance limitado, reglas de adyacencia (no se coloca en el vacío), progreso de picado, capa de paredes, auto-tiling por bitmask de vecinos, tileset procedural, caché de chunks.
**DoD**: se excava un túnel y se construye una casa; el render sigue a 60fps al modificar tiles.

### Fase 3 — Generación de mundo (L)
Mundo real (empezamos en 2100×600 tiles ≈ 10 MB en memoria; la constante permite crecer). Relieve por ruido, capas superficie/subsuelo/caverna, cuevas por gusanos + autómata celular, vetas de mineral, árboles, estructuras simples. Semilla reproducible.
**DoD**: mundo nuevo con semilla, explorable de punta a punta, generación en menos de ~3 s con barra de progreso.

### Fase 4 — Guardado y carga (M)
Serialización con RLE + compresión, `SaveAdapter` + `LocalSaveAdapter` sobre IndexedDB, versión de formato, menú de mundos (crear/cargar/borrar), autoguardado.
**DoD**: cierras la pestaña, vuelves y el mundo está tal cual lo dejaste. Test de ida y vuelta serializar/deserializar.

### Fase 5 — Iluminación y ciclo día-noche (M)
Propagación de luz por inundación con caída por tile, luz solar según profundidad y hora, fuentes de luz (antorchas), recálculo incremental solo en la zona afectada, cielo con degradado y parallax de fondo.
**DoD**: las cuevas están oscuras, las antorchas iluminan, amanece y anochece, y el recálculo no baja de 60fps.

### Fase 6 — Inventario, objetos y hotbar (M)
Objetos con pilas, drops al minar con recogida por imán, inventario en rejilla con arrastrar y soltar, hotbar con rueda del ratón, herramientas con potencia de pico (qué durezas puede romper).
**DoD**: minas → recoges → colocas desde el hotbar; el inventario persiste en el guardado.

### Fase 7 — Crafteo y contenedores (M)
Recetas con requisito de estación cercana (mesa, yunque, horno), lista de recetas disponibles filtrada por lo que llevas, cofres colocables con su propio inventario.
**DoD**: madera → tablones → mesa → picos mejores; los cofres guardan objetos entre sesiones.

### Fase 8 — Vida, combate y enemigos (L)
Corazones, daño, invulnerabilidad temporal, knockback, muerte y respawn en el punto de aparición. Enemigos: slime que salta, murciélago volador, zombi que camina y salta obstáculos. Spawn según hora y bioma, arma cuerpo a cuerpo con arco de golpe y proyectiles.
**DoD**: de noche salen enemigos, se pueden matar, te pueden matar, sueltan objetos.

### Fase 9 — Líquidos y biomas (L)
Agua y lava con flujo celular por celdas, evaluación perezosa solo en celdas activas; física de nadar y aliento; lava que quema; biomas (bosque, desierto, nieve) con tiles, paleta y enemigos propios.
**DoD**: un cubo de agua fluye y se estabiliza; se puede nadar; los biomas se distinguen a simple vista.

### Fase 10 — Pulido y audio (M)
Partículas (polvo al minar, chapoteos), efectos de sonido y música sintetizados con WebAudio, sacudida de cámara, transiciones de menú, ajustes (volumen, escala de la interfaz).
**DoD**: el juego parece un juego terminado, no una demo técnica.

### Fase 11 — Controles táctiles (M)
Joystick virtual, botones de acción, minar con toque, interfaz adaptada a pantalla pequeña, viewport bloqueado como en tus otros juegos.
**DoD**: jugable en móvil sin teclado.

### Fase 12 (opcional) — Supabase (M)
`SupabaseSaveAdapter`: auth por email/OAuth, tabla `worlds` con RLS por usuario, blob en Storage, resolución de conflictos por marca de tiempo, y modo invitado que sigue usando IndexedDB.
**DoD**: inicias sesión en otro dispositivo y tu mundo está ahí.

## Presupuesto de rendimiento

- **Nunca** iterar los 1,26 M de tiles por frame: solo los chunks visibles (~5×3 chunks).
- Cero asignaciones en el bucle caliente: vectores reutilizados, sin `map`/`filter` por frame.
- Luz: recálculo incremental por región, nunca del mundo entero.
- Chunks: caché LRU de canvases con techo de memoria; se descartan los lejanos.
- Guardado: RLE + compresión, y hacerlo en un `requestIdleCallback` o Web Worker para no cortar el frame.
- Objetivo medible: 60fps estables con el overlay de debug mostrando el tiempo de frame.

## Verificación

**Automatizable con vitest** (funciones puras, sin canvas): resolución de colisiones AABB, conversión de coordenadas, bitmask de auto-tiling, propagación de luz, serializar/deserializar mundo, determinismo de la generación por semilla, flujo de líquidos.

**Manual, cada fase**: `npm run dev`, jugar, y comprobar la lista de DoD con el overlay de debug abierto. El overlay entra en la fase 1 y no se va nunca (activable con F3).

**Despliegue**: cada fase acaba con push a `claude/terraria-game-plan-4ib6ix` y comprobación de la URL de preview de Vercel.

## Despliegue en Vercel

Proyecto estático, igual que los tuyos (framework detectado o `null`):
- Build: `npm run build` · Output: `dist` · Node 22.x o 24.x
- No hace falta `vercel.json` salvo que queramos cabeceras de caché para los assets; Vite ya los sirve con hash.
- Conexión: importar el repo de GitHub en Vercel una vez, en la fase 0. A partir de ahí cada push despliega.

## Decisiones caras de cambiar (hay que fijarlas en la fase 1)

1. **Tamaño de tile = 16 px** — cambiarlo obliga a redibujar todo el arte y reajustar todas las constantes de física.
2. **Tamaño de chunk = 64×64** — afecta a la caché de render, la iluminación y el formato de guardado.
3. **Renderer Canvas2D** — mitigado por el aislamiento en `src/render/`, pero un cambio a WebGL es una fase entera.
4. **Formato de guardado con número de versión desde el día uno** — sin él, cada cambio de fase invalida los mundos guardados.
5. **Físicas en coordenadas de píxel con floats y paso fijo** — mezclar paso variable después es una reescritura.
