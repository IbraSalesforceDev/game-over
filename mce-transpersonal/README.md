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

## Fotos y logo

- **Logo:** `src/assets/logo.png` (original, sin tocar). Si llega una versión vectorial o más grande,
  sustitúyelo con el mismo nombre.
- **Fotos reales del equipo:** `src/assets/fotos/` (recortadas de los montajes de cada sede, en WebP).
  Se enlazan en `src/data/fotos.ts`: `fotosSede` (por id de sede) y `fotosGenerales`.
  Para añadir una: deja el archivo en esa carpeta, impórtalo en `fotos.ts` y añádelo a su sede.
  Van dentro del archivo único (`npm run build:archivo`) y Vite las optimiza en el build normal.
- **Retratos individuales** (cuando lleguen): `public/images/betty/`, `public/images/equipo/` y
  `public/images/facilitadores/`, enlazados con `foto` en `textos.ts`, `equipo.ts` y `sedes.ts`.
  Mientras no haya foto, se muestra un bloque de color suave con las iniciales.
  `npm run dev`/`build` generan versiones AVIF/WebP y avisan si una foto es pequeña.
- **Nada de imágenes generadas por IA.**

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

- **Entrada:** en la portada, partículas doradas vibran en ondas sobre un fondo de espacio y forman
  el logo y las letras MCE (`components/anim/LogoParticulas.tsx`). Mientras se forma (unos 3,6 s, solo
  la primera vez en la sesión) no se puede bajar; hay un botón para saltarla. Después el logo sigue
  respirando, salen ondas suaves y las partículas se apartan al pasar el dedo o el ratón.
- **Paleta** (`src/index.css`, `@theme`): blanco, azul noche para textos y secciones oscuras, el dorado
  del logo para lo que se pulsa y azules claros de apoyo. Los nombres de las variables son heredados
  (`carbon` = azul noche, `dorado` = oro del logo, `bosque` = espacio).
- **Tipografías:** Cormorant Garamond (titulares, con cursiva real) y Figtree (texto), incluidas en el proyecto.
- **Fotos reales** en las cabeceras (en arco), en «Miles de personas», en cada sede y en Equipo
  (tira que se arrastra).
- **Movimiento:** scroll suave (Lenis), cortina entre páginas, textos que se iluminan con el scroll,
  valores a pantalla completa, tarjetas apiladas y recorrido horizontal.
- **Accesibilidad:** foco visible y contraste AA. Con `prefers-reduced-motion` no hay animación de
  entrada, ni scroll suave, ni cortina, ni secciones fijadas.
- Las políticas de privacidad y cookies son **plantillas**: deben revisarlas un profesional.

## Pendientes (`TODO`)

- [ ] **Logo en vectorial** (SVG/PDF) o a más resolución → `src/assets/logo.png`.
- [ ] **Fotos originales** de las sedes (las actuales salen de montajes de Instagram; la segunda de Benidorm mide 153 px).
- [ ] **Sede de la foto de grupo sin rótulo** (`fotosGenerales.sala` en `src/data/fotos.ts`).
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
