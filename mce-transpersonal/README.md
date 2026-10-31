# MCE Transpersonal · web

Web de **MCE (Mente, Cuerpo y Espíritu)**, escuela transpersonal fundada por Betty Merino.

Vite + React + TypeScript + React Router + Tailwind CSS 4 + Framer Motion. Es una web estática: sin
servidor y sin base de datos. El formulario de contacto se envía por email con Formspree.

## Arrancar en local

Requisitos: Node 20 o superior.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/ (comprueba tipos antes)
npm run preview    # sirve dist/ para probarlo como en producción
```

### Versión de un solo archivo (para enseñarla sin desplegar)

```bash
npm run build:archivo
```

Genera `dist-archivo/index.html`: toda la web (código, estilos y tipografías) en un único archivo
que se puede enviar por WhatsApp o email y abrir con doble clic. Navega con `#` en la dirección
(`index.html#/sedes`). Las fotos de `public/images/` no van incluidas en esta versión.

## Dónde se edita cada cosa

Todo el contenido está en `src/data/`. Los componentes no llevan textos escritos a mano.

| Archivo | Qué contiene |
|---|---|
| `src/data/escuela.ts` | Nombre, logo, email y teléfono generales, Instagram, datos legales |
| `src/data/textos.ts` | Textos oficiales de "Sobre MCE", valores, frases acordadas y datos de Betty |
| `src/data/sedes.ts` | Comunidades, sedes, teléfonos, redes y facilitadores |
| `src/data/formaciones.ts` | Bloques de formación y sus detalles |
| `src/data/equipo.ts` | Disciplinas, texto de presentación y miembros del equipo |
| `src/data/navegacion.ts` | Menú y enlaces legales |

Un dato que valga `null` **no se muestra**. Así la web nunca enseña texto de relleno. Cada dato
pendiente tiene un comentario `// TODO` al lado.

## Fotos

Suelta los archivos reales en `public/images/`. Nada de imágenes generadas por IA.

| Ruta | Qué va | Dónde se enlaza |
|---|---|---|
| `public/images/logo.png` (o `.svg`) | Logo original, **sin tocar** | `escuela.ts` → `logo` (ajusta la extensión) |
| `public/images/betty/` | Foto de Betty, p. ej. `betty-merino.jpg` | `textos.ts` → `betty.foto` |
| `public/images/equipo/` | Retratos del equipo, `nombre-apellido.jpg` | `equipo.ts` → `foto` |
| `public/images/facilitadores/` | Un archivo por persona, `nombre-apellido.jpg` | `sedes.ts` → `foto` de cada facilitador |

Ejemplo: `foto: '/images/facilitadores/anabel-martinez.jpg'`.

- Mientras no haya foto, se muestra un bloque de color suave con las iniciales.
- Mientras no haya logo, la cabecera muestra "MCE" en tipografía.
- `npm run dev` y `npm run build` generan automáticamente versiones AVIF/WebP en varios tamaños
  (`public/images/_opt/`, no se suben a git). La web las sirve con `srcset` y carga diferida.
- **Si una foto es pequeña, la consola lo avisa** (`⚠ [fotos] … mide solo 400px`). No se amplía
  artificialmente: pide el archivo original.

## Formulario de contacto

1. Crea un formulario en [formspree.io](https://formspree.io) con el email de la escuela.
2. Copia `.env.example` como `.env.local` y pon el endpoint en `VITE_FORMSPREE_ENDPOINT`.
3. En el hosting, añade la misma variable (ver más abajo).

Mientras no esté configurado, al enviar se avisa de que el formulario aún no está conectado y se
anima a contactar con la sede.

> Las variables `VITE_*` son públicas (acaban en el navegador). No pongas nunca claves secretas.
> Si algún día se cambia a un servicio con clave secreta (p. ej. Resend), hay que hacerlo con una
> función de servidor (`/api/contacto` en Vercel) y la clave solo en el panel del hosting.

## Despliegue

En los dos casos, las rutas (`/sedes`, `/formaciones`…) ya están configuradas para que recargar la
página o entrar directamente por un enlace funcione.

> **Nota:** ahora mismo el proyecto vive en la carpeta `mce-transpersonal/` del repositorio. Lo ideal
> es moverlo a un repositorio propio (p. ej. `mce-transpersonal-web`). Si se queda en la subcarpeta,
> sigue las indicaciones de "Root Directory" de abajo.

### Opción principal: Vercel

1. Entra en [vercel.com](https://vercel.com) con tu cuenta de GitHub.
2. **Add New → Project → Import Git Repository** y elige el repositorio.
3. Si el proyecto está en una subcarpeta: **Root Directory → `mce-transpersonal`**.
4. Framework: Vite (lo detecta solo). Build: `npm run build`. Output: `dist`.
5. **Settings → Environment Variables**: añade `VITE_FORMSPREE_ENDPOINT`.
6. Deploy.

A partir de ahí, cada push a `main` publica en producción y cada pull request genera una URL de
prueba.

**Dominio propio** (Settings → Domains): añade `mcetranspersonal.com` y crea en el registrador los
registros DNS que indique Vercel. **Antes de tocar los DNS, comprueba si la escuela usa correo con
ese dominio**: los registros MX deben conservarse o el correo dejará de funcionar.

### Alternativa: Firebase Hosting

Gratis en el plan Spark para una web estática. Ya están preparados `firebase.json`, `.firebaserc` y
dos workflows en `.github/workflows/`.

1. Crea un proyecto en [console.firebase.google.com](https://console.firebase.google.com) y pon su ID
   en `.firebaserc` (ahora pone `TODO-id-del-proyecto-firebase`).
2. Instala la herramienta y conéctala a GitHub:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting:github
   ```
   Esto crea en GitHub el secreto con la cuenta de servicio. Cambia el nombre del secreto en los
   workflows si no coincide con `FIREBASE_SERVICE_ACCOUNT`.
3. En GitHub, **Settings → Secrets and variables → Actions → Variables**, añade
   `VITE_FORMSPREE_ENDPOINT`.
4. **Importante:** GitHub solo ejecuta los workflows de la carpeta `.github/workflows` de la **raíz**
   del repositorio. Si el proyecto sigue en una subcarpeta, mueve esa carpeta a la raíz y descomenta
   `working-directory` y `entryPoint` en los dos archivos.

Cada push a `main` publica en producción, y cada pull request publica una versión de prueba y deja
la URL como comentario.

**Dominio propio:** Hosting → Añadir dominio personalizado. Firebase no vende dominios: se compra en
un registrador y se apuntan los DNS. La misma advertencia sobre los registros MX aplica aquí.

## Notas de diseño y accesibilidad

- **Paleta:** marfil y lino de base, dorado para lo importante, salvia y terracota como acentos y
  verde bosque (`bosque`) para las secciones oscuras. Todo en `src/index.css` (`@theme`).
- **Tipografías** (Fraunces y DM Sans) incluidas en el proyecto: no se conecta a Google Fonts.
- **Movimiento:** intro la primera vez por sesión (`Intro.tsx`), scroll suave con Lenis
  (`lib/scroll.ts`), cortina curva entre páginas con el nombre del destino (`Pagina.tsx`), titulares
  por palabras, textos que se iluminan con el scroll (`TextoScroll.tsx`), marquesina de valores,
  cifras animadas calculadas de los datos (`Contador.tsx`), sección horizontal (`Horizontal.tsx`),
  valores a pantalla completa (Sobre MCE), tarjetas apiladas (Formaciones), tira de retratos
  arrastrable (Equipo), botones magnéticos y cursor propio en ordenador (`Cursor.tsx`).
- **Accesibilidad:** foco visible, contraste AA (el dorado de los textos es `dorado-hondo`).
  Con `prefers-reduced-motion` no hay intro, ni scroll suave, ni cortina, ni cursor, ni secciones
  fijadas: el contenido se muestra en listas normales con fundidos cortos.
- Las políticas de privacidad y cookies son **plantillas**: deben revisarlas un profesional.

## Pendientes (`TODO`)

- [ ] **Logo** original → `public/images/logo.*` (y ajustar extensión en `escuela.ts`).
- [ ] **Email** de la escuela → `escuela.ts` (`email`) y formulario de Formspree.
- [ ] **Teléfono general** → `escuela.ts` (`telefono`).
- [ ] **Datos legales**: denominación del responsable y, si se quiere, NIF → `escuela.ts` (`legal`).
- [ ] **Instagram de Valencia**: el que llegó coincide con el de Granada (`mcegranada`); no se muestra hasta confirmarlo.
- [ ] **Almería y Talavera de la Reina**: redes y teléfonos propios, si los hay.
- [ ] **Formaciones**: descripción, duración, contenidos, modalidad, precios y fechas, copiados literalmente de
      `mcetranspersonal.com/inteligencia-emocional-transpersonal/` y `/otros-cursos-y-charlas/`
      (no se pudo acceder a esas páginas al crear la web).
- [ ] **V Congreso Transpersonal 2025**: datos o decidir si se mantiene, ya que la fecha ha pasado.
- [ ] **Consulta transpersonal** de Betty: texto → `textos.ts` (`betty.consulta`).
- [ ] **Foto de Betty** → `public/images/betty/` y `textos.ts` (`betty.foto`).
- [ ] **Equipo**: texto de presentación, lista de personas y retratos.
- [ ] **Facilitadores** del resto de sedes y sus fotos.
- [ ] **Firebase** (si se usa): ID del proyecto en `.firebaserc`.
- [ ] **Revisión legal** de las políticas de privacidad y cookies por un profesional.
