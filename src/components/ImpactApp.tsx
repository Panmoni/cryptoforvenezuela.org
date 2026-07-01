import { useEffect, useState } from "react";

interface CounterRow {
  category: string;
  item_name: string;
  total: number;
}

interface GalleryItem {
  id: string;
  received_at: number;
  r2_public_key: string;
  category: string;
  items: { name: string; count: number }[];
}

export default function ImpactApp() {
  const [counters, setCounters] = useState<CounterRow[] | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[] | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  useEffect(() => {
    fetch("/api/counters")
      .then((r) => r.json())
      .then((d) => setCounters(d.counters));
  }, []);

  useEffect(() => {
    const qs = filter ? `?category=${encodeURIComponent(filter)}` : "";
    fetch(`/api/gallery${qs}`)
      .then((r) => r.json())
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {gallery?.map((item) => (
            <figure key={item.id} style={{ margin: 0 }}>
              <button
                type="button"
                onClick={() => setLightbox(item)}
                style={{ display: "block", width: "100%", padding: 0, border: "none", background: "none", cursor: "zoom-in" }}
                aria-label="View full size"
              >
                <img
                  src={`/api/media/${item.r2_public_key}`}
                  alt={item.items.map((i) => `${i.count} ${i.name}`).join(", ")}
                  style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8 }}
                  loading="lazy"
                />
              </button>
              <figcaption style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
                {item.items.map((i) => `${i.count} ${i.name}`).join(", ")}
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
          <img
            src={`/api/media/${lightbox.r2_public_key}`}
            alt={lightbox.items.map((i) => `${i.count} ${i.name}`).join(", ")}
            style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 8, objectFit: "contain" }}
          />
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
