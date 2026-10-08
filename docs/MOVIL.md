# Jugar desde el móvil

El juego se pensó para teclado y ratón, y la capa de entrada se separó desde el
principio para poder enchufar el dedo más tarde. Este documento recoge cómo se
ha hecho, qué se decidió y por qué, y qué queda.

## Qué decide si se juega con el dedo

`src/engine/dispositivo.ts`. No se mira qué aparato es (`userAgent`), sino con
qué se apunta sobre todo, que es lo que importa:

- `(pointer: coarse)` — el puntero principal es un dedo.
- `(hover: none)` — no se puede estar encima de algo sin tocarlo.

Hacen falta las dos. Un portátil con pantalla táctil se puede tocar, pero se
juega con ratón y sigue siendo escritorio. Un iPad dice ser un Mac desde iPadOS
13, y por eso preguntar «¿es un iPhone?» habría fallado justo ahí.

El resultado es la clase `tactil` en el `<html>`, y todo lo demás cuelga de ella.
En **Ajustes → Controles** se puede forzar un modo (táctiles, o teclado y ratón)
por si la detección se equivoca. Los dos modos aceptan las dos cosas: en modo
táctil el teclado sigue funcionando, y en escritorio tocar la pantalla es un
clic. Lo que cambia es lo que se enseña.

## Las decisiones de diseño

Se acordaron antes de escribir código, y son las que dan forma a todo lo demás.

1. **Solo en horizontal.** En vertical el mundo se ve por una rendija y la barra
   de objetos no cabe. Al girar a vertical sale un aviso que tapa la pantalla, y
   el juego se pausa detrás para que no te maten mientras.
2. **Joystick flotante abajo a la izquierda y botón de saltar abajo a la
   derecha.** El joystick aparece donde se apoya el pulgar: no hay que buscarlo,
   y cada mano lo pone a su altura. Mantener saltar salta más alto, como la tecla.
3. **Tocar el mundo, y lo que llevas en la mano decide.** Con el dedo no hay
   clic izquierdo y derecho, así que el objeto en la mano elige: el pico pica, un
   bloque se coloca, la espada golpea hacia ese lado, la comida se come. Es lo que
   hace Terraria en el móvil. La única ambigüedad son las cosas que se abren —un
   cofre, una mesa, una cama— cuando llevas algo que pica, y ahí decide el
   tiempo: un toque corto abre y mantener el dedo rompe. Ver `src/engine/gesto.ts`.
4. **Pocos botones fijos.** Mochila, pausa y «más», en el borde derecho. Lo que
   se usa de vez en cuando —mapa, bloque o pared, poder, zoom, duelo, ajustes—
   va dentro de «más». Cada botón permanente es un trozo de mundo tapado.
5. **El escritorio no cambia.** Sin la clase `tactil`, los controles existen pero
   no se ven, y el ratón funciona exactamente igual que antes.

Los botones de la pantalla no hacen nada por sí mismos: pulsan el atajo de
teclado que ya existe (`entrada.pulsar('KeyE')`). Así cada acción vive en un solo
sitio y un botón no puede hacer algo distinto que su tecla.

## Instalarlo en el móvil

Es una aplicación web instalable (PWA):

- `public/manifest.webmanifest` — nombre, pantalla completa, horizontal, iconos.
- Los iconos se dibujan por código al compilar (`herramientas/iconos.ts`, a
  través de un plugin en `vite.config.ts`). No hay imágenes en el repositorio:
  todo el arte del juego sale de código, y el icono no es la excepción.
- `public/sw.js` — el service worker. La página se pide primero a la red (una
  versión nueva llega al momento) y el resto primero a la copia (llevan huella en
  el nombre, así que nunca se quedan viejos). Lo de otros dominios —Supabase y la
  sala del multijugador— no se toca. Solo se registra en la versión publicada:
  en desarrollo se interpondría con Vite.

**En el iPhone:** Safari → Compartir → Añadir a pantalla de inicio. Se abre a
pantalla completa, sin barras, y funciona sin conexión.

> **Ojo con los mundos locales.** En iPhone, la aplicación instalada guarda sus
> datos aparte de Safari. Un mundo creado en Safari **sin cuenta** no aparece en
> la aplicación instalada, ni al revés. Los mundos de la nube sí, porque están
> en la cuenta y no en el navegador.

## Entregas

### Entrega 1 — jugable (7.15.0) ✔

- Detección del modo y ajuste manual.
- Joystick, saltar, tocar el mundo con la regla de la mano, toque corto o
  mantener en lo que se abre.
- Mochila, pausa y «más».
- Aviso de girar el móvil, con pausa.
- La mochila recolocada para que quepa entera en horizontal: ranuras de 36 px y
  los paneles en fila (equipo, inventario, fabricación). Con la mochila abierta,
  el botón de saltar se cambia por «Cerrar».
- Zonas seguras del iPhone (la isla y las esquinas redondeadas).
- Ayuda propia para el dedo.
- Instalable y sin conexión.

Probado en Chromium simulando un móvil de 844 × 390 con toques reales: andar con
el joystick, picar manteniendo el dedo, colocar un bloque con un toque, el menú
«más», la mochila y el aviso de girar. Y en escritorio, que el ratón sigue
picando igual y que el ajuste cambia de modo en caliente.

### Entrega 2 — cómoda

- Fichas de los objetos al mantener el dedo sobre una ranura (hoy salen al pasar
  el ratón por encima, y con el dedo no hay «encima»).
- Zoom pellizcando.
- Arrastrar objetos en la mochila, además de tocar y tocar.
- Repasar los paneles que quedan: el mapa, el cofre con la fabricación abierta y
  el taller de una estación, que en un móvil van justos de alto.

### Entrega 3 — según lo que se vea en un iPhone de verdad

- Rendimiento: si va justo, bajar la resolución de dibujo por defecto en móvil.
- Apuntado automático como opción (picar el bloque más cercano hacia donde
  empuja el joystick).
- Multijugador desde el móvil: reconexión automática tras un corte breve (hoy un
  corte de un segundo saca al invitado de la partida) y, si con datos móviles no
  conecta, un servidor TURN. Ver `NUBE-Y-MULTIJUGADOR.md`.

## Lo que no se ha podido comprobar aquí

- **Un iPhone de verdad.** Las zonas seguras (`env(safe-area-inset-*)`) valen 0
  en el navegador de pruebas, así que la isla solo se ve en un aparato real.
- **El rendimiento.** El navegador de pruebas no tiene tarjeta gráfica y sus
  fotogramas por segundo no dicen nada de un móvil.
- **Safari.** Las pruebas van con Chromium. Safari tiene sus manías con los
  gestos —por eso se anulan `gesturestart` y compañía—, y solo se ven en Safari.
