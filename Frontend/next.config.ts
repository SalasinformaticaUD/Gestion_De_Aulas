import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
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
