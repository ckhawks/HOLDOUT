import type { ArmorPiece } from "@/lib/types";

interface Props {
  piece: ArmorPiece;
  size?: number;
  className?: string;
}

export function ArmorPieceIcon({ piece, size = 24, className }: Props) {
  const w = Math.round((size * 24) / 24);
  const common = {
    width: w,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className,
  };

  switch (piece) {
    case "helmet":
      // Round dome with chin strap and brim
      return (
        <svg {...common}>
          <path d="M5 13 A7 7 0 0 1 19 13 V15 H5 Z" />
          <rect x="4" y="15" width="16" height="1.5" />
          <path d="M6 16.5 L7 19 H8 L7.5 16.5 Z" />
          <path d="M16 16.5 L17 19 H18 L16.5 16.5 Z" />
        </svg>
      );

    case "chest":
      // Vest silhouette
      return (
        <svg {...common}>
          {/* shoulder straps */}
          <path d="M7 4 L9 6 V8 H6 V6 Z" />
          <path d="M17 4 L15 6 V8 H18 V6 Z" />
          {/* main vest body */}
          <path d="M6 7 H18 V20 H14 V18 H10 V20 H6 Z" />
          {/* center seam */}
          <rect x="11.5" y="7" width="1" height="11" fill="#000" opacity="0.25" />
        </svg>
      );

    case "legs":
      // Pant legs
      return (
        <svg {...common}>
          {/* belt */}
          <rect x="6" y="4" width="12" height="2" />
          {/* hip block */}
          <path d="M5 6 H19 V9 H5 Z" />
          {/* left leg */}
          <path d="M6 9 H11 V20 H7 Z" />
          {/* right leg */}
          <path d="M13 9 H18 V20 H17 Z" />
        </svg>
      );

    case "boots":
      // Combat boot side profile
      return (
        <svg {...common}>
          {/* shaft */}
          <path d="M6 6 H12 V14 H10 V18 H18 V20 H6 Z" />
          {/* tongue + laces hint */}
          <rect x="7.5" y="7" width="3" height="1" fill="#000" opacity="0.25" />
          <rect x="7.5" y="9" width="3" height="1" fill="#000" opacity="0.25" />
          <rect x="7.5" y="11" width="3" height="1" fill="#000" opacity="0.25" />
          {/* sole */}
          <rect x="6" y="20" width="13" height="1" fill="#000" opacity="0.25" />
        </svg>
      );
  }
}
