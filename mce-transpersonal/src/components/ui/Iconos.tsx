/** Iconos de línea fina, dibujados para la web. Solo los imprescindibles. */

type P = { className?: string };

export function IconoInstagram({ className }: P) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.4" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconoFacebook({ className }: P) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14.2 21v-7.6h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.1H8.5v3h2.6V21" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoTelefono({ className }: P) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M5.5 3.8h3l1.5 4-2 1.3a11 11 0 0 0 6.9 6.9l1.3-2 4 1.5v3a1.8 1.8 0 0 1-2 1.8A16.2 16.2 0 0 1 3.7 5.8a1.8 1.8 0 0 1 1.8-2Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconoEmail({ className }: P) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.8 6.5 8.2 6.3 8.2-6.3" strokeLinejoin="round" />
    </svg>
  );
}

export function IconoCerrar({ className }: P) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M6 6.3 18 17.8M17.8 6 6.2 18" />
    </svg>
  );
}
