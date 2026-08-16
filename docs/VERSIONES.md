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

**Es una reconstrucción, no una máquina del tiempo.** El motor siempre es el de
hoy: las físicas, el render, el guardado y la interfaz son los actuales. Lo que
se rebobina es el contenido. Cosas como el inventario o el propio menú de
mundos están desde el principio aunque llegaran en la 1.6.0 y la 1.4.0, porque
sin ellas no habría partida que jugar.

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

## Lo que queda pendiente

**Actualizar un mundo a una versión más nueva.** Hoy la versión de un mundo se
fija al crearlo y no cambia. Subirla significa sembrar en terreno ya excavado
—minerales, biomas, la fortaleza— sin pisar lo que haya construido quien juega,
y eso pide su propia tanda.
