# Colonia Óxido

Simulador de colonia con vista cenital: colonos con necesidades y prioridades
de trabajo, más una fábrica de taladros, cintas, insertadores y ensambladoras,
en un planeta lleno de criaturas que odian la contaminación. Vive en
**`/colonia/`** y no comparte nada con los otros juegos del repositorio.

```bash
npm run dev       # y abre http://localhost:5173/colonia/
```

## De qué va

Tres colonos se estrellan. El objetivo es construir el **Faro de rescate** y
mantenerlo encendido un día entero con energía.

- **Colonos.** Hambre, sueño, ánimo, salud y siete habilidades. Eligen solos
  qué hacer según la tabla de prioridades (Trabajo): abastecer, cocinar,
  construir, cultivar, fabricar, investigar, minar, talar y transportar.
  Duermen de noche, comen comida cocinada (o cruda, y se quejan), tienen
  crisis si el ánimo cae, y llega gente nueva de vez en cuando.
- **Órdenes y zonas.** Talar, minar (roca o mineral), cosechar bayas,
  desmontar; zonas de almacén y de cultivo de patatas.
- **Fábrica.** Taladros de combustión y eléctricos sobre las manchas de
  mineral, cintas transportadoras (al arrastrar giran solas), insertadores,
  hornos, ensambladoras con receta, cofres, generadores de vapor y paneles
  solares. La energía es una red única: si falta, todo va más lento.
- **Investigación.** Nueve tecnologías; las avanzadas gastan paquetes de
  ciencia roja y verde que hay que fabricar y llevar a la mesa.
- **Criaturas.** Los nidos absorben la contaminación que llega a su trozo de
  mapa y la convierten en larvas, soldados, escupidores y colosos que vienen a
  destruir lo que contamina. La evolución sube con el tiempo, la contaminación
  y los nidos que destruyes. Cada pocos días llega además una incursión desde
  el borde, y los nidos se expanden. Defensa: muros, torretas de munición (hay
  que llenarlas), torretas láser, y colonos reclutados (R) que obedecen al clic
  derecho.

## Panel de administración

`F10`, el botón **⚙ Admin** de la barra superior o el menú ☰. Todo se guarda
con la partida.

| Sección | Qué permite |
|---|---|
| Recursos | Dar 10, 100 o 1000 de cualquier objeto, +100 de todo, vaciar el suelo |
| Investigación | Desbloquear todo, terminar la actual, olvidarlo todo |
| Colonos | Modo dios, curar y saciar, habilidades a 10, añadir colono, resucitar |
| Construcción y fábrica | Construcción instantánea y gratis, combustible infinito, energía infinita, terminar planos, reparar, llenar torretas |
| Criaturas | Modo pacífico, evolución a mano, incursiones de 5/15/30, sacar enjambres, matar a todas, destruir nidos, nido nuevo, limpiar contaminación |
| Tiempo | Ir a las 7:00 o a las 22:00, saltar un día, turbo ×15 |
| Partida | Exportar e importar en JSON, borrar el guardado |

Es un panel local, sin contraseña: cualquiera que abra el juego en ese
navegador puede usarlo.

## Controles

| Tecla | Acción |
|---|---|
| WASD / flechas / botón central | Mover la cámara |
| Rueda | Zoom hacia el puntero |
| Clic | Seleccionar · colocar · arrastrar áreas |
| Clic derecho | Terminar la herramienta · mover a un colono reclutado |
| R | Girar al colocar · reclutar al colono seleccionado |
| Espacio · 1 2 3 | Pausa · velocidades ×1 ×3 ×6 |
| P | Capa de contaminación |
| Supr | Desmontar el edificio seleccionado |
| F5 / F9 | Guardar / cargar (también se guarda solo cada minuto) |
| F10 | Panel de administración |

## Cómo está hecho

Vite + TypeScript + Canvas2D, sin dependencias. El terreno se pinta una vez en
una caché de pixel art (16 px por casilla) que se estira sin suavizado; lo
demás se dibuja en vectorial encima, con una capa de oscuridad nocturna que
recortan las luces.

| Fichero (`src/colonia/`) | Qué hace |
|---|---|
| `tipos.ts` | Objetos, recetas, direcciones, constantes de tiempo |
| `mapa.ts` | Capas del mapa, generación con ruido, contaminación por trozos de 8×8 |
| `edificios.ts` | Catálogo de edificios y árbol de investigación |
| `maquinas.ts` | Qué acepta cada máquina, cintas, insertadores, taladros, hornos, energía, torretas |
| `colonos.ts` | Necesidades y la máquina de tareas de los colonos |
| `criaturas.ts` | Nidos, oleadas, incursiones, expansión, campos de distancia |
| `camino.ts` | Dijkstra/A* en la rejilla y campos de distancia multi-fuente |
| `mundo.ts` | El estado entero y el tick |
| `guardado.ts` | Partidas en `localStorage` |
| `admin.ts` | Panel de administración |
| `render.ts`, `ui.ts`, `main.ts` | Dibujo, interfaz y controles |

Decisiones que conviene conocer:

- **Una búsqueda por tipo de trabajo.** Para elegir tarea, el colono junta en
  un conjunto todas las casillas desde las que podría hacer ese trabajo y lanza
  un solo Dijkstra: el primer trabajo alcanzable es el más cercano.
- **Demandas.** Cada edificio declara qué necesita (materiales del plano,
  combustible, mineral para las órdenes del horno, ingredientes, munición,
  ciencia) y los colonos lo cubren. Lo mismo que hace un insertador, a mano.
- **Las criaturas siguen un campo de distancias** hacia su objetivo en el que
  los muros cuestan pero no bloquean: si un muro está en el camino más corto,
  lo muerden. Una criatura atascada medio minuto se dispersa.
- La simulación va a 20 ticks por segundo de juego y cuesta ~0,1 ms por tick.

`tests/colonia.test.ts` comprueba, entre otras cosas, que desde cero los
colonos acaban fundiendo placas y fabricando engranajes solos, que la cadena
taladro → cinta → insertador → horno → insertador → cofre funciona sin nadie, y
que las torretas frenan una incursión.

Con `?depurar` en la URL, `window.colonia` expone el mundo y la cámara.
