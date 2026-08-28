import Image from "next/image";

type CosmosLogoProps = { className?: string; priority?: boolean; variant?: "dark" | "light" };

export function CosmosLogo({ className = "", priority = false, variant = "dark" }: CosmosLogoProps) {
  const source = variant === "light" ? "/brand/logo-cosmos-v2-transparent-light.png?v=2" : "/brand/logo-cosmos-v2-transparent.png";
  return <Image className={`cosmos-wordmark ${className}`.trim()} src={source} alt="COSMOS · Laboratorios de Ingeniería" width={360} height={180} priority={priority} />;
}
