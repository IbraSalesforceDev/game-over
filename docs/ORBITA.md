# Frontera Orbital

Simulador 2D de cohetes con física orbital, minería de asteroides, comercio y
guerra contra una IA. Vive en el mismo repositorio que el sandbox de tiles pero
es un juego aparte: se abre en **`/orbita/`** y no comparte código ni partidas
con él.

```bash
npm run dev       # y abre http://localhost:5173/orbita/
```

## De qué va

Eliges pueblo al empezar:

| | Unión Terrana (humanos) | Colmena Xyl (alienígenas) |
|---|---|---|
| Mundo natal | Gaia, 60 km de radio, 9,8 m/s² | Xyl, 30 km, 6,2 m/s² |
| Ventaja | Piezas un 15 % más baratas, venden un 10 % más caro | Taladros un 30 % más rápidos |
| Armas | Cañones, misiles, cañón de riel | Lanzas de plasma, enjambres, haz de antimateria |
| Defensa | Blindaje de acero, deflector | Caparazón, escudo de fase (más grande) |

La otra raza la lleva la IA. El bucle es:

1. **Construir** en el hangar con las piezas que tengas investigadas.
2. **Lanzar**, llegar a órbita y viajar al **Cinturón de Escombros** (240–350 km
   sobre Gaia) o al **Anillo de Xyl** (rico en xenita, pero territorio enemigo
   si eres humano).
3. **Minar**: acercarse a menos de 40 m y 8 m/s de un asteroide y pulsar F.
4. **Volver** a la estación orbital propia (E abre el mercado, se puede
   descargar, repostar y reparar) o aterrizar en casa con paracaídas.
5. **Vender** en el mercado. Cada venta hunde el precio de ese mineral y se
   recupera con el tiempo de juego, así que conviene diversificar.
6. **Investigar** con lo ganado: motores, bodegas, taladros, armas, escudos.

### Guerra

La diplomacia tiene tres estados: paz, tensión y guerra. La tensión sube al minar
en territorio enemigo o merodear su estación; a 100, declaran la guerra.
Disparar primero también la declara. En guerra llegan incursiones cada pocos
minutos (más grandes cuanto más fuerza tenga su flota) contra tu nave o, si
estás en tierra, contra tu estación. Cada nave derribada da créditos, chatarra
vendible y les quita fuerza. **Destruir su estación orbital los obliga a
rendirse** y da un botín de 60 000 cr. La paz también se puede comprar.

### Panel de administración

`F10`, el botón **Admin** del hangar o la pausa. Créditos, minerales,
desbloquear tecnología, multiplicador de precios, forzar paz/tensión/guerra,
fuerza y agresividad de la IA, lanzar incursiones a mano, reparar estaciones,
modo dios, combustible infinito, teletransporte (órbita de Gaia, Cinturón,
estación, Selene, Xyl, Anillo), avanzar el tiempo, exportar/importar la partida
en JSON y borrarla. Es un panel de máster local: todo vive en el `localStorage`
del navegador, no hay servidor ni cuentas.

## Controles

| Tecla | Acción |
|---|---|
| `Espacio` | Encender motores; después, soltar la etapa de abajo |
| `W` `S` / `Mayús` `Ctrl` | Acelerador |
| `Z` `X` | Acelerador a fondo / cortar |
| `A` `D` | Girar |
| `T` | SAS (estabilizador) |
| Rueda | Zoom continuo; al alejarse aparece el mapa de órbitas |
| `M` | Mapa: centrado en el cuerpo, con apoapsis y periapsis |
| `,` `.` | Acelerar el tiempo (hasta ×5000; no con motores, aire o enemigos cerca) |
| Ratón + clic | Apuntar y disparar las armas |
| `F` | Taladro |
| `G` | Refinería (hielo → combustible) |
| `P` | Paracaídas |
| `E` | Mercado y servicios (acoplada a tu estación) |
| `R` | Recuperar la nave (en casa o en la estación): 90 % del valor y la carga al almacén |
| `Esc` | Pausa |
| `H` | Ocultar la ayuda |

En el hangar: `+ Pila` inserta debajo de la pieza seleccionada, `+ Lateral`
monta un par a los lados, `Supr` quita, `↑` `↓` mueven. Las etapas salen solas de
los desacopladores.

## Cómo está hecho

Vite + TypeScript estricto + Canvas2D, sin dependencias. El arte es vectorial y
se dibuja por código, como en el resto del repositorio.

| Fichero (`src/orbita/`) | Qué hace |
|---|---|
| `sistema.ts` | Gaia, Selene, Xyl, asteroides y estaciones, todo en órbitas circulares «sobre raíles» |
| `fisica.ts` | Paso de una nave: gravedad del cuerpo dominante, empuje, aire, paracaídas, giro, suelo |
| `kepler.ts` | Elementos orbitales y la cónica que se dibuja en el mapa |
| `partes.ts` | Catálogo de ~60 piezas y las dos razas |
| `nave.ts` | La nave como pila de piezas: etapas, combustible, daño por pieza, Δv por etapa |
| `juego.ts` | Un vuelo: naves, proyectiles, minería, estaciones, incursiones |
| `ia.ts` | Diplomacia, diseños enemigos y piloto automático de combate |
| `mercado.ts` | Precios con saturación, tendencia y efecto de la guerra |
| `tecnologia.ts` | Árbol de 14 nodos |
| `partida.ts` | Lo que se guarda: créditos, almacén, tecnología, diplomacia, diseños |
| `render.ts`, `dibujo.ts` | Escena, piezas y HUD |
| `ui/` | Hangar, mercado, tecnología, diplomacia y administración (DOM) |

Decisiones que conviene conocer antes de tocar nada:

- **Cónicas enlazadas.** Dentro de la esfera de influencia de un cuerpo solo
  tira ese cuerpo, y a la nave se le suma la aceleración del propio cuerpo. Así
  la trayectoria es una cónica exacta y la línea del mapa no miente.
- **Subpasos según la órbita.** A ×1 se integra a 60 Hz; con el tiempo acelerado
  el paso es una fracción del periodo orbital local (`pasoMaximo`), medio
  segundo en órbita baja de Gaia.
- **Unidades que cuadran solas.** Masa en toneladas y empuje en kN, así que
  kN/t ya son m/s².
- **La IA juega con desventaja a propósito** (`FACTOR_IA` en `juego.ts`): apunta
  peor, dispara menos y sus rayos queman menos. Con las mismas reglas que el
  jugador, tres naves enemigas deshacían cualquier diseño en diez segundos.

`tests/orbita.test.ts` vuela de verdad la nave inicial de las dos razas hasta
una órbita estable con un giro gravitatorio, aterriza con paracaídas desde
15 km, y comprueba etapas, daño, incursiones y mercado.

Con `?depurar` en la URL, `window.orbita` expone el vuelo y la cámara para
pruebas automáticas en el navegador.
