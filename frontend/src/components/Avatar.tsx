import { thumbUrl } from "../api/images";
import { Icon } from "./icons";
import { ImageFallback } from "./ImageFallback";

interface AuthorInfo {
  username: string;
  display_name: string | null;
  color: string | null;
  avatar_path: string | null;
}

interface Props {
  author: AuthorInfo;
  size?: number;
  active?: boolean;
}

export function Avatar({ author, size = 56, active = false }: Props) {
  const name = author.display_name ?? author.username;
  const initial = name.charAt(0).toUpperCase();
  const color = author.color ?? "#8c5bd0";
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: active ? `0 0 0 4px #fff, 0 0 0 8px ${color}` : undefined,
      }}
    >
      <ImageFallback
        src={thumbUrl(author.avatar_path, 200)}
        alt={name}
        className="avatar-img"
        loading="lazy"
      >
        <span style={{ fontSize: size * 0.5 }}>{initial}</span>
      </ImageFallback>
    </div>
  );
}

export function AllAvatar({ size = 56, active = false }: { size?: number; active?: boolean }) {
  return (
    <div
      className="avatar avatar-all"
      style={{
        width: size,
        height: size,
        boxShadow: active ? "0 0 0 4px #fff, 0 0 0 8px #2a2622" : undefined,
      }}
    >
      <Icon.grid size={Math.round(size * 0.5)} />
    </div>
  );
}
