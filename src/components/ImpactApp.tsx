import { useEffect, useState } from "react";

interface CounterRow {
  category: string;
  item_name: string;
  total: number;
}

interface GalleryPhoto {
  id: string;
  r2_public_key: string;
}

interface GalleryGroup {
  groupId: string;
  received_at: number;
  category: string;
  items: { name: string; count: number }[];
  senderCaption: string | null;
  photos: GalleryPhoto[];
}

export default function ImpactApp() {
  const [counters, setCounters] = useState<CounterRow[] | null>(null);
  const [gallery, setGallery] = useState<GalleryGroup[] | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<GalleryGroup | null>(null);

  useEffect(() => {
    fetch("/api/counters")
      .then((r) => r.json<{ counters: CounterRow[] }>())
      .then((d) => setCounters(d.counters));
  }, []);

  useEffect(() => {
    const qs = filter ? `?category=${encodeURIComponent(filter)}` : "";
    fetch(`/api/gallery${qs}`)
      .then((r) => r.json<{ items: GalleryGroup[] }>())
      .then((d) => setGallery(d.items));
  }, [filter]);

  const total = counters?.reduce((sum, c) => sum + c.total, 0) ?? 0;

  return (
    <div>
      <section className="section">
        <h2>{counters === null ? "…" : total.toLocaleString()} items delivered, photo-verified</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          {counters?.map((c) => (
            <button
              key={`${c.category}-${c.item_name}`}
              type="button"
              className="card"
              style={{
                cursor: "pointer",
                textAlign: "left",
                border: filter === c.category ? "1px solid var(--accent)" : undefined,
              }}
              onClick={() => {
                setFilter(c.category === filter ? null : c.category);
                document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 700 }}>{c.total.toLocaleString()}</div>
              <div style={{ color: "var(--text-dim)" }}>
                {c.item_name} <span style={{ fontSize: 12 }}>({c.category})</span>
              </div>
            </button>
          ))}
          {counters?.length === 0 && (
            <p style={{ color: "var(--text-dim)" }}>Nothing approved yet — check back soon.</p>
          )}
        </div>
      </section>

      <section className="section" id="gallery">
        <h2>Evidence {filter ? `— ${filter}` : ""}</h2>
        {filter && (
          <button type="button" className="button secondary" onClick={() => setFilter(null)} style={{ marginBottom: 16 }}>
            Clear filter
          </button>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {gallery?.map((group) => (
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
              style={{ margin: 0, padding: group.photos.length > 1 ? 12 : 0, cursor: "zoom-in" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: group.photos.length > 1 ? "repeat(2, 1fr)" : "1fr",
                  gap: 4,
                }}
              >
                {group.photos.map((photo) => (
                  <img
                    key={photo.id}
                    src={`/api/media/${photo.r2_public_key}`}
                    alt={group.items.map((i) => `${i.count} ${i.name}`).join(", ")}
                    style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8 }}
                    loading="lazy"
                  />
                ))}
              </div>
              <figcaption style={{ fontSize: 13, color: "var(--text)", marginTop: 8 }}>
                {group.photos.length > 1 && (
                  <span style={{ display: "block", fontWeight: 600, marginBottom: 2, color: "var(--text-dim)" }}>
                    {group.photos.length} photos — same delivery
                  </span>
                )}
                {group.senderCaption && (
                  <span style={{ display: "block", fontStyle: "italic", marginBottom: 4 }}>
                    "{group.senderCaption}"
                  </span>
                )}
                {group.items.map((i) => `${i.count} ${i.name}`).join(", ")}
              </figcaption>
            </figure>
          ))}
        </div>
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
            justifyContent: "center",
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
              maxHeight: "75vh",
            }}
          >
            {lightbox.photos.map((photo) => (
              <img
                key={photo.id}
                src={`/api/media/${photo.r2_public_key}`}
                alt={lightbox.items.map((i) => `${i.count} ${i.name}`).join(", ")}
                style={{
                  maxWidth: "100%",
                  maxHeight: "75vh",
                  width: lightbox.photos.length > 1 ? "auto" : undefined,
                  borderRadius: 8,
                  objectFit: "contain",
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ))}
          </div>
          {lightbox.senderCaption && (
            <p
              style={{
                color: "var(--text)",
                marginTop: 16,
                fontSize: 18,
                fontStyle: "italic",
                textAlign: "center",
                maxWidth: "80ch",
              }}
            >
              "{lightbox.senderCaption}"
            </p>
          )}
          <p style={{ color: "var(--text)", marginTop: 12, fontSize: 20, textAlign: "center", maxWidth: "80ch" }}>
            {lightbox.items.map((i) => `${i.count} ${i.name}`).join(", ")}
          </p>
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
