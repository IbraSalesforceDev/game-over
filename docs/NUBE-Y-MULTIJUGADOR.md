# Nube y multijugador — planteamiento

Documento para **decidir**, no para ejecutar. Nada de esto está empezado: no hay
proyecto de Supabase, ni tablas, ni una línea de código de red.

> ## Restricción dura: plan gratis, siempre
>
> Todo lo que sigue está pensado para caber en el **plan Free de Supabase** y no
> salir de ahí nunca. No es una preferencia: es el marco. Cualquier diseño que
> solo funcione pagando queda descartado de entrada, por bueno que sea.

Las dos cosas se plantean juntas porque comparten una pieza: **el blob del
mundo**. El mismo `Uint8Array` que sube a la nube es el que se le manda a quien
se une a una partida. Hacer la nube primero deja el multijugador más barato.

---

## Resumen

| | Nube | Multijugador |
|---|---|---|
| ¿Cabe en el plan gratis? | **Sí, con muchísimo margen** | **Sí, pero solo por WebRTC** |
| Dificultad | Baja. El punto de fuga ya existe | Alta. Lo más grande del proyecto |
| Impacto en fps | Ninguno si se hace bien | Medio: hay que predecir y reconciliar |
| Qué toca | 1 fichero nuevo + login | 43 ficheros tocan al jugador; 132 referencias solo en `main.ts` |
| Tamaño | ~4 versiones | ~6–8 versiones, con riesgo real |

**El plan gratis no impide nada de esto.** Pero impone tres cosas que hay que
diseñar desde el principio, no parchear después:

1. **La partida no puede ir por Supabase Realtime.** Sale a 2,3 horas de juego
   al mes. Tiene que ir por WebRTC.
2. **El proyecto se pausa solo si no se usa en 7 días.** Hace falta un latido.
3. **Pasarse de cuota puede restringir la organización entera**, incluido tu
   otro proyecto. Hay que aislarlo.

---

## El presupuesto del plan gratis

Cuotas reales, comprobadas en la documentación:

| Recurso | Cuota gratis | Lo que gastaríamos | Margen |
|---|---|---|---|
| Egress | 5 GB sin caché + 5 GB con caché | 129 KB por carga de mundo | **~38 000 cargas/mes** |
| Almacenamiento | 1 GB | 129 KB por partida | **~7 700 partidas guardadas** |
| Base de datos | 500 MB por proyecto | solo fichas de metadatos | irrelevante |
| Usuarios activos | 50 000 MAU | tú y tus amigos | irrelevante |
| Mensajes Realtime | 2 M/mes | **solo señalización**, ~50 por partida | **~40 000 partidas/mes** |
| Conexiones Realtime | 200 pico | 3 | irrelevante |

**Con la partida fuera de Realtime, el plan gratis sobra por dos órdenes de
magnitud.** El techo real llega sobre los **~100 jugadores habituales**, y aun
eso se estira mucho con lo que cuento más abajo sobre la caché.

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

Y la duda razonable: *un mundo jugado, con todo picado, ¿no se hincha?* Cada
tile picado parte una tirada de RLE en dos. Medido tocando tiles al azar:

| Tocado | pequeño | grande |
|---|---|---|
| 0 % | 41 KB | 121 KB |
| 0,5 % | 45 KB | 129 KB |
| 2 % | 48 KB | 129 KB |
| 5 % | 48 KB | 129 KB |

**No se hincha.** El deflate se come la fragmentación del RLE: entre un mundo
recién nacido y uno con 120 000 tiles removidos hay un 7 %, y a partir del 2 %
la curva es plana. El peso de una partida lo acota el tamaño del mundo, no las
horas jugadas. Esto es lo que hace que quepa de sobra en 1 GB.

## Rendimiento: dónde está el problema de verdad

La respuesta corta a *«¿cómo afecta al rendimiento?»* es: **la red no afecta al
frame**. `guardar()` ya es una promesa que corre fuera del tick, y cambiar
IndexedDB por una petición HTTPS no añade un milisegundo al bucle.

El problema está en otro sitio y **ya existe hoy**: `empaquetar()` corre en el
hilo principal y cuesta de 36 a 259 ms. Cada 30 segundos, el juego se congela
ese rato. En pequeño no se nota; en titánico son quince frames perdidos.

Tres cosas que hacer, y solo una tiene que ver con la nube:

1. **Empaquetar en un Web Worker.** Se le pasa una copia de las tres capas y él
   hace el RLE y el deflate. Copiar 4 MB (pequeño) o 50 MB (titánico) es un
   `memcpy`, mucho más rápido que comprimir. Arregla un tirón que hay hoy, con
   nube o sin ella, y conviene hacerlo **antes**.
2. **Dos cadencias.** IndexedDB sigue cada 30 s, que es local y gratis. A la nube
   se sube al cerrar, al ocultar la pestaña, con `F2` y cada 5 minutos.
3. **Nunca bloquear la interfaz esperando a la nube.** Sin red se guarda local y
   se marca «pendiente de subir». El juego no se entera.

## Tres cosas del plan gratis que hay que diseñar desde el principio

### 1. El proyecto se pausa solo a los 7 días

Es el límite que más molesta y el que no había mirado. **Supabase pausa los
proyectos del plan gratis que llevan una semana con poca actividad de base de
datos.** Si no juegas una semana, al volver no puedes ni entrar: hay que ir al
panel y pulsar «Resume». Avisan por correo una semana antes, y hay 90 días para
restaurar, así que no se pierde nada — pero es una piedra en el camino cada vez.

La documentación dice que **«unas pocas peticiones al día bastan»** para
evitarlo. La solución, y también gratis:

> **Un workflow programado de GitHub Actions** que cada pocas horas haga una
> consulta trivial a la base de datos. El repositorio es público, así que los
> minutos de Actions son gratis e ilimitados.

Es mejor que un cron de Vercel, que en el plan Hobby solo permite una ejecución
al día. Único cuidado: GitHub desactiva los workflows programados de un repo sin
actividad en 60 días, cosa que aquí no pasa.

### 2. Organización nueva, no solo proyecto nuevo

Dos detalles que se combinan mal:

- **Las cuotas son por organización**, sumando todos sus proyectos.
- La Fair Use Policy, cuando te pasas de cuota repetidamente, aplica
  restricciones **a todos los proyectos de esa organización**: pausarlos,
  ponerlos en solo lectura o responder 402 a todo.

O sea: si algún día el juego se pasara de egress, se llevaría por delante **tu
otro proyecto**. Y como tienes derecho a **dos proyectos gratis**, que cuentan
sobre todas las organizaciones donde seas Owner:

> **Recomendación: crear una organización Free nueva con un solo proyecto
> dentro, solo para el juego.** No cuesta nada, le da al juego su propia cuota
> completa de 5 GB y 2 M de mensajes, y aísla del todo tu proyecto de siempre.

### 3. La caché sube el techo

De las cuotas, la que se agotaría antes es el egress: 5 GB son ~38 000 cargas de
mundo. Se estira casi sin coste haciendo que **IndexedDB siga siendo el almacén
y la nube la copia**: al abrir una partida solo se descarga si la ficha dice que
la copia de la nube es **más nueva** que la local. En el uso normal —un
dispositivo— eso son **cero bytes de egress**, y solo se paga al cambiar de
aparato. Y esa comparación hace falta igualmente para resolver conflictos, así
que no es trabajo extra: es el mismo trabajo bien colocado.

## Lo que sí cuesta trabajo

No es el adaptador. Es esto:

- **Login.** Correo y contraseña más invitado con sesión anónima, enlazable
  después sin perder partidas (ya estaba decidido). Pantalla, validación,
  recuperar contraseña y el estado «sin conexión» en toda la interfaz.
- **Conflictos.** El mismo mundo abierto en el móvil y en el portátil. Hace falta
  un `actualizado` por partida y un diálogo honesto: «la copia de la nube es más
  nueva, ¿cuál te quedas?». Perder una partida por resolver esto a la ligera es
  el peor fallo posible del bloque.
- **Offline de verdad.** Cola de subidas pendientes, reintentos, y qué pasa si te
  quedas sin red a media partida. **Bien hecha, es más trabajo que todo lo demás
  junto.**

## Reparto

| | Qué |
|---|---|
| **Versión A** | Empaquetar en worker. Independiente de la nube; arregla un tirón de hoy |
| **Versión B** | Login: correo/contraseña + invitado |
| **Versión C** | `SupabaseSaveAdapter`, tabla + bucket, RLS por usuario, selector local/nube, y el latido de GitHub Actions |
| **Versión D** | Conflictos, caché por fecha y cola offline |

---

# Parte 2 — Multijugador de 2 a 3 jugadores

## Tres modelos, y por qué descarto dos

**1. Lockstep determinista** (solo se mandan las teclas; cada uno simula lo
mismo). Ancho de banda ridículo y elegante sobre el papel. **Descartado:** hay
**33 llamadas a `Math.random()`** repartidas por el runtime —enemigos,
partículas, botín, audio— y basta una para que dos navegadores se separen. Una
desincronización en lockstep además es silenciosa: no falla nada, simplemente
cada uno ve un juego distinto.

**2. Servidor autoritario de verdad.** Lo correcto para un juego serio.
**Descartado:** hace falta un proceso Node con un bucle a 60 Hz, y eso no es
Vercel ni Supabase — las Edge Functions son petición-respuesta, no un bucle
persistente. Sería alquilar un servidor, y eso rompe la restricción de gratis.

**3. Anfitrión autoritario.** Un jugador hospeda: su navegador es la verdad. Los
demás mandan teclas y reciben instantáneas. **Es lo que hace Terraria**, encaja
con un juego servido como página estática y no cuesta nada. Es lo que propongo.

## El transporte: aquí el plan gratis decide, no opina

**Supabase Realtime cobra por mensaje, y un broadcast cuenta 1 enviado + 1 por
cada cliente que lo recibe.** Con 3 jugadores, instantáneas a 20 Hz y teclas a
30 Hz:

```
anfitrión → 2 clientes:  20/s × 3 mensajes = 60/s
2 clientes → anfitrión:  2 × 30/s × 3      = 180/s
                                    total ≈ 240 mensajes/s
                                          = 864 000 por hora jugada
```

Con 2 M de mensajes al mes en el plan gratis, eso son **2,3 horas de juego al
mes**. Bajar a 10 Hz solo lo dobla a 4,6 horas.

> **Meter la partida por Realtime no es que sea caro: es que es imposible dentro
> del plan gratis.** No hay ajuste de frecuencia que lo salve.

**La única salida, y además la mejor: WebRTC.** Los datos de partida van por
`RTCDataChannel`, directos entre navegadores. Latencia menor, y **coste cero
porque no pasan por ningún servidor de nadie**. Supabase Realtime se usa solo
para lo que sí sabe hacer barato: **señalización** —intercambiar la oferta y las
candidatas ICE al conectar—, que son unas decenas de mensajes por partida en vez
de un millón por hora. Eso deja las 2 M de mensajes en ~40 000 partidas al mes.

### El TURN también sale gratis

El pero clásico de WebRTC es que entre un 10 % y un 20 % de las redes domésticas
no consiguen conexión directa y necesitan un servidor TURN de relevo. Lo he
mirado, porque era el único cabo suelto que podía obligar a pagar:

- **STUN de Cloudflare** (`stun.cloudflare.com`): gratis e ilimitado.
- **TURN de Cloudflare Realtime**: 0,05 $/GB **con los primeros 1 000 GB al mes
  gratis**.

Una partida de tres relayada entera por TURN gasta unos **86 MB a la hora**. Con
1 000 GB gratis al mes eso son más de **11 000 horas de juego**. En la práctica,
gratis.

**Conclusión: el multijugador entero cabe en planes gratuitos.** Supabase Free
para señalizar y guardar, Cloudflare Free para STUN/TURN, y el resto entre
navegadores.

## Qué se manda y cuánto ocupa

Solo el anfitrión simula.

| Qué | Cuándo | Tamaño |
|---|---|---|
| Teclas y ratón de cada cliente | 30 Hz | ~8 B |
| Instantánea: 3 jugadores | 20 Hz | ~36 B |
| Instantánea: bichos a la vista (~25) | 20 Hz | ~250 B |
| Instantánea: proyectiles | 20 Hz | ~80 B |
| Un tile picado o puesto | cuando pasa | ~6 B, fiable |
| Un cofre que cambia | cuando pasa | variable, fiable |
| El mundo entero, al unirse | una vez | **41–345 KB** |

Alrededor de **8 KB/s por cliente**. El envío del mundo al unirse reutiliza
`empaquetar()` tal cual, troceado en bloques de 16 KB por el canal.

Lo que **no** se manda, porque cada uno lo calcula: la luz (ya se calcula solo
para la ventana visible), las partículas, el audio, la cámara y todo el dibujo.

## Lo difícil, dicho claro

1. **Predicción y reconciliación.** Si tu personaje espera a que el anfitrión le
   conteste, se mueve con 100 ms de retraso y es injugable. Hay que simularlo en
   local y corregirlo cuando llega la instantánea. Es la parte más delicada de
   todo esto. **A favor:** la física ya es un paso fijo determinista de funciones
   puras, que es justo lo que hace esto posible.
2. **El jugador deja de ser único.** 132 referencias a `jugador` en `main.ts`, 43
   ficheros que lo tocan. No es difícil, es largo, y es donde se cuelan los
   fallos tontos.
3. **El guardado cambia.** Hoy guarda *un* jugador. Con tres hacen falta
   posición, inventario, equipo y vida por cada uno: formato **v17**, con la
   regla de siempre (campo nuevo al final).
4. **Arbitrar peleas por lo mismo.** Dos jugadores abriendo un cofre o cogiendo
   el mismo objeto. Lo resuelve el anfitrión, caso a caso.
5. **Si el anfitrión cierra la pestaña, se acaba la partida para todos.** Es la
   contrapartida del modelo y no la voy a maquillar. Se mitiga guardando en la
   nube al cerrar.
6. **Líquidos.** Sincronizarlos es carísimo. Propuesta: cada uno los simula en
   local como adorno y el daño de la lava lo dicta el anfitrión. Diverge un poco
   visualmente; nadie lo nota.

## Reparto, y una propuesta para verlo funcionando antes

| | Qué | Por qué |
|---|---|---|
| **Fase A** | Dos jugadores en el mismo mundo: conexión, envío del mundo, movimiento con predicción, picar y colocar. **Sin bichos.** | Quita más de la mitad del trabajo —bichos, jefes, botín, arbitrar daño— y ya deja algo real: construir juntos. Y prueba lo difícil cuanto antes |
| **Fase B** | Bichos, combate, botín, cofres, jefes y sucesos con el anfitrión de árbitro | Lo que queda, ya con transporte y predicción probados |
| **Fase C** | El tercer jugador, reconexión y el guardado v17 con estado por jugador | |

Si la fase A sale mal, se ha perdido una fracción del esfuerzo y se sabe pronto.

---

## Orden que recomiendo

1. **Empaquetar en un worker.** No depende de nada y arregla un tirón de hoy.
2. **Login.**
3. **Guardado en la nube**, con el latido y la caché por fecha desde el principio.
4. **Multijugador, fase A.**

No al revés: el multijugador necesita cuentas para saber quién es quién y el blob
del mundo para que alguien se una. Las dos cosas las deja hechas la nube.

## Lo que hace falta decidir

1. **¿Organización Free nueva solo para el juego?** Recomiendo que sí: cuesta
   cero, duplica la cuota disponible y protege tu otro proyecto de la Fair Use
   Policy. Gasta el segundo de tus dos proyectos gratis.
2. **¿El latido por GitHub Actions?** Es la forma gratis de que el proyecto no se
   pause a los 7 días. Recomiendo que sí, desde el primer día.
3. **¿Fase A sin bichos, o multijugador completo de una vez?** Recomiendo la
   fase A.
4. **¿Hasta dónde llega el offline?** Desde «sin red no hay nube» hasta una cola
   de sincronización completa. Es lo que más cambia el tamaño de la parte 1.

Lo que **ya no** hace falta decidir, porque el plan gratis lo decide solo:
el transporte es WebRTC con Cloudflare para STUN/TURN, y Supabase Realtime se
queda únicamente para señalizar.
