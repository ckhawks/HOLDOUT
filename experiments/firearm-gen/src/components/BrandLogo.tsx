import { BRANDS } from "@/lib/data/weapons";

interface Props {
  brandId: string;
  size?: number;
  className?: string;
  /** override brand color; default uses BRANDS[brandId].color */
  tint?: string;
}

export function BrandLogo({ brandId, size = 28, className, tint }: Props) {
  const color = tint ?? BRANDS[brandId]?.color ?? "currentColor";
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    style: { color },
  };

  switch (brandId) {
    case "brickeye":
      // brick rectangle with eye dot
      return (
        <svg {...common}>
          <rect x="4" y="10" width="24" height="12" rx="1" />
          <circle cx="16" cy="16" r="2.8" fill={color} stroke="none" />
        </svg>
      );

    case "skarn":
      // angular shard / lightning S
      return (
        <svg {...common}>
          <path d="M22 6 L12 14 H20 L10 26" />
          <circle cx="22" cy="6" r="1.2" fill={color} stroke="none" />
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
          <path d="M5 14 H27 L24 18 H8 Z" fill={color} />
          <rect x="13" y="18" width="6" height="6" />
          <rect x="9" y="24" width="14" height="2" fill={color} />
        </svg>
      );

    case "reike":
      // chevron stack (tactical wordmark feel)
      return (
        <svg {...common}>
          <path d="M6 22 L16 10 L26 22" />
          <path d="M10 26 L16 18 L22 26" />
        </svg>
      );

    case "halberd":
      // halberd blade
      return (
        <svg {...common}>
          <line x1="16" y1="4" x2="16" y2="28" />
          <path d="M16 8 L25 13 L16 17 Z" fill={color} />
          <path d="M16 11 L8 15" />
        </svg>
      );

    case "aetius":
      // triangle with inscribed circle
      return (
        <svg {...common}>
          <path d="M16 5 L27 25 H5 Z" />
          <circle cx="16" cy="19" r="3.2" fill={color} stroke="none" />
        </svg>
      );

    case "nemora":
      // hexagon with inner ring (organic-tech)
      return (
        <svg {...common}>
          <path d="M16 5 L26 11 V21 L16 27 L6 21 V11 Z" />
          <circle cx="16" cy="16" r="4.2" />
        </svg>
      );

    case "quill":
      // quill-feather diagonal
      return (
        <svg {...common}>
          <line x1="6" y1="26" x2="26" y2="6" />
          <line x1="20" y1="6" x2="22" y2="10" />
          <line x1="16" y1="10" x2="18" y2="14" />
          <line x1="12" y1="14" x2="14" y2="18" />
          <line x1="8" y1="18" x2="10" y2="22" />
        </svg>
      );

    case "pellucid":
      // concentric squares (clear-glass / lens feel)
      return (
        <svg {...common}>
          <rect x="5" y="5" width="22" height="22" />
          <rect x="10" y="10" width="12" height="12" />
          <line x1="5" y1="5" x2="10" y2="10" />
          <line x1="27" y1="27" x2="22" y2="22" />
          <line x1="27" y1="5" x2="22" y2="10" />
          <line x1="5" y1="27" x2="10" y2="22" />
        </svg>
      );

    case "ostrog":
      // tower silhouette
      return (
        <svg {...common}>
          <path d="M8 26 V12 L11 12 V8 L13 8 V12 L19 12 V8 L21 8 V12 L24 12 V26 Z" />
          <line x1="8" y1="26" x2="24" y2="26" />
          <rect x="14" y="18" width="4" height="8" fill={color} stroke="none" />
        </svg>
      );

    case "cipher":
      // inscribed cipher rune (square + diagonal)
      return (
        <svg {...common}>
          <rect x="6" y="6" width="20" height="20" />
          <line x1="6" y1="16" x2="26" y2="16" />
          <line x1="16" y1="6" x2="16" y2="26" />
          <circle cx="22" cy="22" r="2" fill={color} stroke="none" />
        </svg>
      );

    case "sablefield":
      // diamond w/ inset square
      return (
        <svg {...common}>
          <path d="M16 4 L28 16 L16 28 L4 16 Z" />
          <rect x="12" y="12" width="8" height="8" fill={color} stroke="none" />
        </svg>
      );

    case "wraith":
      // ghost-arc / hollow circle with vertical slash
      return (
        <svg {...common}>
          <path d="M6 16 A10 10 0 0 1 26 16 V26 L22 23 L18 26 L14 23 L10 26 V16 Z" />
          <circle cx="13" cy="14" r="1.2" fill={color} stroke="none" />
          <circle cx="19" cy="14" r="1.2" fill={color} stroke="none" />
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
