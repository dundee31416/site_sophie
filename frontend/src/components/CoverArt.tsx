import { ImageFallback } from "./ImageFallback";

export type EmblemShape =
  | "moon"
  | "flame"
  | "star"
  | "wave"
  | "cloud"
  | "heart"
  | "spiral"
  | "gear";

interface WorkInfo {
  id: number;
  slug: string;
  title: string;
  color: string | null;
  shape: string | null;
  cover_path: string | null;
}

interface AuthorInfo {
  color: string | null;
  display_name: string | null;
  username: string;
}

interface Props {
  work: WorkInfo;
  author: AuthorInfo;
}

function Emblem({ shape, color }: { shape: EmblemShape | string | null; color: string }) {
  const common = { fill: color };
  switch (shape) {
    case "moon":
      return (
        <g>
          <circle cx="32" cy="32" r="20" fill={color} />
          <circle cx="40" cy="26" r="17" fill="rgba(255,255,255,0.55)" />
        </g>
      );
    case "flame":
      return <polygon points="32,8 50,40 32,56 14,40" {...common} />;
    case "star":
      return (
        <polygon
          points="32,6 39,25 59,25 43,38 49,58 32,46 15,58 21,38 5,25 25,25"
          {...common}
        />
      );
    case "wave":
      return (
        <g>
          <circle cx="18" cy="34" r="13" {...common} />
          <circle cx="38" cy="34" r="13" {...common} />
          <circle cx="48" cy="30" r="9" {...common} />
        </g>
      );
    case "cloud":
      return (
        <g>
          <circle cx="24" cy="36" r="14" {...common} />
          <circle cx="42" cy="36" r="12" {...common} />
          <rect x="20" y="36" width="26" height="14" {...common} />
        </g>
      );
    case "heart":
      return (
        <path d="M32 54 L10 30 A12 12 0 0 1 32 18 A12 12 0 0 1 54 30 Z" {...common} />
      );
    case "spiral":
      return (
        <g fill="none" stroke={color} strokeWidth="6" strokeLinecap="round">
          <circle cx="32" cy="32" r="8" />
          <circle cx="32" cy="32" r="18" strokeDasharray="70 200" />
        </g>
      );
    case "gear":
      return (
        <g>
          <circle cx="32" cy="32" r="16" {...common} />
          <circle cx="32" cy="32" r="7" fill="rgba(255,255,255,0.6)" />
        </g>
      );
    default:
      return <circle cx="32" cy="32" r="20" {...common} />;
  }
}

function darken(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const norm = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const num = parseInt(norm, 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `rgb(${r}, ${g}, ${b})`;
}

export function CoverArt({ work, author }: Props) {
  // Author identity drives the cover color, so every book by the same child
  // shares the same base — the shelf reads as personal, not random.
  const baseColor = author.color ?? work.color ?? "#8c5bd0";
  const deepColor = darken(baseColor, 32);
  const monogram = (author.display_name ?? author.username).charAt(0).toUpperCase();

  const placeholder = (
    <div
      className="cover-art"
      style={{ background: `linear-gradient(155deg, ${baseColor}, ${deepColor})` }}
    >
      <div className="cover-paper" />
      <div className="cover-frame" />
      <div className="cover-medallion">
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
          <Emblem shape={work.shape} color={baseColor} />
        </svg>
      </div>
      <div className="cover-monogram" aria-hidden="true">{monogram}</div>
      <div className="cover-spine" />
    </div>
  );

  return (
    <ImageFallback
      src={work.cover_path}
      alt={work.title}
      className="cover-art-real"
      loading="lazy"
    >
      {placeholder}
    </ImageFallback>
  );
}
