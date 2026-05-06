interface Props {
  brandId: string;
  size?: number;
  className?: string;
}

export function BrandLogo({ brandId, size = 28, className }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (brandId) {
    case "brickeye":
      // brick rectangle with eye dot
      return (
        <svg {...common}>
          <rect x="4" y="10" width="24" height="12" rx="1" />
          <circle cx="16" cy="16" r="2.5" fill="currentColor" />
        </svg>
      );
    case "skarn":
      // angular shard / lightning S
      return (
        <svg {...common}>
          <path d="M22 6 L12 14 H20 L10 26" />
        </svg>
      );
    case "vossen":
      // crossed V-H
      return (
        <svg {...common}>
          <path d="M6 6 L16 22 L26 6" />
          <line x1="11" y1="14" x2="21" y2="14" />
        </svg>
      );
    case "ironworks":
      // anvil silhouette
      return (
        <svg {...common}>
          <path d="M5 14 H27 L24 18 H8 Z" fill="currentColor" />
          <rect x="13" y="18" width="6" height="6" />
          <rect x="9" y="24" width="14" height="2" />
        </svg>
      );
    case "halberd":
      // halberd blade
      return (
        <svg {...common}>
          <line x1="16" y1="4" x2="16" y2="28" />
          <path d="M16 8 L24 12 L16 16 Z" fill="currentColor" />
          <path d="M16 10 L8 14" />
        </svg>
      );
    case "aetius":
      // triangle with inscribed circle (eye-of-providence shape)
      return (
        <svg {...common}>
          <path d="M16 5 L27 25 H5 Z" />
          <circle cx="16" cy="19" r="3" fill="currentColor" />
        </svg>
      );
    case "nemora":
      // spiral
      return (
        <svg {...common}>
          <path d="M16 6 A10 10 0 1 1 6 16 A6 6 0 1 1 22 16 A4 4 0 1 1 14 16" />
        </svg>
      );
    case "quill":
      // quill-feather diagonal w/ barbs
      return (
        <svg {...common}>
          <line x1="6" y1="26" x2="26" y2="6" />
          <line x1="20" y1="6" x2="22" y2="10" />
          <line x1="16" y1="10" x2="18" y2="14" />
          <line x1="12" y1="14" x2="14" y2="18" />
          <line x1="8" y1="18" x2="10" y2="22" />
        </svg>
      );
    case "ostrog":
      // tower silhouette w/ crenellations
      return (
        <svg {...common}>
          <path d="M8 26 V12 L11 12 V8 L13 8 V12 L19 12 V8 L21 8 V12 L24 12 V26 Z" />
          <line x1="8" y1="26" x2="24" y2="26" />
        </svg>
      );
    case "cipher":
      // stylized question/cipher mark
      return (
        <svg {...common}>
          <path d="M10 12 A6 6 0 1 1 16 18 V21" />
          <circle cx="16" cy="25" r="1" fill="currentColor" />
        </svg>
      );
    case "sablefield":
      // diamond w/ inset square
      return (
        <svg {...common}>
          <path d="M16 4 L28 16 L16 28 L4 16 Z" />
          <rect x="12" y="12" width="8" height="8" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="10" />
        </svg>
      );
  }
}
