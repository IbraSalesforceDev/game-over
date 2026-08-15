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
- ✅ **Fase 5** — Iluminación y ciclo día-noche
- ✅ **Fase 6** — Inventario, objetos y hotbar
- ✅ **Fase 7** — Crafteo y contenedores
- ✅ **Fase 8** — Vida, combate y enemigos
- ⬜ **Fase 9** — Líquidos y biomas

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

La luz se propaga por inundación con caída por tile, más en la roca que en el
aire. Se calcula solo para una ventana algo mayor que la pantalla y se rehace
cuando la cámara se mueve, cambia un tile o sube el sol; recalcularla cuesta
menos de un milisegundo. El buffer tiene un píxel por tile y se estira con
suavizado sobre la escena en modo `multiply`, que es lo que da los degradados
suaves. Un ciclo completo de día y noche dura 12 minutos reales.

### Parámetros de URL

| Parámetro | Efecto |
|---|---|
| `?semilla=LOQUESEA` | Genera siempre el mismo mundo |
| `?tam=mediano` | Mundo de 2100×600 en vez de 1400×450 |
| `?lab=1` | Abre el laboratorio de físicas de la fase 1 en vez de un mundo |
| `?hora=22` o `?hora=5:40` | Empieza el mundo a esa hora (útil para ver la noche sin esperar) |

El laboratorio sigue ahí a propósito: es donde se afinan las constantes de
movimiento con `F4`, y es más rápido comprobar una regla de la física en un
tramo hecho a mano que buscando el terreno adecuado en un mundo generado.

## Controles

| Tecla | Acción |
|---|---|
| `A` `D` o `←` `→` | Moverse |
| `W`, `↑` o `Espacio` | Saltar (mantener = salto más alto) |
| `S` o `↓` + salto | Bajar por una plataforma |
| Clic izquierdo | Minar, o golpear si llevas un arma en la mano |
| Clic derecho | Colocar lo que lleves en la mano |
| `1`–`0` o rueda | Elegir ranura de la barra |
| `E` | Abrir inventario y panel de fabricación |
| Clic derecho en un cofre | Abrirlo |
| `Esc` | Cerrar los paneles |
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

Los bloques ya no son infinitos: lo que minas cae al suelo, un imán lo acerca
cuando pasas cerca y se apila en el inventario; colocar gasta lo que llevas. La
hierba suelta tierra, los árboles sueltan madera y los minerales en bruto no se
pueden colocar — son material para la fase de crafteo. Sin pico no se puede
minar, y uno mejor pica más rápido: se usa siempre el mejor que lleves encima,
para no tener que cambiar de ranura entre picar y construir.

Con el inventario abierto se coge una pila con un clic, va pegada al puntero y
se suelta con otro clic. La barra rápida son las diez primeras ranuras del
inventario, no un contenedor aparte, y el cofre abierto usa el mismo gesto.

De noche salen zombis y slimes a la superficie, y bajo tierra hay peligro a
cualquier hora. Los golpes hacen daño por contacto y dan unos fotogramas de
invulnerabilidad: sin ellos, quedarse pegado a un enemigo mata al instante. Al
morir se reaparece en el punto de origen con la vida llena.

Se empieza con pico, espada de madera y antorchas. Los enemigos sueltan gel y
huesos, y el gel hace que las antorchas cundan mucho más. Una espada mejor pega
más fuerte pero se recupera más despacio.

Fabricar necesita estar cerca de la estación: con las manos solo salen
antorchas y la mesa de trabajo; la mesa desbloquea cofres, hornos y yunques; el
horno funde mineral en lingotes y el yunque los convierte en picos mejores. El
panel enseña también lo que todavía no puedes pagar, en gris — saber que existe
un pico de oro es lo que empuja a bajar a buscarlo. Un cofre no se puede romper
si tiene cosas dentro.

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
