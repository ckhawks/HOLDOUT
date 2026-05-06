import type { WeaponClass } from "@/lib/types";

interface Props {
  weaponClass: WeaponClass;
  size?: number;
  className?: string;
}

export function WeaponClassIcon({ weaponClass, size = 24, className }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (weaponClass) {
    case "pistol":
      // squat L: short barrel + grip
      return (
        <svg {...common}>
          <path d="M3 9 H14 V12 H9 L7 18 H4 L5 12 H3 Z" />
          <line x1="14" y1="10.5" x2="20" y2="10.5" />
        </svg>
      );
    case "burst":
      // long combat-rifle silhouette + 3-burst dots
      return (
        <svg {...common}>
          <path d="M2 11 H17 V13 H14 L13 16 H10 L11 13 H2 Z" />
          <line x1="17" y1="12" x2="22" y2="12" />
          <circle cx="20" cy="6" r="0.7" fill="currentColor" />
          <circle cx="22" cy="6" r="0.7" fill="currentColor" />
          <circle cx="18" cy="6" r="0.7" fill="currentColor" />
        </svg>
      );
    case "shotgun":
      // pump-action: short fat double barrel
      return (
        <svg {...common}>
          <rect x="2" y="9" width="14" height="3" />
          <rect x="2" y="12.5" width="14" height="2" />
          <line x1="16" y1="10.5" x2="22" y2="10.5" />
          <line x1="16" y1="13.5" x2="22" y2="13.5" />
          <path d="M9 14.5 L8 18 H6 L7 14.5" />
        </svg>
      );
    case "lmg":
      // long barrel with cooling vents + drum
      return (
        <svg {...common}>
          <path d="M2 10 H16 V13 H10 V18 H6 V13 H2 Z" />
          <circle cx="6" cy="15.5" r="2.2" />
          <line x1="16" y1="11.5" x2="22" y2="11.5" />
          <line x1="17" y1="9" x2="17" y2="11" />
          <line x1="19" y1="9" x2="19" y2="11" />
          <line x1="21" y1="9" x2="21" y2="11" />
        </svg>
      );
    case "energy":
      // pulse / lightning
      return (
        <svg {...common}>
          <path d="M3 12 H8 L11 6 L13 14 L16 9 H21" />
          <circle cx="3" cy="12" r="0.8" fill="currentColor" />
          <circle cx="21" cy="9" r="0.8" fill="currentColor" />
        </svg>
      );
  }
}
