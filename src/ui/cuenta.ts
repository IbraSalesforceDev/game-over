/**
 * Entrar en la cuenta.
 *
 * Un panel, dos campos y dos botones: entrar o crear cuenta. No hay «he
 * olvidado la contraseña» porque hoy no funcionaría: el correo de recuperación
 * no se entregaría a nadie de fuera del equipo del proyecto. Antes que poner un
 * botón que no hace nada, se dice en voz alta a quién hay que pedírselo.
 *
 * El panel no sabe nada de Supabase: recibe las dos funciones que hacen el
 * trabajo. Así se puede probar sin servidor y así el día que se añada Discord se
 * enchufa un botón más sin tocar esto.
 */

const ESTILO = `
#cuenta {
  position: fixed; inset: 0; z-index: 95; pointer-events: auto;
  display: flex; align-items: center; justify-content: center; padding: 24px;
  background: rgba(6,9,13,.82); backdrop-filter: blur(3px);
  font: 12px ui-monospace, monospace; color: #d8cfc0;
}
#cuenta .caja {
  width: min(380px, 100%);
  background: #131a22; border: 1px solid #2a343f; border-radius: 10px;
  padding: 22px 24px; box-shadow: 0 24px 60px rgba(0,0,0,.55);
}
#cuenta h2 {
  font-size: 12px; letter-spacing: .18em; text-transform: uppercase;
  color: #e8b64c; margin-bottom: 4px;
}
#cuenta .sub { color: #6d7a8a; font-size: 11px; margin-bottom: 18px; line-height: 1.5; }
#cuenta label { display: block; font-size: 10px; letter-spacing: .12em;
  text-transform: uppercase; color: #8b98a8; margin: 12px 0 5px; }
#cuenta input {
  width: 100%; padding: 8px 10px; background: #0d1117;
  border: 1px solid #2a343f; border-radius: 5px; color: #d8cfc0;
  font: 12px ui-monospace, monospace;
}
#cuenta input:focus { outline: none; border-color: #7a6428; }
#cuenta .botones { display: flex; gap: 8px; margin-top: 18px; }
#cuenta button {
  flex: 1; padding: 9px; cursor: pointer; border-radius: 6px;
  background: #1d2530; border: 1px solid #2b3440; color: #d8cfc0;
  font: 11px ui-monospace, monospace; letter-spacing: .06em;
}
#cuenta button:hover:not(:disabled) { background: #26303d; border-color: #3d4a58; }
#cuenta button.principal { background: #3a2f16; border-color: #7a6428; color: #e8b64c; }
#cuenta button.principal:hover:not(:disabled) { background: #4a3c1c; }
#cuenta button:disabled { opacity: .5; cursor: default; }
#cuenta .recado { min-height: 30px; margin-top: 12px; font-size: 11px; line-height: 1.45; }
#cuenta .recado.mal { color: #e0857a; }
#cuenta .recado.bien { color: #8fc06a; }
#cuenta .cerrar {
  margin-top: 6px; width: 100%; background: none; border: 0; color: #6d7a8a;
  cursor: pointer; font: 11px ui-monospace, monospace; padding: 6px;
}
#cuenta .cerrar:hover { color: #94a1b0; }
#cuenta .nota { margin-top: 14px; font-size: 10px; color: #5c6875; line-height: 1.5; }
`;

export interface Resultado {
  ok: boolean;
  error: string;
}

export interface AccionesCuenta {
  entrar(correo: string, contrasena: string): Promise<Resultado>;
  registrarse(correo: string, contrasena: string): Promise<Resultado>;
}

/**
 * Abre el panel. Resuelve a `true` si se ha entrado y a `false` si se cierra.
 */
export function pedirEntrada(
  contenedor: HTMLElement,
  acciones: AccionesCuenta,
): Promise<boolean> {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const capa = document.createElement('div');
  capa.id = 'cuenta';
  const caja = document.createElement('div');
  caja.className = 'caja';
  capa.appendChild(caja);

  const h2 = document.createElement('h2');
  h2.textContent = 'Tu cuenta';
  const sub = document.createElement('div');
  sub.className = 'sub';
  sub.textContent = 'Hace falta para las partidas en la nube y para que te inviten a las de otros.';

  const lCorreo = document.createElement('label');
  lCorreo.textContent = 'Correo';
  const iCorreo = document.createElement('input');
  iCorreo.type = 'email';
  iCorreo.autocomplete = 'email';
  iCorreo.id = 'cuenta-correo';

  const lClave = document.createElement('label');
  lClave.textContent = 'Contraseña';
  const iClave = document.createElement('input');
  iClave.type = 'password';
  iClave.autocomplete = 'current-password';
  iClave.id = 'cuenta-clave';

  const botones = document.createElement('div');
  botones.className = 'botones';
  const bEntrar = document.createElement('button');
  bEntrar.className = 'principal';
  bEntrar.textContent = 'Entrar';
  bEntrar.id = 'cuenta-entrar';
  const bCrear = document.createElement('button');
  bCrear.textContent = 'Crear cuenta';
  bCrear.id = 'cuenta-crear';
  botones.append(bEntrar, bCrear);

  const recado = document.createElement('div');
  recado.className = 'recado';
  recado.id = 'cuenta-recado';

  const cerrar = document.createElement('button');
  cerrar.className = 'cerrar';
  cerrar.textContent = 'Ahora no — seguir en local';

  const nota = document.createElement('div');
  nota.className = 'nota';
  nota.textContent =
    'Si olvidas la contraseña, pídele a quien administra el juego que te la cambie.';

  caja.append(lCorreo, iCorreo, lClave, iClave, botones, recado, cerrar, nota);
  contenedor.appendChild(capa);
  iCorreo.focus();

  return new Promise<boolean>((resolver) => {
    let ocupado = false;

    function terminar(entrado: boolean): void {
      capa.remove();
      estilo.remove();
      resolver(entrado);
    }

    function decir(texto: string, mal: boolean): void {
      recado.textContent = texto;
      recado.className = `recado ${mal ? 'mal' : 'bien'}`;
    }

    async function intentar(crear: boolean): Promise<void> {
      if (ocupado) return;
      ocupado = true;
      bEntrar.disabled = true;
      bCrear.disabled = true;
      decir(crear ? 'Creando la cuenta…' : 'Entrando…', false);
      try {
        const r = crear
          ? await acciones.registrarse(iCorreo.value, iClave.value)
          : await acciones.entrar(iCorreo.value, iClave.value);
        if (r.ok) {
          decir('Listo', false);
          terminar(true);
          return;
        }
        decir(r.error, true);
      } catch (e) {
        // Que se caiga la red no puede dejar el panel colgado sin explicación.
        decir(e instanceof Error ? e.message : 'No se ha podido conectar', true);
      } finally {
        ocupado = false;
        bEntrar.disabled = false;
        bCrear.disabled = false;
      }
    }

    bEntrar.addEventListener('click', () => void intentar(false));
    bCrear.addEventListener('click', () => void intentar(true));
    cerrar.addEventListener('click', () => terminar(false));

    // Enter entra: es lo que hace todo el mundo sin pensarlo.
    for (const campo of [iCorreo, iClave]) {
      campo.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          void intentar(false);
        }
      });
    }

    // El juego escucha el teclado por debajo: sin esto, escribir la contraseña
    // haría andar al personaje y abriría el inventario con cada "e".
    for (const evento of ['keydown', 'keyup', 'keypress'] as const) {
      capa.addEventListener(evento, (e) => e.stopPropagation());
    }
  });
}
