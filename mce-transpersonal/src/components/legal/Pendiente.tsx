import type { ReactNode } from 'react';

/** Dato legal que falta por confirmar: se ve marcado para no pasarlo por alto. */
export default function Pendiente({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-dorado-claro px-1.5 py-0.5 text-carbon [box-decoration-break:clone]">{children}</mark>;
}
