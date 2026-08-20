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

> **Un workflow programado de GitHub Actions** que haga una consulta trivial a la
> base de datos. El repositorio es público, así que los minutos de Actions son
> gratis e ilimitados.

Es mejor que un cron de Vercel, que en el plan Hobby solo permite una ejecución
al día. Único cuidado: GitHub desactiva los workflows programados de un repo sin
actividad en 60 días, cosa que aquí no pasa.

**Sobre la frecuencia: cada dos días se queda corto.** La documentación habla de
*«unas pocas peticiones **cada día** durante la semana anterior»*, así que dejar
48 h de hueco es apurar justo el criterio que ellos describen. Y hay un segundo
motivo: los cron de GitHub Actions **no son puntuales** —bajo carga se retrasan e
incluso se saltan ejecuciones—, así que la frecuencia real es menor que la
programada. Como no cuesta nada:

> **Recomendación: cada 12 horas.** Dos latidos al día, con margen de sobra para
> que se salte alguno sin consecuencias. El mismo workflow aprovecha para borrar
> los usuarios invitados caducados (ver la sección de seguridad).

### 2. Organización: sí se puede tener otra, pero es opcional

Lo que hay hoy en la cuenta, comprobado: **una organización** (`Nordack's Org`)
con **un proyecto** dentro (`IbraSalesforceDev's Project`, en `eu-central-1`).
O sea, va **1 de los 2 proyectos gratis**.

Sobre si se puede tener más de una organización: **sí**. La documentación lo dice
literalmente — *«podrías tener dos organizaciones Free con un proyecto cada una,
o una organización Free con dos proyectos»*. El límite de dos es de **proyectos**,
no de organizaciones. Lo que no puedo hacer **yo** es crearla: no existe
herramienta para crear organizaciones, solo proyectos, así que ese paso es tuyo
desde el panel (gratis, un minuto).

¿Por qué recomendarla, entonces? Por dos cosas que se combinan mal:

- **Las cuotas son por organización**, sumando todos sus proyectos.
- La Fair Use Policy, cuando te pasas de cuota repetidamente, aplica
  restricciones **a todos los proyectos de esa organización**: pausarlos, dejarlos
  en solo lectura o responder 402 a todo.

O sea: si algún día el juego se pasara de egress, se llevaría por delante **tu
otro proyecto**.

> **Pero es un seguro, no una necesidad.** Con dos órdenes de magnitud de margen
> en todas las cuotas, la probabilidad de rozar la Fair Use jugando tú y dos
> amigos es prácticamente nula. Si prefieres no complicarte: **un segundo
> proyecto en la organización que ya tienes vale**, y se puede mover a otra
> organización más adelante sin perder nada (Supabase permite transferir
> proyectos). La recomendación se mantiene, pero no es un bloqueo.

### 3. La caché sube el techo

De las cuotas, la que se agotaría antes es el egress: 5 GB son ~38 000 cargas de
mundo. Se estira casi sin coste haciendo que **IndexedDB siga siendo el almacén
y la nube la copia**: al abrir una partida solo se descarga si la ficha dice que
la copia de la nube es **más nueva** que la local. En el uso normal —un
dispositivo— eso son **cero bytes de egress**, y solo se paga al cambiar de
aparato. Y esa comparación hace falta igualmente para resolver conflictos, así
que no es trabajo extra: es el mismo trabajo bien colocado.

## El modelo: cada mundo es de un sitio, nunca de los dos

Esta es **la decisión de diseño que más trabajo ahorra de todo el documento**, y
sustituye a lo que había aquí antes (una sincronización bidireccional con
resolución de conflictos).

> **Un mundo o es local o es de la nube. Nunca las dos cosas a la vez.**
>
> - **Mundo local** — como hoy: IndexedDB, sin cuenta, sin conexión, tuyo y ya.
> - **Mundo en la nube** — vive en el servidor, pide login, y el anfitrión decide
>   quién entra.
> - **Subir un mundo local a la nube es una acción explícita y de ida.** A partir
>   de ese momento, ese mundo es de la nube.

Lo que esto elimina: **no hay conflictos que resolver, nunca.** Cada mundo tiene
en todo momento **una sola copia con autoridad**. Se acabó el «¿cuál es más
nueva?», el mezclar, y la cola de sincronización. Era la parte que estaba marcada
como «más trabajo que todo lo demás junto», y con este modelo desaparece entera.

### Qué decide el anfitrión, a día de hoy (7.14.0)

La regla, dicha entera: **todo lo que es del mundo lo decide quien lo hospeda.**
Lo que es de cada jugador —su inventario, su vida, su armadura, sus pociones—
sigue siendo suyo.

Del mundo, y por tanto del anfitrión: los bloques, el agua, el reloj, los
sucesos, los bichos y a quién persiguen, los objetos del suelo y lo que hay
dentro de cada cofre. El invitado los recibe hechos y los pide cuando quiere
cambiarlos.

De cada uno: la mochila, la vida, la armadura y los efectos. Es un reparto a
medias y conviene decir por qué no está en el anfitrión también: llevar la vida
de todos allí pedía mandar armadura, efectos y pociones de cada uno en cada
tick, y esto es un juego para tres amigos, no un servidor público. Lo que sí
decide el anfitrión es lo único que no se puede falsear sin que se note: dónde
está cada cosa del mundo y quién ha llegado antes.

Con un matiz que se cerró en 7.12.4: los **efectos** sí viajan, del invitado al
anfitrión, porque hacen falta para dos cosas que decide el anfitrión —cómo se
mueve y cuánto pega—. Se manda la causa y no el resultado: los efectos con lo
que les queda, no «multiplico la velocidad por 1,2». Así el día que haya una
poción más, el protocolo no se entera.

Y otro que se cerró en 7.13.0: la **vida** también viaja, pero solo para verla.
Quien decide cuánta le queda a uno sigue siendo uno mismo —el anfitrión dice que
te han dado y cuánto pegaba lo que te tocó, y la armadura, el empujón y la muerte
los aplica cada uno en su casa—; lo que se manda es el número ya calculado, para
que los demás puedan pintar la barra. Es la diferencia entre autoridad y noticia:
de la vida ajena aquí solo llega la noticia.

Va en el mismo mensaje que los efectos (`MSG.ESTADO`, protocolo 9) porque se
cuentan igual —una foto cada poco, por el canal que no espera respuesta— y
porque casi siempre cambian a la vez: el veneno que baja la vida es uno de los
efectos que van en ese mismo mensaje. Vuelve a todos dentro de la instantánea,
en los mismos campos `vida`/`vidaMax` que ya llevaban los bichos.

El invitado la manda dos veces por segundo, y **cada seis ticks mientras esté
cambiando**: un golpe se ve venir en un tick, y esperar medio segundo a contarlo
deja la barra del compañero llena mientras se está muriendo. Cuando no llega
—alguien acaba de entrar, o juega con una versión anterior a la 7.13.0— no se
pinta barra en vez de pintar una a cero: una barra vacía diría «se está muriendo»
y una llena diría «está perfecto», y las dos mentirían.

### El duelo (7.14.0)

Dos jugadores pueden pegarse, y lo resuelve el anfitrión. No es una excepción al
reparto de arriba: es exactamente el mismo camino que un golpe de un bicho. El
anfitrión, que es el único que tiene a todos en la misma máquina, decide que a
alguien le han dado y cuánto pegaba lo que le tocó; la armadura, el empujón y la
muerte los aplica cada uno en su casa. Al anfitrión mismo se le aplica por la
misma función que usa un invitado al recibir un golpe de la red, para que un
mandoble se sienta igual desde los dos lados.

**Dos puertas, y hacen falta las dos.**

1. **El mundo.** De dificultad «normal» en adelante (`hayDuelo`, en
   `core/dificultad.ts`). Se pregunta por la fuerza del nivel y no por su id
   porque la fuerza es lo que significa: 1 es «lo hostil pega lo que tiene que
   pegar», y los tres niveles de debajo existen para poder aprender sin que te
   maten. Se elige al crear el mundo y no se puede cambiar.
2. **Las dos personas.** Cada uno tiene un interruptor, la tecla `G`, y el golpe
   solo entra si lo tienen encendido **quien pega y quien recibe**. Nace apagado
   en cada partida y no se guarda, a propósito: abrir el mundo y descubrir que
   puedes matar a tu amigo de un despiste, porque anoche hicisteis un duelo, es
   justo el accidente que el interruptor existe para evitar.

La segunda puerta no es una precaución teórica. El arco de un arma barre dos
tiles durante ocho ticks; dos personas picando el mismo túnel se alcanzan en casi
cada mandoble. Sin el acuerdo de los dos, «duelo» no sería una forma de jugar:
sería fuego amigo constante en una partida cooperativa, sin manera de apagarlo,
porque la dificultad ya está fijada.

El interruptor viaja en `MSG.ESTADO` —un byte de marcas, hoy con un solo bit— y
vuelve a todos en las banderas de la entidad, en el mismo bit (`BANDERA.DUELO`).
Se ve en dos sitios: el nombre sobre la cabeza en rojo, y unas espadas delante
del nombre en el panel de la esquina. Sin eso, encenderlo y que no pase nada
—porque el otro lo tiene apagado— se leería como que está roto.

**Lo que no entra: las flechas y las bombas.** Y no por falta de ganas, sino
porque los proyectiles no existen en la red: cada uno simula los suyos y no hay
clase de entidad para ellos en la instantánea. El anfitrión podría acertarle a un
invitado con una flecha, pero un invitado no podría acertarle al anfitrión, y esa
asimetría es peor que no tener flechas en el duelo. El día que los proyectiles
viajen —una clase más en la instantánea— entran por el mismo sitio que el
mandoble. Tampoco viaja el filo de las armas de jefe: el veneno o el robo de vida
se quedan en los bichos, porque aplicarle un efecto a otro jugador pide que los
efectos viajen del anfitrión hacia fuera, y hoy solo van hacia dentro.

### El corolario que faltaba: guarda el anfitrión, y solo él (7.11.1)

«Una sola copia con autoridad» no basta si los dos escriben en ella. Hasta
7.11.1, anfitrión e invitado autoguardaban los dos el mismo fichero cada minuto,
y el último en hacerlo dejaba dentro **su** mochila, **sus** cofres y **su**
vida. Los bloques sí iban sincronizados, así que el mundo salía bien; lo que se
pisaba era el estado del otro, y no se notaba hasta la siguiente vez que se abría
la partida.

Ahora, en un mundo de la nube, guarda solo quien lo hospeda. El invitado juega y
no escribe. Y mientras no se sepa quién es quién —sin red, sin sesión— **no
guarda nadie**: equivocarse en esa pregunta no estropea tu partida, estropea la
de otro.

### Un matiz: «solo en la nube» no debe significar «sin copia en disco»

Con una salvedad importante, y es por seguridad, no por sincronizar:

**Mientras juegas un mundo de la nube, se sigue escribiendo en IndexedDB cada 30
segundos**, igual que hoy, y a la nube se sube cada pocos minutos y al salir. La
copia local no es una copia rival: es un **buffer de escritura**. Sin ella, una
desconexión a media partida se lleva por delante la sesión entera.

Y esa misma copia es, gratis, la puerta de salida si algún día se quiere volver
al guardado local.

Eso deja **un único caso raro**, y se resuelve con una pregunta, no con un
algoritmo: si el juego se cierra mal después de guardar en local pero antes de
subir, al abrir se detecta que hay progreso sin subir. Un diálogo:

> *«Tienes progreso de esta partida sin subir. ¿Lo subes o lo descartas?»*

Nada de mezclar. Una pregunta, dos botones.

### Con 5–6 jugadores, el egress deja de ser un tema

Antes proponía una caché por fecha para no descargar el mundo cada vez. Con estos
números ya no hace falta ni para eso:

```
6 usuarios × 3 sesiones al día × 129 KB ≈ 2,3 MB/día ≈ 70 MB al mes
                                          contra 5 GB = 1,4 % de la cuota
```

Así que **se descarga el mundo al abrirlo y punto**. La copia local se queda solo
como red de seguridad, que es más fácil de explicar y de escribir.

## Invitaciones: dos tablas y ya

Para 5–6 personas invitadas, lo más simple que funciona:

| Tabla | Qué guarda |
|---|---|
| `partidas` | id, dueño, nombre, metadatos, `actualizado` |
| `miembros` | partida, usuario, rol |

El anfitrión genera un **código de invitación** y el invitado lo pega. Nada de
mandar correos para esto, que es un problema menos.

Y el RLS sale redondo porque encaja con el multijugador: **los miembros pueden
leer el blob, solo el dueño puede escribirlo.** Como en la partida solo el
anfitrión tiene autoridad, la escritura ya era de uno solo por naturaleza. Un
único escritor por mundo, impuesto por la base de datos.

## Lo que sí cuesta trabajo

- **Login.** Pantalla, validación, sesión, y el estado «sin conexión» en la
  interfaz. Ver más abajo, porque el «correo y contraseña» tiene una letra
  pequeña que cambia la decisión.
- **La subida a la nube**, con su barra de progreso y su «esto es de ida».
- **Los códigos de invitación** y la pantalla de miembros.

Ya **no** cuesta: conflictos, mezclas ni cola de sincronización.

## Letra pequeña del login: el correo cuesta un dominio

Ya estaba decidido «correo y contraseña + invitado», pero con gente de verdad
entrando aparece esto:

**El SMTP que Supabase trae solo entrega a las direcciones del equipo de tu
organización.** Para tus cinco o seis invitados, cualquier correo de confirmación
o de recuperar contraseña **no llega**. Y montar SMTP propio (Resend tiene plan
gratis de 3 000 al mes y 100 al día, de sobra) exige **un dominio verificado**,
que en un `*.vercel.app` no se puede hacer: habría que comprar un dominio, unos
10 € al año. Es poco dinero, pero rompe el «todo gratis».

Tres salidas, todas gratis:

| Opción | Qué implica |
|---|---|
| **Entrar con Google** (recomendada) | **Cero correos, cero SMTP, cero dominio.** Y para el usuario es un botón en vez de inventarse otra contraseña. Encaja perfecto con un grupo cerrado de seis |
| Correo y contraseña **sin confirmación** | Funciona y no manda ningún correo. A cambio, recuperar la contraseña lo tienes que hacer tú a mano desde el panel. Con seis personas conocidas, asumible |
| Comprar un dominio + Resend | Lo «correcto» del todo, ~10 €/año. Deja de ser gratis |

**Recomiendo Google + invitado**, y dejar el correo y contraseña para más
adelante si alguna vez entra gente de fuera del grupo.

## Reparto

| | Qué |
|---|---|
| **Versión A** | Empaquetar en worker. Independiente de la nube; arregla un tirón de hoy |
| **Versión B** | Login: correo/contraseña + invitado |
| **Versión C** | `SupabaseSaveAdapter`, tablas + bucket, RLS, subir un mundo a la nube, y el latido de GitHub Actions |
| **Versión D** | Códigos de invitación y miembros |

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

- **STUN de Cloudflare** (`stun.cloudflare.com`): gratis e ilimitado, **y sin
  cuenta de nada**.
- **TURN de Cloudflare Realtime**: 0,05 $/GB **con los primeros 1 000 GB al mes
  gratis**.

Una partida de tres relayada entera por TURN gasta unos **86 MB a la hora**. Con
1 000 GB gratis al mes eso son más de **11 000 horas de juego**. En la práctica,
gratis.

### Lo que el TURN sí exige, y no es solo darse de alta

Dos cosas que conviene saber antes de contar con él:

1. **Hace falta una cuenta de Cloudflare** (gratuita). Es tuya y la creas tú: no
   hay forma de que la genere yo, ni sería buena idea que una cuenta a tu nombre
   la abriera otro.
2. **La clave de TURN no puede vivir en el navegador.** Cloudflare da una clave
   larga que es un secreto de servidor, y con ella se acuñan credenciales
   **cortas y caducas** para cada jugador mediante una llamada de servidor a
   servidor. En una página estática como esta eso significa **un endpoint
   pequeño**: una Edge Function de Supabase (500 000 invocaciones gratis al mes)
   o una función serverless de Vercel. Poco código, pero no es «pegar una URL».

**Por eso el TURN se deja para cuando haga falta de verdad.** La fase A puede ir
**solo con STUN**, sin cuenta de Cloudflare ni endpoint ninguno: la mayoría de
las redes domésticas conectan directas. Cuando una conexión falle, se dice
claramente y ahí se decide si merece la pena montar el TURN.

**Conclusión: el multijugador entero cabe en planes gratuitos.** Supabase Free
para señalizar y guardar, STUN gratis para empezar, y el TURN de Cloudflare Free
solo cuando se demuestre que hace falta.

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
| **Fase A** | Dos jugadores en el mismo mundo: conexión, envío del mundo, movimiento con predicción, picar y colocar. **Sin bichos.** Solo STUN, sin TURN | Quita más de la mitad del trabajo —bichos, jefes, botín, arbitrar daño— y ya deja algo real: construir juntos. Y prueba lo difícil cuanto antes |
| **Fase B** | Bichos, combate, botín, cofres, jefes y sucesos con el anfitrión de árbitro | Lo que queda, ya con transporte y predicción probados |
| **Fase C** | El tercer jugador, reconexión y el guardado v17 con estado por jugador | |

Si la fase A sale mal, se ha perdido una fracción del esfuerzo y se sabe pronto.

### ¿Se puede añadir todo lo demás después? Sí, con una condición

La fase B es **añadir tipos de entidad a un protocolo que ya existe**, no rehacer
nada — pero solo si la fase A se escribe pensando en el juego entero. Cuatro
cosas tienen que estar bien desde el primer día:

1. **El reparto de autoridad**: el anfitrión simula, los clientes piden. Aunque en
   la fase A lo único que se simule sea andar.
2. **Un sobre de mensaje genérico**, con sitio para tipos de entidad que todavía
   no existen. Si el mensaje se llama «posición de jugador», la fase B lo tira.
3. **Predicción y reconciliación del jugador local**, que es lo mismo para
   siempre.
4. **Los dos canales separados**: uno no fiable para instantáneas y otro fiable y
   ordenado para tiles, cofres e inventario.

Con esas cuatro, un bicho es «una entidad más en la instantánea» y un jefe es «un
bicho con más campos». Lo que convertiría la fase B en una reescritura es dar por
hecho en la A que **lo único que existe son los jugadores**.

Y conviene decirlo al revés de como suena: **la fase A no es la mitad fácil, es
la mitad arriesgada**. Los bichos son bastante mecánicos; lo difícil —predecir,
reconciliar, romper el supuesto de un solo jugador— está todo en la A. Por eso va
primero.

---

---

# Poder volverse atrás

Pregunta justa: *si a mitad de camino decidimos que la nube no compensa, ¿se
puede volver al guardado local sin drama?* **Sí, y sale casi gratis si se diseña
así desde el principio.** Cinco reglas:

1. **IndexedDB no deja de ser el almacén principal.** La nube es un espejo, nunca
   la única copia. Se escribe primero en local y luego se sube. Así, «revertir»
   es *dejar de subir*: todas las partidas ya están en el disco, ninguna hay que
   rescatar de ningún sitio.
2. **El blob es idéntico byte a byte** en local y en la nube — es la misma salida
   de `empaquetar()`. No hay formato «de nube» del que convertir nada de vuelta.
3. **El adaptador de Supabase envuelve al local, no lo sustituye.** Sigue
   habiendo un solo `SaveAdapter`, y el de la nube llama por dentro al de
   IndexedDB. Quitarlo es dejar de envolverlo.
4. **Un interruptor en ajustes.** «Guardar también en la nube»: apagado, el juego
   se comporta exactamente como hoy. Eso hace que revertir no necesite ni
   desplegar.
5. **Una etiqueta de git antes de empezar** (`prealfa-sin-nube-7.3.0`), para que
   exista un punto literal al que volver, y cada cambio en su propia versión para
   poder revertir piezas sueltas en vez de un bloque.

**Y el dato que más tranquiliza: toda la parte de la nube no necesita tocar el
formato de guardado.** Ni un campo nuevo, ni subir `VERSION_FORMATO`. Es
reversible al 100 %.

La única puerta que sí es de un solo sentido llega mucho después: el **formato
v17** del multijugador, con estado por jugador. Por eso conviene no subirlo hasta
la fase C, cuando de verdad haga falta — hasta ahí, todo lo anterior se puede
deshacer.

---

# Seguridad, y qué cambia por ser plan gratis

Lo primero, para quitarlo de en medio: **la clave pública del cliente (`anon` /
publishable) está pensada para ir en el navegador**. Que se vea no es un fallo.
La seguridad no viene de esconderla.

**Viene del RLS, y ahí no hay red de seguridad.** Las políticas por fila, atadas
a `auth.uid()`, son *todo* el modelo: hay que ponerlas en la tabla de partidas
**y en el bucket de Storage**. Sin ellas, cualquiera lee y escribe las partidas
de cualquiera. Es el único punto donde un error se paga caro.

Lo que **nunca** puede acabar en el frontend: la clave `service_role` y la clave
de TURN de Cloudflare. Esas van en secretos de GitHub Actions o de la Edge
Function.

### Lo que sí cambia por el plan gratis

En un plan de pago, el peor caso de un abuso es una factura. **Aquí el peor caso
es que te restrinjan la organización**: la Fair Use Policy puede pausar los
proyectos, dejarlos en solo lectura o responder 402 a todo. O sea, el ataque no
te cuesta dinero, te tira el juego. Eso cambia las prioridades:

- **El invitado es el vector de abuso.** Cada sesión anónima es una fila en tu
  base de datos, y un bot puede crear miles. Supabase limita a **30 altas
  anónimas por hora y por IP** y **recomienda expresamente CAPTCHA**. Con
  Cloudflare Turnstile, gratis. Y no hay limpieza automática: hace falta un
  `delete from auth.users where is_anonymous and created_at < now() - interval
  '30 days'`, que puede correr en el mismo workflow del latido.
- **Topes propios, además del RLS.** Tamaño máximo por subida (2 MB va sobradísimo
  cuando el mundo más grande son 345 KB), número máximo de partidas por usuario, y
  poco más. Son cuatro líneas y son las que impiden que una cuenta sola se coma
  los 5 GB.
- **El blob lo escribe el cliente.** Un cliente modificado puede subir lo que
  quiera. En un juego con la lógica en el navegador eso no se evita: se acota el
  daño con esos topes. Hacer trampas en tu propia partida no le hace nada a nadie.

### Una trampa del login por correo

La que menos se ve venir: **el SMTP que Supabase da por defecto solo entrega
correos a las direcciones del equipo de tu organización**, y la documentación dice
explícitamente que no es para producción. O sea, el «correo y contraseña» funciona
para ti y falla en silencio para cualquier otra persona.

Para usuarios de verdad hace falta **SMTP propio** — Resend y compañía tienen plan
gratuito suficiente. Es gratis, pero es un paso más que hay que contar en la
versión del login.

### Multijugador

- **WebRTC enseña tu IP a los otros jugadores.** Es inherente al P2P, no un fallo
  de implementación. Jugando con amigos da igual, pero conviene decirlo en voz
  alta. Forzar que todo pase por TURN la esconde, a cambio de gastar ancho de banda.
- **El anfitrión es la verdad**, así que un anfitrión tramposo estropea la partida
  a los demás. Entre amigos es asumible; es el mismo trato que hace Terraria.

## Orden que recomiendo

1. **Empaquetar en un worker.** No depende de nada y arregla un tirón de hoy.
2. **Login.**
3. **Guardado en la nube**, con el latido y la caché por fecha desde el principio.
4. **Multijugador, fase A.**

No al revés: el multijugador necesita cuentas para saber quién es quién y el blob
del mundo para que alguien se una. Las dos cosas las deja hechas la nube.

## Lo que hace falta decidir

Queda una sola: **¿fase A sin bichos, o multijugador completo de una vez?**
Recomiendo la fase A.

Ya decidido: **el plan gratis como marco**, **proyecto propio** (`GameOver`, ya
creado y vacío), **entrar con Google y sin sesiones anónimas**, **latido cada 12
horas** por GitHub Actions, **fase A solo con STUN** con el TURN aplazado, el
**modelo de mundo local o de nube pero nunca los dos**, y un **administrador por
tabla y política**, nunca por comprobación en el navegador.

---

# Compartir el proyecto de Supabase que ya existe

Sí se puede, y para seis jugadores es una opción razonable: deja libre el segundo
proyecto gratis y hay una sola cosa que administrar. Pero **conviene separar bien
qué se comparte y qué no**, porque no todo es aislable.

## Prefijos no: un esquema propio

Los prefijos en los nombres de tabla (`juego_partidas`, `juego_miembros`)
funcionan, pero Postgres ya tiene la herramienta buena para esto:

```sql
create schema juego;
-- juego.partidas, juego.miembros, juego.admins
```

Un esquema aparte da separación de verdad —permisos, copias, borrarlo entero de
una— y no hay forma de confundir una tabla del juego con una del otro proyecto.
Único detalle práctico: hay que **añadir `juego` a los «Exposed schemas»** en los
ajustes de la API para que el cliente pueda llegar. Es un interruptor, una vez.

El bucket de Storage no necesita nada: se llama `mundos` y ya está separado por
definición.

## Lo que sí se comparte, quiera uno o no

| Se comparte | Consecuencia |
|---|---|
| **Cuotas** (egress, Storage, mensajes) | Irrelevante: el juego usa ~1,4 % |
| **Fair Use** | Si el juego se pasara, restringe también el otro proyecto |
| **`auth.users`** | **Los usuarios son los mismos para los dos proyectos** |
| **Ajustes de Authentication** | Lo que se active, se activa para los dos |

Las dos últimas filas son las que importan.

### La trampa, y aquí ya no es hipotética

He mirado las políticas que hay hoy en el proyecto existente. Esto es lo que
tienen las tablas `productos` y `ventas`:

| Tabla | Política | Rol | Condición |
|---|---|---|---|
| `productos` | «Lectura admin productos» | `authenticated` | `true` |
| `productos` | «Admin inserta / actualiza / borra productos» | `authenticated` | `true` |
| `ventas` | «Admin lee / inserta / borra ventas» | `authenticated` | `true` |

Se llaman «Admin», pero **no comprueban que nadie sea administrador**: conceden a
*cualquier* usuario autenticado, con la condición literal `true`. O sea, hoy mismo,
**cualquiera que tenga cuenta en ese proyecto puede leer, modificar y borrar los
productos y las ventas.**

Eso ya es un fallo de ese proyecto, con juego o sin él, y conviene arreglarlo de
todas formas. Pero es decisivo aquí por dos motivos:

1. **`auth.users` es común.** En cuanto tus seis jugadores se registren para
   jugar, los seis pasan a poder borrar los productos y las ventas de la otra
   aplicación. Sin hacer nada raro: simplemente por tener cuenta.
2. **Las sesiones anónimas se activan por proyecto.** Un usuario anónimo entra
   también como `authenticated`, así que activar el «jugar como invitado» le daría
   ese mismo poder a cualquiera que abra la página. La documentación de Supabase
   avisa justo de esto: *«revisa tus políticas RLS antes de activar las sesiones
   anónimas»*.

Menos mal por una cosa: **las cuatro tablas están vacías** (`productos`,
`cultivos`, `riegos` y `ventas` tienen 0 filas; `games` tiene 3 y está cerrada a
cal y canto, con RLS y sin ninguna política). Así que hoy no hay nada que perder
— pero el agujero está abierto.

> ### Recomendación, y cambia respecto a lo que dije antes
>
> **Mejor un proyecto propio para el juego.** No por las cuotas, que sobran, sino
> porque compartir proyecto significa compartir `auth.users`, y las políticas de
> la otra aplicación hoy convierten a cualquier usuario en administrador. Es el
> segundo y último proyecto gratis, y es exactamente para lo que sirve.
>
> Si aun así prefieres compartir proyecto, es perfectamente viable **con una
> condición previa**: arreglar esas políticas de `productos` y `ventas` para que
> comprueben de verdad quién es administrador. Es media hora de SQL en un proyecto
> con las tablas vacías, y hay que hacerlo antes de que se registre nadie.

### Y en los dos casos: sin sesiones anónimas

Con seis personas invitadas, el «entrar como invitado» aporta poco —para un mundo
de la nube hace falta cuenta igualmente— y es el mayor vector de abuso del plan
gratis. Se queda para los mundos **locales**, donde no hay cuenta de por medio y
no hay nada que activar.

Eso cierra la decisión del login: **entrar con Google, y sin sesiones anónimas.**

---

# El administrador

La idea es buena y resuelve un caso real: que a alguien se le pierda la
invitación, o que haya que arreglar un mundo sin ir al panel de Supabase.

## Cómo se hace bien

Lo importante: **no puede ser una comprobación en el navegador.** Un
`if (usuario.id === ADMIN)` en el cliente no protege nada, porque quien manda es
el RLS del servidor. La forma correcta son tres piezas pequeñas:

```sql
-- 1. Quién es admin. Sin políticas de escritura: solo se toca desde el panel.
create table juego.admins (usuario_id uuid primary key references auth.users);

-- 2. Una función que lo pregunte, con permisos elevados.
create function juego.es_admin() returns boolean
  language sql security definer stable as $$
    select exists (select 1 from juego.admins where usuario_id = auth.uid())
  $$;

-- 3. Y cada política lo tiene en cuenta.
create policy "ver partidas" on juego.partidas for select to authenticated
  using (dueño = auth.uid() or juego.es_admin()
         or exists (select 1 from juego.miembros m
                    where m.partida = id and m.usuario = auth.uid()));
```

El detalle que evita el fallo tonto: **la tabla `admins` no lleva ninguna política
de `insert` ni de `update`**. Sin política, nadie puede escribir en ella desde la
aplicación — ni siquiera un admin. Se añaden desde el editor SQL del panel. Así no
existe la forma de que alguien se auto-nombre administrador.

## Qué puede hacer, y una raya que conviene dibujar

Vale la pena separar dos poderes que suenan al mismo:

- **Administrar** — ver todos los mundos, añadir y quitar miembros, arreglar
  invitaciones. Es lo que resuelve el problema real y no molesta a nadie.
- **Entrar a jugar** en el mundo de otro. Eso ya no es administrar: es aparecer
  en la partida de alguien pudiendo tocar sus cofres.

Entre seis amigos y siendo tú el admin, las dos juntas dan igual. Pero salen
gratis separadas —son dos políticas en vez de una— y así «entrar» sigue siendo
una invitación aceptada, no un privilegio. Lo dejo apuntado como opción, no como
recomendación.

---

## Estado de la cuenta

**Decidido y hecho: el juego tiene proyecto propio.**

| Proyecto | Ref | Región | Estado |
|---|---|---|---|
| `GameOver` | `aazwkoccddlmscgdcwpy` | `eu-west-1` | activo y **vacío**, 0 tablas |
| `IbraSalesforceDev's Project` | `magoionhitrqcihrracn` | `eu-central-1` | activo, el de siempre |

Los dos en la organización `Nordack's Org`. Comprobado: el esquema `public` del
proyecto nuevo no tiene ni una tabla, así que se empieza de cero y no hay nada
que respetar.

**Con esto se resuelve lo importante**: `auth.users` es **por proyecto**, así que
los jugadores del juego no existen para la otra aplicación y aquellas políticas
de «Admin» que conceden a cualquier autenticado dejan de ser un problema del
juego. Siguen siendo un fallo de ese proyecto y conviene arreglarlo algún día,
pero ya no bloquea nada de aquí.

Lo que sigue compartido, por estar en la misma organización, y por qué da igual:

- **La cuota** (5 GB de egress, 1 GB de Storage, 2 M de mensajes). El juego usa
  ~1,4 %, así que no se rozan.
- **La Fair Use Policy**, que restringe por organización. Con ese margen, la
  probabilidad es prácticamente nula; queda como el único motivo por el que algún
  día se movería el proyecto a una organización aparte, cosa que Supabase permite
  sin perder nada.

Dos apuntes menores:

- **Regiones distintas** (Irlanda el nuevo, Fráncfort el viejo). Da igual: para
  las partidas es una descarga de 129 KB, y para el multijugador la región solo
  afecta a la señalización, que son unas decenas de mensajes. Los datos de juego
  van entre navegadores.
- **Cupo agotado: 2 de 2 proyectos gratis.** No habría un tercero sin pausar uno.

### Lo que queda por hacer en el panel, cuando se dé la salida

Nada de esto está hecho ni se hará hasta que lo digas:

1. Activar **Google** como proveedor, y dejar las sesiones anónimas **apagadas**.
2. Crear el esquema del juego, las tablas y el bucket `mundos`, con su RLS.
3. Añadir el secreto del proyecto a **GitHub Actions** para el latido de 12 h.

Lo que **ya no** hace falta decidir, porque el plan gratis lo decide solo:
el transporte es WebRTC con Cloudflare para STUN/TURN, y Supabase Realtime se
queda únicamente para señalizar.
