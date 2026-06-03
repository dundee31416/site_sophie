interface Props {
  onClick?: () => void;
}

export function Logo({ onClick }: Props) {
  const letters = ["L", "i", "s", "o", "n", "s"];
  return (
    <div className="logo" onClick={onClick}>
      {letters.map((c, i) => (
        <span key={i} className={`l${i}`}>
          {c}
        </span>
      ))}
      <span className="bang">!</span>
      <span className="logo-sub">les histoires de la maison</span>
    </div>
  );
}
