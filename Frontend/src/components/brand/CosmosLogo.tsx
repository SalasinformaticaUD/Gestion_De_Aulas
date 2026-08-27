import Image from "next/image";

type CosmosLogoProps = { className?: string; priority?: boolean };

export function CosmosLogo({ className = "", priority = false }: CosmosLogoProps) {
  return <Image className={`cosmos-wordmark ${className}`.trim()} src="/brand/logo-cosmos.jpeg" alt="COSMOS · Laboratorios de Ingeniería" width={360} height={180} priority={priority} />;
}
