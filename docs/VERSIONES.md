# Versiones

Desde la 4.2.0 el juego se numera `mayor.menor.parche`:

- **mayor** — un cambio grande, o una tanda que añade muchas cosas a la vez.
- **menor** — algo nuevo, pero de tamaño normal.
- **parche** — arreglos y retoques pequeños.

El parche vuelve a 0 cada vez que sube el menor, y el menor vuelve a 0 cada vez
que sube el mayor.

Se acabaron las fases y los bloques. Lo que antes era "fase 0" es la **1.0.0**,
y de ahí en adelante toda la historia del repositorio está traducida a esta
numeración en `src/core/versiones.ts`, que es la **fuente de la verdad**: ese
fichero no es documentación, es la tabla que el juego lee para decidir qué
existe en cada mundo. Este documento es su reflejo legible; si discrepan, manda
el código.

## Elegir versión

Al crear un mundo se elige con cuál se crea, de la 1.0.0 a la más nueva. El
menú enseña de cada una su etapa —todas son **prealfa** por ahora—, un resumen
y qué trajo respecto de la anterior.

El mundo se construye con lo que había entonces y nada más: un mundo de 2.1.0
no tiene selva, ni fortaleza, ni hambre, ni mapas, y sus recetas son las de
2.1.0. Los mundos anteriores a 1.3.0 abren el laboratorio de físicas, porque
entonces no había generación de mundo — y el laboratorio sigue en el código,
así que no hay nada que reconstruir.

Y no solo el contenido: **también el aspecto**. Antes de 2.2.0 el personaje y
los bichos son cajas de colisión pintadas, no hay montañas ni nubes de fondo ni
sombras; antes de 2.2.1 los objetos son cuadrados de color en el inventario;
antes de 1.5.0 no hay sol, ni luna, ni estrellas, ni sombra en las cuevas; y
cada medidor del HUD —corazones, aire, estómago— aparece con el sistema que
mide.

**Es una reconstrucción, no una máquina del tiempo.** Lo que no retrocede es el
motor: las físicas, la caché de chunks, el formato de guardado y la carpintería
de la interfaz —menús, pausa, ajustes, panel de depuración— son los de hoy en
todas las versiones. El inventario y el propio menú de mundos también están
desde el principio, aunque llegaran en la 1.6.0 y la 1.4.0, porque sin ellos no
habría partida que jugar ni forma de guardarla.

## Historia

| Versión | Qué trajo |
|---|---|
| 1.0.0 | El andamiaje: lienzo, bucle a 60, pantalla de carga |
| 1.1.0 | Laboratorio de físicas: correr, saltar, colisiones |
| 1.2.0 | Minar y construir, y la capa de paredes |
| 1.3.0 | Mundo generado con semilla: relieve, cuevas, minerales, árboles |
| 1.4.0 | Guardado, carga y menú de mundos |
| 1.5.0 | Iluminación, antorchas y ciclo de día y noche |
| 1.6.0 | Objetos, inventario y barra rápida |
| 1.7.0 | Crafteo con estaciones, y cofres |
| 2.0.0 | Vida, enemigos y combate |
| 2.1.0 | Líquidos, nadar, y desierto y nieve |
| 2.2.0 | Sprites animados, partículas, parallax y audio |
| 2.2.1 | Pulido de navegador: iconos y panel de ayuda |
| 2.3.0 | Hambre, animales y progresión de herramientas |
| 2.3.1 | Daño de caída, menú de pausa y el bug del cofre |
| 3.0.0 | Progresión: niveles de pico, dificultad, armadura, arco, mapas |
| 3.1.0 | Selva, taiga, montañas, mares y grava |
| 3.2.0 | Lava que quema a todos, hardcore, obsidiana, huerto y camas |
| 4.0.0 | Fortaleza, altar, guardián y brújula |
| 4.1.0 | Armadura visible, audio por material y fichas de objeto |
| 4.2.0 | Elegir versión al crear el mundo |
| 4.2.1 | Las versiones viejas también se ven viejas: sprites, fondo, luz e iconos de su época |
| 4.2.2 | Ningún objeto se cuela: cada uno dice de qué versión es y no aparece en las anteriores |
| 4.3.0 | Cambiar de versión un mundo ya creado, hacia delante y hacia atrás |
| 5.0.0 | Varios biomas de cada clase, biomas profundos, tamaño titánico, cuatro minerales más, el inframundo y las lianas |

## Por dónde se comprueba

La versión no es una etiqueta que se mire al crear el mundo y luego se olvide:
cada cosa que puede entrar en una partida declara de cuándo es y se filtra.

- **Los objetos**, en `items.ts`. Se filtran en las cuatro puertas por las que
  entran —lo que suelta un bloque, lo que suelta un bicho, el equipo de salida
  y el menú de depuración— y hay una última red en el momento de usarlos, por
  si algo se cuela de un guardado retocado a mano.
- **Las recetas**, en `recipes.ts`. Un test comprueba además que ninguna receta
  fabrique o pida algo más nuevo que ella misma.
- **Las especies**, en `enemies.ts`, con la misma comprobación sobre su botín.
- **La generación y los sistemas**, con la tabla `DESDE` de `versiones.ts`.

El menú de depuración solo ofrece lo que existe en el mundo abierto. Tiene un
interruptor de «sin límite de versión» para cuando de verdad haga falta, y lo
dice en voz alta en vez de dejarlo pasar por descuido.

## Cambiar de versión un mundo ya creado

Desde la 4.3.0, cada mundo de la lista tiene un desplegable para llevarlo a
cualquier otra versión, hacia delante o hacia atrás.

La regla es una sola: **lo que has tocado se conserva; lo que nunca tocaste
pasa a ser lo que habría sido en la otra versión.**

Sale gratis en espacio y es exacta, no aproximada. El mundo es una función de
la semilla y la versión, así que se regenera el mundo prístino de la versión de
origen y se compara con el tuyo: lo que difiere es, exactamente, lo que hiciste.
Después se genera el prístino de la versión de destino y se le pegan encima esas
diferencias. No hace falta guardar un bit de «tile tocado» —que además no
existiría en las partidas ya guardadas.

Alrededor de todo lo tocado se conserva además un margen de seis tiles de
terreno. Es lo que evita que una casa construida en una llanura acabe dentro de
una montaña que la versión nueva pone ahí. Minecraft resuelve esto conservando
los trozos de mundo ya generados, al precio de que se vean las costuras; aquí el
precio es que el terreno pegado a tus construcciones se queda como estaba.

### Qué se rompe al bajar

Lo que no cabe en la versión de destino se va, y se dice antes con cifras
exactas en una pantalla de confirmación:

- **Los bloques** se convierten en su pariente más cercano, no en un agujero: el
  ladrillo de fortaleza pasa a piedra, la hierba de selva a hierba, el barro a
  tierra, el tronco de ceiba a tronco. Solo se quedan en aire los que de verdad
  no tienen equivalente — una caña, un altar, un cultivo.
- **Los objetos** que aún no existían desaparecen del zurrón, del equipo y de
  los cofres.
- **El estado**: el hardcore se apaga por debajo de 3.2.0, la dificultad vuelve
  a normal por debajo de 3.0.0, los corazones de más se pierden con los
  cristales de vida, y los líquidos se secan por debajo de 2.1.0.

No hay vuelta atrás automática: lo que se pierde al bajar no reaparece al
volver a subir. Lo dice la propia pantalla antes de aceptar.

## Lo que queda pendiente

**Réplicas exactas del motor.** Hoy se rebobinan el contenido y el aspecto, pero
las físicas, la caché de chunks, el formato de guardado y la carpintería de la
interfaz son los de hoy en todas las versiones. Para que jugar a 1.1.0 fuera
literalmente jugar a 1.1.0 haría falta que el juego llevara dentro las versiones
antiguas de esos módulos, no solo interruptores.
