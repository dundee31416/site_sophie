// art.jsx — visuals: book covers, author avatars, scanned-page slots, icons.
// Each visual tries to load a real JPG by convention; falls back to a generated placeholder.
//
// Drop real files in these paths to replace placeholders (filename = id from data.jsx):
//   covers/<book.id>.jpg                    e.g. covers/grand-mere.jpg
//   scans/<book.id>/p<N>.jpg                e.g. scans/grand-mere/p1.jpg, p2.jpg, ...
//   authors/<author.id>.jpg                 e.g. authors/sophie.jpg

const { useState: _useState } = React;

// Probes a URL with Image() and renders <img> on success, the fallback children on miss.
// Renders the fallback while probing so there's no broken-image flash.
function ImageFallback({ src, alt, className, style, loading, children }) {
  const [status, setStatus] = React.useState("probing");
  React.useEffect(() => {
    if (!src) { setStatus("failed"); return; }
    setStatus("probing");
    const img = new Image();
    img.onload = () => setStatus("ok");
    img.onerror = () => setStatus("failed");
    img.src = src;
    return () => { img.onload = null; img.onerror = null; };
  }, [src]);
  if (status === "ok") {
    return <img src={src} alt={alt || ""} className={className} style={style} loading={loading} />;
  }
  return children;
}

// ---- simple decorative emblems (only basic shapes) ----
function Emblem({ shape, color }) {
  const common = { fill: color };
  switch (shape) {
    case "moon":
      return (<g><circle cx="32" cy="32" r="20" fill={color} /><circle cx="40" cy="26" r="17" fill="rgba(255,255,255,0.55)" /></g>);
    case "flame":
      return (<polygon points="32,8 50,40 32,56 14,40" {...common} />);
    case "star":
      return (<polygon points="32,6 39,25 59,25 43,38 49,58 32,46 15,58 21,38 5,25 25,25" {...common} />);
    case "wave":
      return (<g><circle cx="18" cy="34" r="13" {...common} /><circle cx="38" cy="34" r="13" {...common} /><circle cx="48" cy="30" r="9" {...common} /></g>);
    case "cloud":
      return (<g><circle cx="24" cy="36" r="14" {...common} /><circle cx="42" cy="36" r="12" {...common} /><rect x="20" y="36" width="26" height="14" {...common} /></g>);
    case "heart":
      return (<path d="M32 54 L10 30 A12 12 0 0 1 32 18 A12 12 0 0 1 54 30 Z" {...common} />);
    case "spiral":
      return (<g fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"><circle cx="32" cy="32" r="8" /><circle cx="32" cy="32" r="18" strokeDasharray="70 200" /></g>);
    case "gear":
      return (<g><circle cx="32" cy="32" r="16" {...common} /><circle cx="32" cy="32" r="7" fill="rgba(255,255,255,0.6)" /></g>);
    default:
      return (<circle cx="32" cy="32" r="20" {...common} />);
  }
}

// pick a contrasting crayon color for the emblem
const ACCENTS = ["#f4c020", "#e8443b", "#2b7fd4", "#4caf63", "#ec6aa8", "#fff"];
function accentFor(book) {
  const i = (book.title.length + book.id.length) % ACCENTS.length;
  let a = ACCENTS[i];
  if (a.toLowerCase() === book.color.toLowerCase()) a = ACCENTS[(i + 2) % ACCENTS.length];
  return a;
}

function CoverArt({ book, author }) {
  const accent = accentFor(book);
  const placeholder = (
    <div className="cover-art" style={{ background: book.color }}>
      <div className="cover-paper" />
      <div className="cover-emblem">
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true"><Emblem shape={book.shape} color={accent} /></svg>
      </div>
      <div className="cover-foot">
        <div className="cover-title">{book.title}</div>
        <div className="cover-by">par {author ? author.name : "?"}</div>
      </div>
      <div className="cover-spine" />
    </div>
  );
  return (
    <ImageFallback src={`covers/${book.id}.jpg`} alt={book.title} className="cover-art-real" loading="lazy">
      {placeholder}
    </ImageFallback>
  );
}

function Avatar({ author, size = 56, active = false }) {
  const initial = author.name[0];
  return (
    <div className="avatar" style={{ width: size, height: size, background: author.color, boxShadow: active ? `0 0 0 4px #fff, 0 0 0 8px ${author.color}` : undefined }}>
      <ImageFallback src={`authors/${author.id}.jpg`} alt={author.name} className="avatar-img" loading="lazy">
        <span style={{ fontSize: size * 0.5 }}>{initial}</span>
      </ImageFallback>
    </div>
  );
}

// "Everyone" avatar for the filter — no photo, always the striped pattern.
function AllAvatar({ size = 56, active = false }) {
  return (
    <div className="avatar avatar-all" style={{ width: size, height: size, boxShadow: active ? `0 0 0 4px #fff, 0 0 0 8px #2a2622` : undefined }}>
      <span style={{ fontSize: size * 0.34 }}>Tous</span>
    </div>
  );
}

// Scanned-page placeholder — striped slot, replaced by a real JPG if present.
function ScannedPage({ book, pageIndex, total }) {
  const placeholder = (
    <div className="scan-inner">
      <div className="scan-mono">scan jpg</div>
      <div className="scan-page-no">page {pageIndex + 1} / {total}</div>
      <div className="scan-hint">déposez ici la photo<br/>de la page dessinée</div>
    </div>
  );
  return (
    <div className="scan-slot" style={{ "--scan-tint": book.color }}>
      <div className="scan-tape scan-tape-l" />
      <div className="scan-tape scan-tape-r" />
      <ImageFallback
        src={`scans/${book.id}/p${pageIndex + 1}.jpg`}
        alt={`${book.title} — page ${pageIndex + 1}`}
        className="scan-image"
      >
        {placeholder}
      </ImageFallback>
    </div>
  );
}

// Illustration placeholder inside the digital page
function IlloSlot({ label, color }) {
  return (
    <div className="illo-slot" style={{ "--illo-tint": color }}>
      <div className="illo-mono">illustration</div>
      <div className="illo-label">{label}</div>
    </div>
  );
}

// ---- icons ----
const Icon = {
  search: (p) => (<svg viewBox="0 0 24 24" width={p.s||20} height={p.s||20} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>),
  arrowL: (p) => (<svg viewBox="0 0 24 24" width={p.s||28} height={p.s||28} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 5 8 12 15 19"/></svg>),
  arrowR: (p) => (<svg viewBox="0 0 24 24" width={p.s||28} height={p.s||28} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 5 16 12 9 19"/></svg>),
  back: (p) => (<svg viewBox="0 0 24 24" width={p.s||22} height={p.s||22} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="14 6 8 12 14 18"/></svg>),
  close: (p) => (<svg viewBox="0 0 24 24" width={p.s||22} height={p.s||22} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>),
  book: (p) => (<svg viewBox="0 0 24 24" width={p.s||20} height={p.s||20} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5.5C3 5 3.4 4.5 4 4.5h6c1.1 0 2 .9 2 2v13c0-1.1-.9-2-2-2H4c-.6 0-1-.4-1-1V5.5Z"/><path d="M21 5.5c0-.5-.4-1-1-1h-6c-1.1 0-2 .9-2 2v13c0-1.1.9-2 2-2h6c.6 0 1-.4 1-1V5.5Z"/></svg>),
  scan: (p) => (<svg viewBox="0 0 24 24" width={p.s||20} height={p.s||20} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h5M8 12h8M8 16h6"/></svg>),
};

Object.assign(window, { CoverArt, Avatar, AllAvatar, ScannedPage, IlloSlot, Emblem, Icon });
