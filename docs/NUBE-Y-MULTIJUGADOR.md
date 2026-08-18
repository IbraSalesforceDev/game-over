# Nube y multijugador — planteamiento

Documento para **decidir**, no para ejecutar. Nada de esto está empezado: no hay
proyecto de Supabase, ni tablas, ni una línea de código de red. Lo que sigue son
los números medidos, las opciones reales y lo que cuesta cada una.

Las dos cosas se plantean juntas porque comparten una pieza: **el blob del
mundo**. El mismo `Uint8Array` que sube a la nube es el que se le manda a quien
se une a una partida. Hacer la nube primero deja el multijugador más barato.

---

## Resumen

| | Nube | Multijugador |
|---|---|---|
| Dificultad | **Baja.** El punto de fuga ya existe | **Alta.** Lo más grande del proyecto hasta hoy |
| Impacto en fps | **Ninguno** si se hace bien | Medio: hay que predecir y reconciliar |
| Coste al mes | **0 €** de sobra dentro del plan gratis | **0 €** si el juego va por WebRTC. **~2 €/hora jugada** si va por Supabase Realtime |
| Qué toca | 1 fichero nuevo + login | 43 ficheros tocan al jugador; 132 referencias solo en `main.ts` |
| Tamaño | ~3 versiones | ~6–8 versiones, y con riesgo real |

La conclusión corta: **la nube es barata y sin sorpresas; el multijugador es
caro pero factible, y hay una decisión de transporte que cambia el coste de cero
a insostenible.**

---

# Parte 1 — De IndexedDB a Supabase

## Lo que ya está resuelto

Esto se preparó en la fase 4 y aguanta:

```ts
export interface SaveAdapter {
  listar(): Promise<MetaMundo[]>;
  cargar(id: string): Promise<Uint8Array>;
  guardar(id: string, meta: MetaMundo, datos: Uint8Array): Promise<void>;
  borrar(id: string): Promise<void>;
}
```

Cuatro métodos, todos asíncronos desde el primer día, y el mundo viaja como
`Uint8Array` opaco. **El motor no sabe dónde acaban los bytes.** Escribir un
`SupabaseSaveAdapter` es implementar esa interfaz y nada más: cero líneas
tocadas en `world/`, `entities/`, `render/` o `items/`.

## Los números, medidos

No son estimaciones: he generado un mundo de cada tamaño y lo he empaquetado con
el `empaquetar()` real.

| Tamaño | Tiles | Guardado | Generar | Empaquetar |
|---|---|---|---|---|
| pequeño 1400×450 | 0,63 M | **41 KB** | 216 ms | 36 ms |
| mediano 2100×600 | 1,26 M | **68 KB** | 328 ms | 41 ms |
| grande 3200×750 | 2,40 M | **116 KB** | 625 ms | 98 ms |
| enorme 4800×900 | 4,32 M | **193 KB** | 1066 ms | 147 ms |
| titánico 7200×1200 | 8,64 M | **345 KB** | 2014 ms | 259 ms |

Y una duda razonable: *un mundo jugado, con todo picado, ¿no se hincha?* Cada
tile picado parte una tirada de RLE en dos. Lo he medido tocando tiles al azar:

| Tocado | pequeño | grande |
|---|---|---|
| 0 % | 41 KB | 121 KB |
| 0,5 % | 45 KB | 129 KB |
| 2 % | 48 KB | 129 KB |
| 5 % | 48 KB | 129 KB |

**No se hincha.** El deflate se come la fragmentación del RLE: entre un mundo
recién nacido y uno con 120 000 tiles removidos hay un 7 % de diferencia, y a
partir del 2 % la curva es plana. El tamaño de una partida está acotado por el
tamaño del mundo, no por cuánto se juegue.

## Rendimiento: dónde está el problema de verdad

La respuesta corta a *«¿cómo afecta al rendimiento?»* es: **la red no afecta al
frame**. `guardar()` ya es una promesa, ya se llama fuera del tick, y cambiar
IndexedDB por una petición HTTPS no añade un milisegundo al bucle. Lo que tarde
la red le pasa a la promesa, no al jugador.

El problema está en otro sitio y **ya existe hoy**: `empaquetar()` corre en el
hilo principal y cuesta de 36 a 259 ms. Cada 30 segundos, el juego se congela
ese rato. En pequeño no se nota; en titánico son quince frames perdidos.

Tres cosas que hay que hacer, y solo una tiene que ver con la nube:

1. **Empaquetar en un Web Worker.** Se le pasa una copia de las tres capas y el
   worker hace el RLE y el deflate. Copiar 4 MB (pequeño) o 50 MB (titánico) es
   un `memcpy`, muchísimo más rápido que comprimir. Esto arregla un tirón que
   hay hoy, con nube o sin ella, y conviene hacerlo **antes**.
2. **Dos cadencias distintas.** IndexedDB sigue guardando cada 30 s, que es
   local y gratis. A la nube se sube al cerrar, al ocultar la pestaña, con `F2`
   y cada 5 minutos. La nube es la copia de seguridad, no el camino caliente.
3. **Nunca bloquear la interfaz esperando a la nube.** Si no hay red, se guarda
   local y se marca «pendiente de subir». El juego no se entera.

## Lo que cuesta en Supabase

Con las cuotas del plan gratis (comprobadas en la documentación, no de memoria):

- **Egress: 5 GB sin caché + 5 GB con caché al mes.** Subir no cuenta, solo
  bajar. Cargar un mundo grande son 129 KB: harían falta **~40 000 cargas al
  mes** para agotar la cuota.
- **Almacenamiento:** veinte mundos grandes con tres copias cada uno son 8 MB.
- **Usuarios activos:** la cuota gratis son 100 000.

**Coste real: cero, y por muchísimo margen.** El plan gratis no es el límite
aquí ni de lejos.

## Lo que sí cuesta trabajo

No es el adaptador. Es esto:

- **Login.** Correo y contraseña más invitado con sesión anónima, enlazable
  después sin perder partidas (esto ya estaba decidido). Pantalla, validación,
  recuperar contraseña, y el estado «sin conexión» en toda la interfaz.
- **Conflictos.** El mismo mundo abierto en el móvil y en el portátil. Hace
  falta un `actualizado` por partida y un diálogo honesto: «la copia de la nube
  es más nueva, ¿cuál te quedas?». Perder una partida por resolver esto a la
  ligera es el peor fallo posible del bloque.
- **Offline de verdad.** IndexedDB pasa a ser caché, no almacén. Cola de
  subidas pendientes, reintentos, y qué pasa si te quedas sin red a media
  partida. **Esta parte, bien hecha, es más trabajo que todo lo demás junto.**

## Reparto

| | Qué |
|---|---|
| **Versión A** | Empaquetar en worker (independiente de la nube, arregla un tirón de hoy) |
| **Versión B** | Login: correo/contraseña + invitado. Sin tocar el guardado todavía |
| **Versión C** | `SupabaseSaveAdapter`, tabla `partidas` + bucket, RLS por usuario, y el selector local/nube en el menú |
| **Versión D** | Conflictos, cola offline y «pendiente de subir» |

---

# Parte 2 — Multijugador de 2 a 3 jugadores

## Tres modelos, y por qué descarto dos

**1. Lockstep determinista** (solo se mandan las teclas; cada uno simula lo
mismo). Ancho de banda ridículo y elegante sobre el papel. **Descartado:** hay
**33 llamadas a `Math.random()`** repartidas por el runtime —enemigos,
partículas, botín, audio— y bastaría con una para que dos navegadores se
separaran. Y una desincronización en lockstep es silenciosa: no falla, es que
cada uno ve un juego distinto. Auditar los 33 sitios y sembrarlos todos es
posible, pero luego hay que garantizar que nadie vuelva a escribir
`Math.random()` nunca más, y el coste en punto flotante entre navegadores sigue
ahí.

**2. Servidor autoritario de verdad.** Lo correcto para un juego serio.
**Descartado por ahora:** hace falta un proceso Node corriendo un bucle a 60 Hz,
y eso no es Vercel ni es Supabase. Las Edge Functions son petición-respuesta, no
un bucle persistente. Sería alquilar y mantener un servidor.

**3. Anfitrión autoritario.** Un jugador hospeda: su navegador es la verdad. Los
demás mandan sus teclas y reciben instantáneas. **Es lo que hace Terraria**, es
lo que encaja con un juego servido como página estática, y es lo que propongo.

## El transporte: la decisión que cambia el coste

Aquí está el dato que decide el planteamiento, y es contraintuitivo.

**Supabase Realtime cobra por mensaje, y un broadcast cuenta 1 + 1 por cada
cliente que lo recibe.** Con 3 jugadores, instantáneas a 20 Hz y teclas a 30 Hz:

```
anfitrión → 2 clientes:  20/s × 3 mensajes = 60/s
2 clientes → anfitrión:  2 × 30/s × 3      = 180/s
                                    total ≈ 240 mensajes/s
                                          = 864 000 por hora jugada
```

Cuotas reales: **plan gratis 2 M mensajes/mes; Pro 5 M y después 2,50 $ por
millón.**

> **Traducido: 2,3 horas de juego al mes en el plan gratis, y unos 2 €
> por cada hora jugada a partir de ahí.** Para un juego que se juega a ratos con
> dos amigos, es inasumible.

Bajar a 10 Hz solo lo dobla a ~4,6 horas. **Meter la partida por Realtime no es
viable, y es mejor saberlo antes de escribirlo que después.**

**La salida: WebRTC.** Los datos de partida van por `RTCDataChannel`, directos
entre navegadores: latencia menor y **coste cero**, porque no pasan por ningún
servidor. Supabase Realtime se usa solo para lo que sí sabe hacer barato:
**señalización** —intercambiar la oferta y las candidatas ICE al conectar—, que
son unas decenas de mensajes por partida en vez de un millón por hora.

El pero honesto de WebRTC: entre un 10 % y un 20 % de las redes domésticas no
consiguen conexión directa y necesitan un servidor TURN de relevo, que sí cuesta
(o se usa un TURN gratuito con límites). Hay que decidir si se paga, si se usa
uno gratuito o si sencillamente se avisa de que esa conexión no se pudo
establecer.

## Qué se manda y cuánto ocupa

Solo el anfitrión simula. Lo que se manda:

| Qué | Cuándo | Tamaño |
|---|---|---|
| Teclas y ratón de cada cliente | 30 Hz | ~8 B |
| Instantánea: 3 jugadores | 20 Hz | ~36 B |
| Instantánea: bichos a la vista (~25) | 20 Hz | ~250 B |
| Instantánea: proyectiles | 20 Hz | ~80 B |
| Un tile picado o puesto | cuando pasa | ~6 B, fiable |
| Un cofre que cambia | cuando pasa | variable, fiable |
| El mundo entero, al unirse | una vez | **41–345 KB** |

Alrededor de **8 KB/s por cliente**. Nada para una conexión doméstica. El envío
del mundo al unirse reutiliza `empaquetar()` tal cual, troceado en bloques de
16 KB por el canal.

Lo que **no** se manda, porque cada uno lo calcula: la luz (ya se calcula solo
para la ventana visible), las partículas, el audio, la cámara y todo el dibujo.

## Lo difícil, dicho claro

1. **Predicción y reconciliación.** Si tu personaje espera a que el anfitrión le
   conteste, se mueve con 100 ms de retraso y el juego es injugable. Hay que
   simular tu movimiento en local y corregirlo cuando llega la instantánea. Es
   la parte más delicada de todo esto. **A favor:** la física ya es un paso fijo
   determinista de funciones puras, que es justo la condición que hace esto
   posible.
2. **El jugador deja de ser único.** 132 referencias a `jugador` en `main.ts` y
   43 ficheros que lo tocan. No es difícil, es largo, y es donde se cuelan los
   fallos tontos.
3. **El guardado cambia.** Hoy guarda *un* jugador. Con tres hacen falta
   posición, inventario, equipo y vida por cada uno: formato **v17**, con la
   regla de siempre (campo nuevo al final).
4. **Arbitrar peleas por lo mismo.** Dos jugadores abriendo un cofre o cogiendo
   el mismo objeto. Lo resuelve el anfitrión, pero hay que escribirlo caso a caso.
5. **Si el anfitrión cierra la pestaña, se acaba la partida para todos.** Es la
   contrapartida del modelo y no la voy a maquillar. Se mitiga guardando en la
   nube al cerrar, para que nadie pierda nada.
6. **Líquidos.** Simularlos en los tres y sincronizarlos es carísimo. Propuesta:
   cada uno los simula en local como adorno, y el daño de la lava lo dicta el
   anfitrión. Diverge un poco visualmente; nadie lo nota.

## Reparto, y una propuesta para verlo funcionando antes

Recomiendo partirlo en dos mitades, y que la primera **excluya el combate**:

| | Qué | Por qué |
|---|---|---|
| **Fase A** | Dos jugadores en el mismo mundo: conexión, envío del mundo, movimiento con predicción, picar y colocar sincronizados. **Sin bichos.** | Quita más de la mitad del trabajo —bichos, jefes, botín, arbitrar daño— y ya deja algo real: construir juntos. Y prueba lo difícil (la predicción) cuanto antes |
| **Fase B** | Bichos, combate, botín, cofres, jefes y sucesos con el anfitrión de árbitro | Lo que queda, ya con el transporte y la predicción probados |
| **Fase C** | El tercer jugador, reconexión, y el guardado v17 con estado por jugador | |

Si la fase A sale mal, se ha perdido una fracción del esfuerzo y se sabe pronto.

---

## Orden que recomiendo

1. **Empaquetar en un worker.** No depende de nada, arregla un tirón que hay hoy
   y le quita un obstáculo a todo lo demás.
2. **Login.**
3. **Guardado en la nube.** Aquí ya se sale de prealfa en dos de los tres
   frentes.
4. **Multijugador, fase A.**

Y no al revés: el multijugador necesita cuentas para saber quién es quién, y
necesita el blob del mundo para que alguien se una. Las dos cosas las deja
hechas la nube.

## Lo que hace falta decidir

1. **¿Proyecto de Supabase propio o el que ya existe con prefijo?** Uno nuevo
   cuesta 0 €/mes y no mezcla nada. Recomiendo uno nuevo.
2. **¿WebRTC con Supabase solo de señalización, o Realtime para todo?** Lo
   segundo son ~2 €/hora jugada. Recomiendo lo primero, sabiendo que hay que
   resolver el TURN.
3. **Del TURN: ¿se paga, se usa uno gratuito con límites, o se avisa y ya?**
4. **¿La fase A sin bichos, o multijugador completo de una vez?** Recomiendo la
   fase A.
5. **¿Hasta dónde llega el offline?** Desde «si no hay red, no hay nube» hasta
   una cola de sincronización completa. Cambia mucho el tamaño de la parte 1.
