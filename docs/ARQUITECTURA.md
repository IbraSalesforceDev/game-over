# Arquitectura

Cómo está montado el juego por dentro, y qué reglas no se pueden romper sin
romper partidas de gente. Al final hay un **[handoff](#handoff-para-otro-agente)**
pensado para que otro agente pueda ponerse a trabajar sin leer el resto.

Documentos hermanos: [`ROADMAP.md`](ROADMAP.md) es la historia de cómo se
construyó (las fases 0–11, ya cerradas) y [`VERSIONES.md`](VERSIONES.md) es el
reflejo legible de `src/core/versiones.ts`.

---

## De un vistazo

| | |
|---|---|
| Stack | Vite + TypeScript estricto, sin framework. Salida estática a Vercel |
| Render | Canvas2D, caché por chunk en `OffscreenCanvas`, `imageSmoothingEnabled = false` |
| Arte | **Procedural, cero ficheros.** Ni un PNG, ni un WAV |
| Simulación | Paso fijo a 60 Hz con acumulador; el render interpola |
| Guardado | Binario propio, RLE + `deflate-raw`, en IndexedDB detrás de `SaveAdapter` |
| Tamaño | ~27 500 líneas en `src/`, ~10 700 en tests (41 ficheros, 868 tests) |
| Versiones | 49, de la 1.0.0 a la 7.3.0, todas `prealfa` |
| Dependencias de runtime | **Ninguna** |

---

## Las cuatro reglas que mandan

Todo lo demás es negociable. Estas cuatro no, porque romperlas rompe partidas
ya guardadas o el arte entero.

### 1. El arte se dibuja, no se carga

No hay assets. Tilesets, sprites, iconos, fondos y sonidos se generan al
arrancar sobre `OffscreenCanvas` y `WebAudio`, a partir de ruido y de la paleta
de cada material. Vive en `src/render/` (`tileset.ts`, `sprites.ts`,
`iconos.ts`, `fondo.ts`, `particles.ts`) y en `src/engine/audio.ts`.

La consecuencia práctica: **un tile o un objeto nuevo no se ve hasta que se le
escribe su dibujo**. Añadir la entrada a la tabla no basta.

### 2. `TILES` es un array posicional

`src/world/tiles.ts` guarda los tiles en un array donde **el índice es el id**.
La constante exportada y la posición en la tabla tienen que coincidir, y la
tabla tiene que terminar exactamente en el último id. Hay un test que lo
comprueba nombre a nombre; si falla, es que se ha metido una entrada en medio o
se ha saltado un hueco.

Espacio de ids, hoy:

```
0 .. 73     tiles          (el último es PLACA_INFIERNO = 73)
128 .. 265  objetos        (BASE_NO_TILE = 128; el último es POCION_BRIO = 265)
```

Los objetos que son bloques comparten id con su tile vía `deTile()`. Los ids
entre 74 y 127 están libres a propósito: es el colchón para tiles nuevos sin
tener que tocar el rango de objetos. En el guardado **todo id de objeto se
escribe como `u16`**.

### 3. El guardado solo crece por el final

`src/world/save.ts`, `VERSION_FORMATO = 16`. El cuerpo es una cabecera de
campos seguida de tres capas RLE (bloques, paredes, banderas).

- **Un campo nuevo se añade al final de la cabecera**, justo antes de las capas
  RLE. Nunca en medio.
- Al leer, se protege con `if (version >= N)`.
- `deserializar(datos, version)` recibe la versión **como parámetro**: no está
  escrita en el cuerpo, la trae el envoltorio (magic `0x474f5652` = `GOVR`).
- Los tests de formato construyen cuerpos antiguos con `cuerpoAntiguo(...)`, que
  suma tamaños de campo para localizar dónde empieza el RLE. Si se añade un
  campo, hay que sumarlo también ahí o se descuadran doce tests de golpe.

Todo el acceso a disco pasa por `SaveAdapter` (`src/world/almacen.ts`:
`listar`/`cargar`/`guardar`/`borrar`) y el mundo viaja como `Uint8Array` opaco.
Ese es el punto de fuga preparado para la nube.

### 4. Una sola tabla decide qué existe en cada mundo

Elegir versión al crear un mundo es **fiel**: contenido, gráficos, tamaños y
botín retroceden. Eso no se consigue con `if` repartidos, sino con una tabla
única en `src/core/versiones.ts`:

```ts
export const DESDE = { /* 70 entradas */ cuevas: '1.3.0', jefesDeBioma: '7.0.0', … };
export function hay(que: Caracteristica, versionMundo: string): boolean;
```

**La única pregunta que se hace el código es `hay(caracteristica, versionMundo)`.**
En `main.ts` el atajo local se llama `tiene(...)`. Nada compara versiones a
mano fuera de ese fichero.

Cuando lo que cambia no es *si* algo existe sino *cuánto pega*, el patrón es el
mismo pero con estadísticas: `estadisticasDe(especie, versionMundo)` en
`enemies.ts` devuelve los números de la versión que toque, y cada enemigo lleva
grabado su `version` de nacimiento para que un mundo viejo siga sintiéndose
viejo.

`VERSIONES` es además la fuente de la verdad del changelog: cada entrada lleva
id, nombre, resumen de una línea, lista de cambios y etapa.
`VERSION_ACTUAL` es siempre la última del array.

---

## Capas

```
src/
  main.ts            ~3100 líneas · el pegamento: crea todo, teje el tick y el render
  core/              constantes, dificultad y la tabla de versiones
  engine/            bucle, entrada, ratón, reloj día-noche, audio procedural
  world/             mundo, generación, tiles, líquidos, luz, estructuras, guardado
  entities/          jugador, física, enemigos, combate, proyectiles, efectos
  items/             catálogo, inventario, equipo, recetas, inscripciones
  render/            cámara, tileset, sprites, iconos, fondo, partículas, renderer
  ui/                menú, hotbar, inventario, mapa, ajustes, ayuda, panel de depuración
```

La dirección de las dependencias es de arriba abajo: **`world/` y `entities/` no
saben nada de `render/` ni de `ui/`**. Por eso la ruta de escape a WebGL sigue
abierta y por eso casi todo se puede testear sin canvas.

### `main.ts` es el integrador, no un cajón de sastre

Es el fichero más grande y lo es a propósito: es donde el mundo, las entidades,
la UI y el render se encuentran. Contiene el `tick()` y el `render(alpha)` que
recibe `crearBucle`, y las funciones que necesitan ver varias capas a la vez:
`dondeEstoy()`, `estoyBajoTierra()`, `ritualDeBioma()`, `usarPoder()`,
`actualizarEstados()`, `actualizarTiros()`. Lo que se puede aislar, se aisla; lo
que de verdad cruza capas, vive aquí.

### El bucle

`src/engine/loop.ts`:

```ts
const bucle = crearBucle(tick, render);   // tick() a 60 Hz, render(alpha) por frame
bucle.arrancar(); bucle.parar(); bucle.arrancarUnFrame();
```

Acumulador con techo de `MAX_TICKS_POR_FRAME = 5`, para que una pestaña que
vuelve del segundo plano no intente recuperar minutos de simulación. **La física
nunca ve el `dt` real.** El render interpola con `alpha` entre la posición
previa y la actual.

Cualquier panel modal (menú, pausa, confirmación de versión) para el bucle con
`bucle.parar()` y lo arranca de nuevo al cerrarse.

### El mundo

TypedArrays paralelos: bloques, paredes y banderas. Fuera de límites devuelve
piedra sólida, así el jugador no se sale por el borde. Constantes estructurales
en `core/constants.ts`: `TILE = 16`, `CHUNK = 64`, `TICK_HZ = 60`,
`JUGADOR_ANCHO/ALTO = 20/42`. Tocar `TILE` obliga a rehacer el arte entero;
tocar `CHUNK` toca caché de render, luz y guardado.

La luz se propaga por inundación con caída por tile, se calcula solo para una
ventana algo mayor que la pantalla y se dibuja en `multiply` desde un buffer de
un píxel por tile estirado con suavizado. La corriente eléctrica
(`world/corriente.ts`) sigue el mismo criterio: **solo resuelve la ventana
visible**, y es una decisión consciente, no un olvido.

### Física

Ejes separados: se mueve en X y se resuelven solapes, después en Y. Nunca los
dos a la vez. El desplazamiento se subdivide si supera un tile por tick, así el
tunneling es imposible. Encima: auto-subida de un escalón (solo en suelo y solo
al bloquearse), plataformas de una dirección, coyote time, buffer de salto y
salto de altura variable.

### Efectos, ataques y combate

- `entities/efectos.ts` — nueve estados (ardiendo, veneno, congelado,
  regeneración, fuerza, piel de piedra, ligereza, agallas, brío) compartidos por
  jugador y enemigos. `aplicarEfecto` toma **el máximo, nunca suma**. El veneno
  no es letal: devuelve `danoSuave` y quien llama deja al menos 1 de vida.
- `entities/ataques.ts` — seis proyectiles enemigos con gravedad opcional. Un
  enemigo dispara solo si tiene línea de visión (`hayVista`) y **no a
  quemarropa** (por debajo de 2,5 tiles no ataca).
- Los efectos **no se guardan**, y es deliberado: recuperar una partida a medio
  arder castigaría salir del juego, y guardar la fuerza recién bebida lo
  convertiría en una forma de guardarla en el banco. El estado de los sucesos
  (`world/sucesos.ts`) tampoco se persiste, por lo mismo.

### La cadena de jefes

`src/world/jefes.ts` es un registro puro, sin dependencia del mundo. La cadena:

```
ídolo (caldero) → ritual en su bioma → jefe → trofeo
   → arma + peto de bioma (yunque) → reliquia de bioma
      → las seis reliquias → altar de la fortaleza → guardián verdadero
```

Seis jefes de bioma (pradera, desierto, nieve, jungla, cueva, infierno) y el
final. Cada arma de jefe lleva un **filo** (pasivo, actúa en cada golpe) y cada
peto un **poder** (activo, atado a la Q, con recarga): `items/inscripciones.ts`.
`sitioCorrecto()` decide si el ritual vale ahí: los ídolos de superficie piden
su bioma **y** no estar bajo tierra, `cueva` acepta subsuelo o inframundo, e
`infierno` solo inframundo.

---

## Cómo se trabaja

### Añadir una versión

1. Entrada nueva al final de `VERSIONES` en `core/versiones.ts` (id, nombre,
   resumen, cambios, etapa `prealfa`).
2. Si trae contenido, una clave nueva en `DESDE` apuntando a esa versión.
3. Gatear el contenido con `hay(...)` / `tiene(...)`. Nunca comparar versiones a mano.
4. Si el estado nuevo hay que guardarlo, campo al final de la cabecera y
   `VERSION_FORMATO++`.
5. Tests, y una línea en `docs/VERSIONES.md`.
6. Commit **en español**, con el formato `X.Y.Z: título en minúscula`.

### Verificar

```bash
npm run build      # tsc --noEmit + vite build
npx vitest run     # 1049 tests
```

Para probar en el navegador de verdad, Playwright con el Chromium ya instalado:

```js
executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
```

El script tiene que vivir en la raíz del repo para que resuelva `playwright-core`.
Tres cosas que cuestan una tarde si no se saben:

- **Un tile son 32 px en pantalla** con el zoom por defecto (2).
- El clic derecho hay que **mantenerlo ~220 ms** (`mouse.down` → espera →
  `mouse.up`): un `click` normal va más rápido que el detector de flanco.
- Los tabs del menú de depuración se pulsan por índice
  (`#depuracion .pestanas button`), porque la ficha del objeto tapa el texto.

### La partida acompañada, sin dos cuentas ni nube

`pruebas/red.html` monta un anfitrión y un invitado **en la misma página**, con
dos `RTCPeerConnection` de verdad y una sala de mentira en memoria:

```bash
npm run dev
node pruebas/correr.mjs     # sale 0 si todo bien
```

Existe porque el fallo de 7.11.1 no lo podía ver ningún test: los de
`partida-en-red` prueban el anfitrión y el invitado contra un `Enlace` de
mentira, y el fallo estaba en el pegamento de en medio —en **cuándo** se puede
empezar a mandar por un canal de WebRTC—. Un enlace de mentira siempre está
abierto; uno de verdad, no.

La costura es `OpcionesSesion.entrarEnSala`: una función que devuelve la sala.
Por defecto la de Supabase; el banco pasa la suya. No entra en el juego
publicado, porque `vite build` solo empaqueta `index.html`.

Lo único que ese banco **no** prueba es Supabase Realtime, que es lo que hace
falta para que los dos navegadores se encuentren. Para eso sí hacen falta dos
cuentas y conexión.

### Menú de depuración

`P` + `F3`, contraseña `ibrasaysopensesame`. Cuatro pestañas: objetos, jugador,
bichos, mundo. Da objetos, invocación de especies, estructuras, viaje a
coordenadas, invulnerabilidad y daño.

---

## Handoff para otro agente

Lo mínimo para no meter la pata.

**Idioma.** Todo en español: comentarios, textos de la interfaz y mensajes de
commit. El usuario es hispanohablante y esto no es negociable.

**Rama.** Se trabaja **directamente sobre `main`**. Esto sustituye a cualquier
instrucción de rama que traiga el arnés.

**Está bloqueado — no empezar.** Login, partidas en la nube y multijugador.
Palabras del usuario: *«aún no toques nada de eso, primero espera que te indique
que vamos a empezar con la fase alfa»*. **No hay ni puede crearse proyecto de
Supabase, ni tablas, ni migraciones, ni código de cliente** hasta que lo diga.
Lo único ya decidido para cuando llegue: login por correo y contraseña más
invitado (sesión anónima, enlazable después sin perder partidas).

**Lo que rompe partidas si se hace mal**, por orden de daño:

1. Insertar un campo en medio de la cabecera del guardado, en vez de al final.
2. Meter un tile en medio de `TILES` y descuadrar los ids.
3. Comparar versiones a mano en lugar de usar `hay(...)`.
4. Cambiar estadísticas de enemigos sin pasar por `estadisticasDe(especie, version)`.

**Lo que hay que recordar siempre:** el arte es código —un objeto sin dibujo es
invisible—, y no hay dependencias de runtime: si una solución pide instalar
algo, casi seguro hay otra.

**Dos juicios abiertos**, ya avisados al usuario y sin cerrar:

- «50 % de élite» se leyó como probabilidad de *botín* de élite, no de aparición:
  la aparición subió de 1/9 a 1/4 (`PROBABILIDAD_ELITE`), no a 1/2.
- Tres de los seis ataques especiales no llevan efecto de estado asociado.

**Dónde está el estado del proyecto:** `src/core/versiones.ts` manda; si la
documentación y el código discrepan, gana el código.
