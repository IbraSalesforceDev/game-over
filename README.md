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
- ✅ **Fase 9** — Líquidos y biomas
- ✅ **Fase 10** — Pulido, sprites y audio
- ⬜ **Fase 11** — Controles táctiles

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
| `?columna=700` | Aparece en esa columna en vez de en el centro (para ir directo a un lago o a un bioma) |

El laboratorio sigue ahí a propósito: es donde se afinan las constantes de
movimiento con `F4`, y es más rápido comprobar una regla de la física en un
tramo hecho a mano que buscando el terreno adecuado en un mundo generado.

## Controles

| Tecla | Acción |
|---|---|
| `A` `D` o `←` `→` | Moverse |
| `W`, `↑` o `Espacio` | Saltar (mantener = salto más alto) |
| `S` o `↓` + salto | Bajar por una plataforma |
| Clic izquierdo | Minar, golpear si llevas un arma, o llenar el cubo |
| Clic derecho | Colocar, comer, vaciar el cubo, o abrir cofre y estación |
| `H` | Panel de controles |
| `1`–`0` o rueda | Elegir ranura de la barra |
| `E` | Abrir inventario y panel de fabricación |
| Clic derecho en un cofre | Abrirlo |
| `Esc` | Cerrar paneles; sin nada abierto, menú de pausa |
| `Tab` | Alternar capa bloque / pared |
| `R` | Volver al punto de aparición |
| `F2` | Guardar ahora |
| `F3` | Coordenadas |
| `F6` | Overlay de diagnóstico completo |
| `F4` | Panel de constantes de física |
| `F5` | Rejilla de chunks |

Caer desde alto duele: los primeros nueve tiles salen gratis —saltar es el verbo
principal del juego y no puede dar miedo— y a partir de ahí sube rápido. Al
morir, la pantalla dice de qué.

El suelo no se pisa igual en todas partes: la arena agarra más y el hielo casi
nada, así que un lago helado se cruza anticipando en vez de frenando.

Construir tiene reglas: un bloque necesita apoyo (un vecino o una pared detrás),
no se puede colocar un macizo dentro del propio jugador, todo ocurre dentro
de un alcance de 5,5 tiles, y las seis filas de arriba del mundo son techo: ahí
no se coloca nada, que es lo que impide subirse por encima de la cámara. El recuadro del puntero se pone rojo cuando la
acción no es posible.

Los bloques ya no son infinitos: lo que minas cae al suelo, un imán lo acerca
cuando pasas cerca y se apila en el inventario; colocar gasta lo que llevas. La
hierba suelta tierra, los árboles sueltan madera y los minerales en bruto no se
pueden colocar — son material para la fase de crafteo. Sin pico no se puede
minar, y uno mejor pica más rápido: manda el que llevas en la mano, así que la
herramienta que sostienes significa algo — y se te ve en la mano mientras la
llevas. La progresión es madera, piedra, cobre, hierro, plata y oro.

Con el inventario abierto se coge una pila con un clic, va pegada al puntero y
se suelta con otro clic. La barra rápida son las diez primeras ranuras del
inventario, no un contenedor aparte, y el cofre abierto usa el mismo gesto.

De noche salen zombis y slimes a la superficie, y bajo tierra hay peligro a
cualquier hora. Los golpes hacen daño por contacto y dan unos fotogramas de
invulnerabilidad: sin ellos, quedarse pegado a un enemigo mata al instante. Al
morir se reaparece en el punto de origen con la vida llena.

Hay hambre. Baja sola —un depósito lleno da para unos doce minutos— y más
deprisa si corres, saltas o picas. Por encima del 90 % se regenera vida poco a
poco, y regenerar gasta comida de más: comer bien es la cura, y curarse cuesta.
Por debajo del 15 % se empieza a perder vida, despacio, con tiempo de sobra para
buscar algo. La comida sale de los animales: conejos que dan saltos para
escaparse y jabalíes que trotan, ninguno de los dos ataca. La carne cruda sacia
poco; pasada por el horno alimenta el doble y además cura.

Se empieza con pico de madera, espada de madera y antorchas. Los enemigos sueltan gel y
huesos, y el gel hace que las antorchas cundan mucho más. Una espada mejor pega
más fuerte pero se recupera más despacio.

El mundo tiene agua y lava. Fluyen por celdas y solo se calculan las que están
en movimiento, así que un océano quieto no cuesta nada; al romper la pared de
una charca, el agua encuentra el hueco y se derrama. Dentro del agua se cae
despacio y se sube manteniendo el salto, y hay medio minuto de aire antes de
empezar a ahogarse — el medidor solo aparece cuando queda algo que vigilar. La
lava quema al tocarla y se sigue ardiendo un rato al salir; meterse en el agua
lo apaga. Con un cubo, que sale del yunque, se recoge y se vierte una celda
entera: es la forma de llevarse el agua a donde haga falta.

Además del bosque hay desierto y nieve, uno a cada lado del mundo y siempre
lejos del punto de aparición. Cada uno tiene sus tiles —arena y arenisca con
cactus, nieve y hielo—, su relieve (el desierto se hunde, la nieve se levanta) y
su enemigo: escarabajos que no saltan y lobos de hielo que corren más que tú. El
bioma se deduce del suelo que pisas, no de un mapa guardado, así que un desierto
construido a mano también trae escarabajos.

Fabricar necesita estar cerca de la estación: con las manos solo salen
antorchas y la mesa de trabajo. Un clic derecho sobre la mesa, el horno o el
yunque abre su propio panel con todas sus recetas en grande; el inventario
mantiene su lista pequeña al lado para lo de siempre. La mesa desbloquea cofres, hornos y yunques; el
horno funde mineral en lingotes y el yunque los convierte en picos mejores. El
panel enseña también lo que todavía no puedes pagar, en gris — saber que existe
un pico de oro es lo que empuja a bajar a buscarlo. Un cofre no se puede romper
si tiene cosas dentro.

Todo lo que se ve está dibujado por código al arrancar: el personaje y los
enemigos son sprites de píxel generados en lienzos fuera de pantalla, con ciclo
de paso, brazos y piernas en dos planos —el de atrás más oscuro, que es lo que
hace que la zancada se lea— y poses de salto, caída y nado. Los tiles tienen
grano propio por familia: la piedra mancha, la tierra motea, la madera veta y
los minerales son roca con pepitas. La hierba y la nieve se recortan en briznas
cuando su borde da al aire, y las copas de los árboles redondean las esquinas
para leerse como una masa y no como una cuadrícula.

Detrás hay dos cordilleras con parallax, nubes a la deriva y el sol o la luna
recorriendo el cielo según la hora. Delante, partículas: cascotes del color del
bloque que rompes, polvo al aterrizar y al correr, chispas al golpear,
chapoteos al entrar al agua y burbujas al bucear. La cámara se sacude al recibir
daño y al reventar algo.

El sonido también sale de código, con WebAudio y sin un solo fichero de audio:
osciladores, envolventes y ruido blanco filtrado. Cada disparo desafina un poco
a propósito, porque un efecto que se repite treinta veces con la misma nota
exacta se convierte en una alarma. El botón **⚙** de abajo a la izquierda abre
volumen, silencio y sacudida de cámara, y lo recuerda entre partidas.

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
