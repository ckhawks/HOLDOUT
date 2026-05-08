import type { WeaponClass } from "@/lib/types";

interface Props {
  weaponClass: WeaponClass;
  size?: number;
  className?: string;
}

// All icons drawn at viewBox 0 0 32 24 (wide aspect — guns are long).
// Filled silhouettes in currentColor; small stroke accents where needed.

export function WeaponClassIcon({ weaponClass, size = 24, className }: Props) {
  // Maintain aspect by treating size as height.
  const w = Math.round((size * 32) / 24);
  const common = {
    width: w,
    height: size,
    viewBox: "0 0 32 24",
    fill: "currentColor",
    className,
  };

  switch (weaponClass) {
    case "pistol":
      // Compact handgun: slide on top, sloped grip below, small barrel + sight bump
      return (
        <svg {...common}>
          {/* slide */}
          <path d="M5 9 H22 V12 H20 L17 21 H10 L13 12 H5 Z" />
          {/* small front sight + barrel */}
          <rect x="20" y="7.5" width="2" height="1.5" />
          <rect x="22" y="9.5" width="3" height="2" />
        </svg>
      );

    case "burst":
      // AR-style: long top receiver + handguard + barrel, pistol grip, magazine
      return (
        <svg {...common}>
          {/* stock */}
          <path d="M2 10 H7 V14 H4 L2 13 Z" />
          {/* receiver + handguard */}
          <rect x="7" y="10" width="20" height="3" />
          {/* barrel */}
          <rect x="27" y="11" width="4" height="1.2" />
          {/* front sight */}
          <rect x="25.5" y="8.5" width="1.2" height="2" />
          {/* rear sight */}
          <rect x="9" y="8.5" width="1.2" height="1.8" />
          {/* pistol grip */}
          <path d="M9 13 H12 L11 18 H8 Z" />
          {/* magazine */}
          <rect x="14" y="13" width="4" height="6" rx="0.4" />
        </svg>
      );

    case "shotgun":
      // Pump-action: barrel on top, parallel pump tube below, stock w/ grip behind
      return (
        <svg {...common}>
          {/* stock */}
          <path d="M2 10 H6 V13 H4 L2 12.5 Z" />
          {/* receiver block */}
          <rect x="6" y="10" width="6" height="4" />
          {/* barrel */}
          <rect x="12" y="9.5" width="18" height="2.2" />
          {/* pump tube */}
          <rect x="12" y="12.5" width="14" height="1.6" />
          {/* bead sight */}
          <rect x="29.5" y="8.5" width="1" height="1" />
          {/* grip below stock */}
          <path d="M5 13 H8 L7.5 18 H4.5 Z" />
        </svg>
      );

    case "lmg":
      // Belt-fed: long barrel, drum/box mag underneath, bipod legs near front
      return (
        <svg {...common}>
          {/* stock */}
          <path d="M1 10 H5 V13 H3 L1 12.5 Z" />
          {/* receiver */}
          <rect x="5" y="9.5" width="18" height="3.5" />
          {/* barrel */}
          <rect x="23" y="10.5" width="9" height="1.6" />
          {/* cooling vents */}
          <rect x="24" y="9.2" width="0.8" height="1.2" />
          <rect x="26" y="9.2" width="0.8" height="1.2" />
          <rect x="28" y="9.2" width="0.8" height="1.2" />
          {/* drum mag */}
          <circle cx="12" cy="16.5" r="3.2" />
          {/* bipod */}
          <path d="M21 13 L19 19 H20.4 L22 13 Z" />
          <path d="M21 13 L23 19 H21.6 L20 13 Z" />
          {/* grip */}
          <path d="M6 13 H8.5 L8 17 H5.5 Z" />
        </svg>
      );

    case "energy":
      // Blocky futurist: sealed body with vents, emitter, energy bolt forward
      return (
        <svg {...common}>
          {/* main body */}
          <path d="M3 9 H19 V15 H17 V17 H10 V15 H3 Z" />
          {/* coil ridges on top */}
          <rect x="6" y="7.5" width="1.4" height="1.5" />
          <rect x="9" y="7.5" width="1.4" height="1.5" />
          <rect x="12" y="7.5" width="1.4" height="1.5" />
          {/* emitter housing */}
          <rect x="19" y="10" width="3" height="4" />
          {/* energy bolt */}
          <path d="M22 12 L26 9 L24.5 12 L28 12 L24 16 L25.5 12 Z" />
          {/* grip */}
          <path d="M5 17 H8 L7.5 20 H5.5 Z" />
        </svg>
      );
  }
}
