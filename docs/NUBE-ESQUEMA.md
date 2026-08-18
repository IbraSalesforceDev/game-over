# El esquema de la nube

Lo que hay montado en el proyecto `GameOver` de Supabase
(`aazwkoccddlmscgdcwpy`, `eu-west-1`), y **por qué está así**. Es la referencia
para escribir el `SupabaseSaveAdapter` sin tener que abrir el panel.

Todo vive en el esquema **`juego`**, no en `public`. Un esquema y no prefijos:
da separación de verdad y no hay forma de confundir una tabla del juego con una
de la otra aplicación de la cuenta.

## Las tablas

| Tabla | Para qué | Quién la toca |
|---|---|---|
| `juego.partidas` | La **ficha** de cada mundo en la nube: nombre, semilla, tamaño, versiones, tiempo jugado, `actualizado` | El cliente |
| `juego.miembros` | Quién puede entrar a cada partida | El cliente (leer, invitar, echar) |
| `juego.admins` | Quién administra | **Nadie desde la API** |
| `juego.invitaciones` | Códigos de 8 caracteres | **Nadie desde la API** |

El mundo en sí **no está en la base de datos**: es un blob en Storage, bucket
`mundos`, en la ruta `<id de la partida>/mundo.bin`. La ficha existe para poder
pintar el menú sin descargar 129 KB por mundo.

## Las tres reglas del acceso

### 1. Un solo escritor por mundo

`partidas` solo deja `update` al propietario. No es una precaución genérica:
**encaja con el multijugador sin esfuerzo**, porque en una partida solo el
anfitrión tiene autoridad. El escritor único deja de ser una convención del
cliente y pasa a imponerlo la base de datos. Lo mismo en el bucket: leer, quien
tenga acceso a la partida; escribir, solo el propietario.

### 2. `admins` e `invitaciones` no existen para la API

Las dos tienen RLS activo, **ninguna política y ningún `grant`**. Con eso son
invisibles e intocables desde el cliente, hagas lo que hagas con tu sesión.

- A `admins` se llega solo desde el editor SQL del panel. **Así no existe la
  forma de que alguien se auto-nombre administrador**, que es el fallo tonto que
  se cuela cuando el rol vive en una tabla que el usuario puede editar.
- A `invitaciones` se llega solo por las dos funciones de abajo. Validar un
  código sin enseñar la lista de códigos es justo lo que permite esto.

Aparecen en el linter de seguridad como dos avisos `rls_enabled_no_policy` de
nivel INFO. **No son un descuido, son el diseño.**

### 3. Las funciones auxiliares van con permisos elevados a propósito

`es_admin()`, `es_propietario(uuid)` y `es_miembro(uuid)` son `security definer`.
No por comodidad: si la política de `partidas` consultara `miembros` y la de
`miembros` consultara `partidas`, cada una dispararía la otra y Postgres entraría
en **recursión infinita**. Corriendo como el dueño se saltan el RLS y cortan el
círculo.

Las tres llevan `search_path = ''` y todo cualificado. Sin eso, un esquema puesto
por delante podría cambiar a qué tabla apuntan — en una función con permisos
elevados, ese es exactamente el agujero que no se quiere.

## Invitaciones

```sql
juego.crear_invitacion(partida uuid, usos integer default 5) returns text
juego.canjear(codigo text) returns uuid
```

- El código son **8 caracteres sin I, O, 0 ni 1**: se dicta en voz alta o se
  copia a mano, y esos cuatro son los que se confunden.
- Caduca a los 7 días y admite 5 usos por defecto.
- Un código que no existe y uno caducado dan **el mismo error**, a propósito:
  distinguirlos convierte la función en una forma de averiguar qué códigos hay.
- Canjear dos veces **no gasta dos usos**. Que a alguien se le cierre la pestaña
  y vuelva a pegar el código no debería quemar la invitación.

## Lo que tiene que hacer el cliente, y no se puede olvidar

> **Al borrar una partida hay que borrar antes el blob**, con la API de Storage,
> y después la fila.

Lo intenté con un trigger en la base de datos y **Supabase prohíbe el `delete`
directo sobre `storage.objects`** — con una excepción, no en silencio. O sea que
el trigger no es que no limpiara: hacía **imposible borrar una partida**. Se
descubrió probando el borrado y el trigger está retirado.

Si el borrado se queda a medias, lo que queda es un fichero huérfano ocupando
unos kilobytes. Molesto y barato, que es mucho mejor que una partida que no se
deja borrar.

## Comprobado

Trece comprobaciones contra la base de datos real, con dos usuarios de prueba
(creados, usados y borrados; la base quedó a cero). Un extraño **no** puede:

- ver, escribir ni borrar la partida de otro
- leer `invitaciones` ni `admins`
- invitar a una partida ajena, ni auto-invitarse insertando en `miembros`
- colar un código inventado

Y sí funciona lo que debe: el anfitrión ve y guarda su partida, crea invitación,
el invitado canjea y **pasa a ver la partida pero sigue sin poder escribirla**, y
al borrar la partida se llevan por delante sus miembros e invitaciones.

De paso, la prueba encontró dos fallos antes de que llegaran a ninguna parte:
faltaba el `grant usage` sobre el esquema —el cliente se habría comido un
«permission denied» antes de que el RLS opinara— y el trigger de borrado que
bloqueaba el borrado entero.

**Lo que no he podido comprobar desde aquí:** la llamada HTTP real a la API REST.
La red saliente hacia `supabase.co` está cerrada en este entorno. El esquema
`juego` está añadido a `pgrst.db_schemas` y verificado en `pg_roles`, pero que
PostgREST lo sirva se confirmará en el navegador con el primer cliente.

> Si algún día el cliente dice de golpe que no encuentra `juego.partidas`: tocar
> los ajustes de API en el panel sobrescribe esa lista.

## Datos de conexión

```
URL   https://aazwkoccddlmscgdcwpy.supabase.co
Clave sb_publishable_jTgrZwrh9irWoVhpqLV0CQ_DzRBd4ak   (publishable)
```

La clave publicable **está pensada para ir en el navegador**; que se vea no es un
fallo. La seguridad es el RLS de arriba. Lo que no puede salir nunca del panel es
la `service_role`.

## Lo que falta en el panel

1. **Activar Google** como proveedor (Authentication → Providers), con las
   credenciales de Google Cloud.
2. **Dejar las sesiones anónimas apagadas**, que es como vienen.
3. Cuando haya cuenta, añadirse a `juego.admins` desde el editor SQL:
   ```sql
   insert into juego.admins (usuario)
   select id from auth.users where email = 'tu@correo';
   ```
