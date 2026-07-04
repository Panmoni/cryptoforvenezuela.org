import { useEffect, useState, type CSSProperties } from "react";
import { fetchJsonWithRetry } from "../lib/fetchJson";

interface CounterRow {
  category: string;
  item_name: string;
  total: number;
}

interface GalleryPhoto {
  id: string;
  r2_public_key: string;
  media_kind: string;
}

interface GalleryGroup {
  groupId: string;
  received_at: number;
  category: string;
  items: { name: string; count: number }[];
  senderCaption: string | null;
  senderCaptionEn: string | null;
  photos: GalleryPhoto[];
}

/** Only worth showing the translation when it actually differs from the
 * original — a caption already in English round-trips through Workers AI
 * unchanged, and repeating it verbatim is just clutter. */
function translationDiffers(original: string | null, translated: string | null): translated is string {
  return !!translated && translated.trim().toLowerCase() !== (original ?? "").trim().toLowerCase();
}

const PAGE_SIZE = 10;

/** The text that would actually go in a tweet — same content as the caption
 * display, just flattened to plain text so there's something to copy. */
function captionText(
  senderCaption: string | null,
  senderCaptionEn: string | null,
  items: { name: string; count: number }[],
): string {
  const parts: string[] = [];
  if (senderCaption) parts.push(senderCaption);
  if (translationDiffers(senderCaption, senderCaptionEn)) parts.push(`(EN: ${senderCaptionEn})`);
  if (items.length > 0) parts.push(items.map((i) => `${i.count} ${i.name}`).join(", "));
  return parts.join(" — ");
}

/** Captions sit inside elements with their own click handling (the gallery
 * card opens the lightbox, the lightbox itself closes on click) which makes
 * selecting caption text to copy unreliable. A dedicated copy button sidesteps
 * that entirely. */
function CopyButton({ text, style }: { text: string; style?: CSSProperties }) {
  const [copied, setCopied] = useState(false);

  if (!text.trim()) return null;

  return (
    <button
      type="button"
      title={copied ? "Copied!" : "Copy text"}
      aria-label={copied ? "Copied!" : "Copy text"}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        padding: 0,
        border: "none",
        background: "transparent",
        color: copied ? "var(--accent)" : "var(--text-dim)",
        cursor: "pointer",
        flexShrink: 0,
        ...style,
      }}
    >
      {copied ? (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export default function ImpactApp() {
  const [counters, setCounters] = useState<CounterRow[] | null>(null);
  const [gallery, setGallery] = useState<GalleryGroup[] | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<GalleryGroup | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchJsonWithRetry<{ counters: CounterRow[] }>("/api/counters")
      .then((d) => setCounters(d.counters))
      .catch((err) => console.error("failed to load counters", err));
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightbox]);

  useEffect(() => {
    const qs = filter ? `?category=${encodeURIComponent(filter)}` : "";
    setPage(0);
    fetchJsonWithRetry<{ items: GalleryGroup[] }>(`/api/gallery${qs}`)
      .then((d) => setGallery(d.items))
      .catch((err) => console.error("failed to load gallery", err));
  }, [filter]);

  const total = counters?.reduce((sum, c) => sum + c.total, 0) ?? 0;
  const categoryTotals = counters?.reduce<Record<string, number>>((acc, c) => {
    acc[c.category] = (acc[c.category] ?? 0) + c.total;
    return acc;
  }, {});

  return (
    <div>
      <section className="section">
        <h2>{counters === null ? "…" : total.toLocaleString()} items delivered, photo-verified</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          {categoryTotals &&
            Object.entries(categoryTotals).map(([category, catTotal]) => (
              <button
                key={category}
                type="button"
                className="card"
                style={{
                  cursor: "pointer",
                  textAlign: "left",
                  border: filter === category ? "1px solid var(--accent)" : undefined,
                }}
                onClick={() => {
                  setFilter(category === filter ? null : category);
                  document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700 }}>{catTotal.toLocaleString()}</div>
                <div style={{ color: "var(--text-dim)" }}>{category}</div>
              </button>
            ))}
          {counters?.length === 0 && (
            <p style={{ color: "var(--text-dim)" }}>Nothing approved yet — check back soon.</p>
          )}
        </div>
        {counters && counters.length > 0 && (
          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: "pointer", color: "var(--text-dim)", fontSize: 14 }}>
              Full itemized breakdown ({counters.length} items)
            </summary>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                columnGap: 20,
                rowGap: 6,
                marginTop: 12,
                fontSize: 13,
              }}
            >
              {counters.map((c) => (
                <div key={`${c.category}-${c.item_name}`} style={{ color: "var(--text-dim)" }}>
                  <strong style={{ color: "var(--text)" }}>{c.total.toLocaleString()}</strong> {c.item_name}{" "}
                  <span style={{ opacity: 0.6 }}>({c.category})</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      <section className="section" id="gallery">
        <h2>Evidence {filter ? `— ${filter}` : ""}</h2>
        <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: -8, marginBottom: 16 }}>
          Follow programmatically: <a href="/feed.xml">RSS</a> · <a href="/feed.json">JSON Feed</a>
        </p>
        {filter && (
          <button type="button" className="button secondary" onClick={() => setFilter(null)} style={{ marginBottom: 16 }}>
            Clear filter
          </button>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {gallery?.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((group) => {
            const previewPhotos = group.photos.slice(0, 4);
            const hiddenCount = group.photos.length - previewPhotos.length;
            return (
              <figure
                key={group.groupId}
                className={group.photos.length > 1 ? "card" : undefined}
                role="button"
                tabIndex={0}
                aria-label="View full size"
                onClick={() => setLightbox(group)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setLightbox(group);
                  }
                }}
                style={{ margin: 0, padding: group.photos.length > 1 ? 12 : 0, cursor: "zoom-in", position: "relative" }}
              >
                <CopyButton
                  text={captionText(group.senderCaption, group.senderCaptionEn, group.items)}
                  style={{
                    position: "absolute",
                    top: group.photos.length > 1 ? 20 : 8,
                    right: group.photos.length > 1 ? 20 : 8,
                    zIndex: 1,
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    borderRadius: 6,
                  }}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: previewPhotos.length > 1 ? "repeat(2, 1fr)" : "1fr",
                    gridAutoRows: "1fr",
                    gap: 4,
                    height: 200,
                    overflow: "hidden",
                    borderRadius: 8,
                  }}
                >
                  {previewPhotos.map((photo, i) => (
                    <div key={photo.id} style={{ position: "relative" }}>
                      {photo.media_kind === "video" ? (
                        <video
                          src={`/api/media/${photo.r2_public_key}`}
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="metadata"
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }}
                        />
                      ) : (
                        <img
                          src={`/api/media/${photo.r2_public_key}`}
                          alt={group.items.map((it) => `${it.count} ${it.name}`).join(", ")}
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }}
                          loading="lazy"
                        />
                      )}
                      {i === previewPhotos.length - 1 && hiddenCount > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(0,0,0,0.55)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 18,
                            borderRadius: 8,
                          }}
                        >
                          +{hiddenCount}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <figcaption
                  style={{
                    fontSize: 13,
                    color: "var(--text)",
                    marginTop: 8,
                    height: 74,
                    lineHeight: 1.4,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {group.photos.length > 1 && (
                    <strong style={{ color: "var(--text-dim)" }}>{group.photos.length} photos — same delivery. </strong>
                  )}
                  {group.senderCaption && <em>"{group.senderCaption}" — </em>}
                  {translationDiffers(group.senderCaption, group.senderCaptionEn) && (
                    <span style={{ color: "var(--text-dim)" }}>(EN: "{group.senderCaptionEn}") — </span>
                  )}
                  {group.items.length > 0
                    ? group.items.map((i) => `${i.count} ${i.name}`).join(", ")
                    : !group.senderCaption && "General evidence"}
                </figcaption>
              </figure>
            );
          })}
        </div>
        {gallery && gallery.length > PAGE_SIZE && (
          <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center", marginTop: 16 }}>
            <button type="button" className="button secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span style={{ color: "var(--text-dim)", fontSize: 13 }}>
              Page {page + 1} of {Math.ceil(gallery.length / PAGE_SIZE)}
            </span>
            <button
              type="button"
              className="button secondary"
              disabled={page >= Math.ceil(gallery.length / PAGE_SIZE) - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
        {gallery?.length === 0 && <p style={{ color: "var(--text-dim)" }}>No photos in this category yet.</p>}
      </section>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            overflowY: "auto",
            padding: 20,
            zIndex: 100,
            cursor: "zoom-out",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: "90vw",
              flexShrink: 0,
            }}
          >
            {lightbox.photos.map((photo) =>
              photo.media_kind === "video" ? (
                <video
                  key={photo.id}
                  src={`/api/media/${photo.r2_public_key}`}
                  controls
                  autoPlay
                  muted
                  playsInline
                  style={{
                    maxWidth: "100%",
                    maxHeight: lightbox.photos.length > 1 ? "50vh" : "65vh",
                    width: lightbox.photos.length > 1 ? "auto" : undefined,
                    borderRadius: 8,
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img
                  key={photo.id}
                  src={`/api/media/${photo.r2_public_key}`}
                  alt={lightbox.items.map((i) => `${i.count} ${i.name}`).join(", ")}
                  style={{
                    maxWidth: "100%",
                    maxHeight: lightbox.photos.length > 1 ? "50vh" : "65vh",
                    width: lightbox.photos.length > 1 ? "auto" : undefined,
                    borderRadius: 8,
                    objectFit: "contain",
                    display: "block",
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ),
            )}
          </div>
          {lightbox.senderCaption && (
            <p
              onClick={(e) => e.stopPropagation()}
              style={{
                color: "var(--text)",
                marginTop: 16,
                fontSize: 18,
                fontStyle: "italic",
                textAlign: "center",
                maxWidth: "80ch",
                cursor: "text",
              }}
            >
              "{lightbox.senderCaption}" <CopyButton text={lightbox.senderCaption} style={{ verticalAlign: "middle" }} />
            </p>
          )}
          {translationDiffers(lightbox.senderCaption, lightbox.senderCaptionEn) && (
            <p
              onClick={(e) => e.stopPropagation()}
              style={{
                color: "var(--text-dim)",
                marginTop: 4,
                fontSize: 15,
                textAlign: "center",
                maxWidth: "80ch",
                cursor: "text",
              }}
            >
              English: "{lightbox.senderCaptionEn}"{" "}
              <CopyButton text={lightbox.senderCaptionEn ?? ""} style={{ verticalAlign: "middle" }} />
            </p>
          )}
          {lightbox.items.length > 0 && (
            <p style={{ color: "var(--text)", marginTop: 12, fontSize: 20, textAlign: "center", maxWidth: "80ch" }}>
              {lightbox.items.map((i) => `${i.count} ${i.name}`).join(", ")}
            </p>
          )}
          <button
            type="button"
            className="button secondary"
            onClick={() => setLightbox(null)}
            style={{ marginTop: 8 }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
