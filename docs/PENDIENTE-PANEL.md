# Lo que tienes que hacer tú

Todo lo que no puedo hacer yo desde aquí, en un sitio, para que no se pierda por
la conversación. Lo demás está hecho y comprobado.

Proyecto: **`GameOver`** · `aazwkoccddlmscgdcwpy` · región `eu-west-1`

---

## 1. Cómo se entra — Google queda descartado

Google Cloud pide tarjeta para abrir cuenta, así que **fuera**. No pasa nada:
era una comodidad, no un requisito, y hay tres salidas y ninguna cuesta dinero.

### Recomendada: correo y contraseña, con la confirmación apagada

**No necesita ninguna cuenta externa, ni tarjeta, ni dominio, ni SMTP.** Se
resuelve con dos interruptores en el panel y desbloquea todo hoy mismo. Y es
además lo que ya habías decidido al principio.

En **Authentication → Sign In / Providers**:

- [ ] **Email**: activado
- [ ] **Confirm email**: **desactivado** ← esto es lo importante
- [ ] **Anonymous sign-ins**: desactivado (viene así)

Por qué apagar la confirmación: el correo de confirmación **no llegaría**. El
SMTP que trae Supabase solo entrega a las direcciones del equipo de tu
organización, así que tus invitados se quedarían esperando un correo que no
existe. Apagándolo, la cuenta queda lista al registrarse.

Lo que se pierde y hay que saberlo:

- **Recuperar contraseña no funciona por correo.** Si a alguien se le olvida, se
  la cambias tú desde **Authentication → Users**. Con cinco o seis personas es
  un minuto.
- Alguien podría registrarse con un correo que no es suyo. Da igual aquí: sin
  invitación no entra a ningún mundo, y una cuenta suelta no da acceso a nada.

Y un interruptor gratis que conviene dejar puesto, en **Authentication →
Policies** o **Password settings**:

- [ ] **Leaked password protection**: activado (comprueba contra
      HaveIBeenPwned)
- [ ] Longitud mínima de contraseña: 8 o más

### Si algún día quieres el botón de «entrar con…»

Las dos que **no piden tarjeta**:

| Proveedor | Coste | Dónde se crea | Pega |
|---|---|---|---|
| **Discord** | gratis, sin tarjeta | `discord.com/developers/applications` | Tus amigos casi seguro ya lo tienen |
| **GitHub** | gratis, sin tarjeta | Settings → Developer settings → OAuth Apps | Tus amigos probablemente **no** tengan cuenta |

Para un juego con amigos, **Discord es la mejor de las dos**. En los dos casos el
URI de redirección es el mismo:

```
https://aazwkoccddlmscgdcwpy.supabase.co/auth/v1/callback
```

Y luego el Client ID y el Secret van en **Authentication → Providers**.

Esto no corre prisa: **con el correo y contraseña ya se puede jugar**. Se puede
añadir después sin tocar nada de lo que haya, porque un usuario nuevo por Discord
es un usuario más y el resto del sistema no se entera.

---

## 2. Hacerte administrador

Cuando tengas cuenta creada en el juego, en **SQL Editor**:

```sql
insert into juego.admins (usuario)
select id from auth.users where email = 'ibrahim.alvarez.bar@gmail.com';
```

Esa tabla no se puede tocar desde la aplicación a propósito — es lo que impide
que nadie se auto-nombre administrador. Por eso este paso es a mano y solo se
hace una vez.

---

## 3. El latido, para que el proyecto no se pause

Los proyectos del plan gratis **se pausan solos tras 7 días de poca actividad**.
El workflow lo escribo yo, pero el secreto lo tienes que meter tú, porque yo no
debo ver ni guardar claves en el repositorio.

En **GitHub → Settings → Secrets and variables → Actions**:

- [ ] `SUPABASE_URL` = `https://aazwkoccddlmscgdcwpy.supabase.co`
- [ ] `SUPABASE_ANON_KEY` = la clave publicable del proyecto

(La clave publicable no es un secreto de verdad —va en el navegador— pero como
secreto de Actions se cambia en un sitio si algún día rota.)

---

## 4. Nada de esto hace falta todavía

- **TURN de Cloudflare**: solo si en la fase A alguna conexión directa falla. Y
  cuando toque, la cuenta de Cloudflare **es gratis y no pide tarjeta**.
- **Dominio propio y SMTP**: solo harían falta si algún día entra gente de fuera
  del grupo y hay que recuperar contraseñas por correo.

---

## Resumen

| Paso | ¿Bloquea? | Esfuerzo |
|---|---|---|
| 1. Activar Email y apagar Confirm email | **Sí, para probar el login** | 2 minutos |
| 2. Añadirte a `admins` | No | 1 minuto, cuando tengas cuenta |
| 3. Secretos de GitHub Actions | No, pero el proyecto se pausa a los 7 días | 2 minutos |
| 4. Cloudflare / dominio | No | más adelante, o nunca |
