import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Evita que `next build` reemplace fragmentos que un `next dev` activo
  // todavía tiene cargados desde .next.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  outputFileTracingRoot: process.cwd(),
  // Las fichas mensuales agrupan varios PDFs y pueden superar el valor
  // predeterminado de 30 segundos del proxy de rewrites.
  experimental: {
    proxyTimeout: 180_000,
  },
  async rewrites() {
    const aulas = (process.env.NEXT_PUBLIC_AULAS_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const monitores = (process.env.NEXT_PUBLIC_MONITORES_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
    return [
      { source: "/api/aulas/:path*", destination: `${aulas}/:path*` },
      // Django expone sus endpoints con barra final; mantenerla evita que el
      // rewrite provoque una redirección que pierde el encabezado de sesión.
      { source: "/api/monitores/:path*", destination: `${monitores}/:path*/` },
    ];
  },
};

export default nextConfig;
