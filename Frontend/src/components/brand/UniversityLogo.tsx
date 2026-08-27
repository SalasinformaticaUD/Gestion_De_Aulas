import Image from "next/image";

type UniversityLogoProps = {
  className?: string;
  inverse?: boolean;
  priority?: boolean;
};

export function UniversityLogo({ className = "", inverse = false, priority = false }: UniversityLogoProps) {
  return (
    <span className={`university-logo${inverse ? " university-logo-inverse" : ""} ${className}`.trim()}>
      <Image
        alt="Universidad Distrital Francisco José de Caldas"
        className="university-logo-light"
        height={292}
        priority={priority}
        src="/brand/universidad-distrital-light.png"
        width={832}
      />
      <Image
        alt=""
        aria-hidden="true"
        className="university-logo-dark"
        height={292}
        src="/brand/universidad-distrital-dark.png"
        width={832}
      />
    </span>
  );
}
