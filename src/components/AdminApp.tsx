import { useEffect, useState } from "react";
import { CATEGORIES, type Category } from "../lib/schema";

interface QueuePhoto {
  id: string;
  media_kind: string;
  r2_pending_key: string;
  scene: string | null;
}

interface QueueGroup {
  groupId: string;
  mediaIds: string[];
  photos: QueuePhoto[];
  received_at: number;
  sender_caption: string | null;
  category: string | null;
  items_json: string | null;
  location_hint: string | null;
  visible_date: string | null;
  ocr_text: string | null;
}

interface LiveItem {
  id: string;
  received_at: number;
  r2_public_key: string | null;
  category: string;
  items: { name: string; count: number }[];
}

interface DraftItem {
  name: string;
  count: number;
}

interface SocialDraftRow {
  id: number;
  media_id: string;
  platform: string;
  caption: string;
  media_key: string;
}

export default function AdminApp() {
  const [queue, setQueue] = useState<QueueGroup[] | null>(null);
  const [live, setLive] = useState<LiveItem[] | null>(null);
  const [drafts, setDrafts] = useState<SocialDraftRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const [q, l, d] = await Promise.all([
        fetch("/api/admin/queue").then((r) => r.json<{ items: QueueGroup[] }>()),
        fetch("/api/admin/live").then((r) => r.json<{ items: LiveItem[] }>()),
        fetch("/api/admin/drafts").then((r) => r.json<{ items: SocialDraftRow[] }>()),
      ]);
      setQueue(q.items);
      setLive(l.items);
      setDrafts(d.items);
    } catch {
      setError("Failed to load — check you're logged into /admin via Cloudflare Access.");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      {error && <div className="alert-banner">{error}</div>}

      <section className="section">
        <h2>Needs review ({queue?.length ?? "…"})</h2>
        {queue?.length === 0 && <p style={{ color: "var(--text-dim)" }}>Nothing waiting. Good.</p>}
        {queue?.map((group) => (
          <ReviewCard key={group.groupId} group={group} onDone={refresh} />
        ))}
      </section>

      <section className="section">
        <h2>Live — corrections</h2>
        {live?.map((item) => (
          <LiveCard key={item.id} item={item} onDone={refresh} />
        ))}
      </section>

      <section className="section">
        <h2>Social drafts — post manually ({drafts?.length ?? "…"})</h2>
        {drafts?.map((d) => (
          <SocialDraftCard key={d.id} draft={d} onDone={refresh} />
        ))}
      </section>
    </div>
  );
}

function ReviewCard({ group, onDone }: { group: QueueGroup; onDone: () => void }) {
  const suggestedItems: DraftItem[] = (() => {
    try {
      const parsed = group.items_json ? JSON.parse(group.items_json) : [];
      return parsed.map((i: { name: string; count_estimate: number }) => ({ name: i.name, count: i.count_estimate }));
    } catch {
      return [];
    }
  })();

  const [category, setCategory] = useState<Category | "">((group.category as Category) ?? "");
  const [items, setItems] = useState<DraftItem[]>(suggestedItems.length ? suggestedItems : [{ name: "", count: 0 }]);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");

  function updateItem(i: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function approve() {
    if (!category) return alert("Pick a category first.");
    const namedItems = items.filter((i) => i.name.trim());
    if (
      namedItems.length === 0 &&
      !confirm("No items listed — this publishes as general evidence without adding to the delivery counters. Continue?")
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/approve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaIds: group.mediaIds, category, items: namedItems }),
    });
    setBusy(false);
    if (res.ok) onDone();
    else alert("Approve failed — see console.");
  }

  async function reject() {
    setBusy(true);
    const res = await fetch("/api/admin/reject", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaIds: group.mediaIds, reason: reason || undefined }),
    });
    setBusy(false);
    if (res.ok) onDone();
    else alert("Reject failed — see console.");
  }

  return (
    <div className="card" style={{ marginBottom: 20, display: "flex", gap: 20, flexWrap: "wrap" }}>
      {group.photos.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 220 }}>
          {group.photos.map((p) =>
            p.media_kind === "photo" ? (
              <img
                key={p.id}
                src={`/api/admin/media/${p.id}`}
                alt="submitted"
                title={p.scene ?? undefined}
                style={{
                  width: group.photos.length > 1 ? 104 : 220,
                  height: group.photos.length > 1 ? 104 : 220,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
            ) : p.media_kind === "video" ? (
              <video
                key={p.id}
                src={`/api/admin/media/${p.id}`}
                controls
                autoPlay
                muted
                playsInline
                style={{ width: group.photos.length > 1 ? 104 : 220, borderRadius: 8 }}
              />
            ) : (
              <a
                key={p.id}
                href={`/api/admin/media/${p.id}`}
                target="_blank"
                rel="noreferrer"
                className="button secondary"
              >
                View document
              </a>
            ),
          )}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 260 }}>
        <p style={{ color: "var(--text-dim)", fontSize: 13 }}>
          {new Date(group.received_at).toLocaleString()}
          {group.location_hint ? ` · ${group.location_hint}` : ""}
          {group.photos.length > 1 ? ` · ${group.photos.length} photos` : ""}
        </p>
        {group.sender_caption && (
          <p style={{ fontSize: 14, fontStyle: "italic" }}>"{group.sender_caption}" — sender's caption</p>
        )}
        {group.photos
          .filter((p) => p.scene)
          .map((p) => (
            <p key={p.id} style={{ fontSize: 14 }}>
              {p.scene}
            </p>
          ))}

        <label style={{ display: "block", marginBottom: 8 }}>
          Category{" "}
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            <option value="">— choose —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input
              placeholder="item name"
              value={it.name}
              onChange={(e) => updateItem(i, { name: e.target.value })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min={0}
              value={it.count}
              onChange={(e) => updateItem(i, { count: Number(e.target.value) })}
              style={{ width: 80 }}
            />
          </div>
        ))}
        <button type="button" className="button secondary" onClick={() => setItems((p) => [...p, { name: "", count: 0 }])}>
          + item
        </button>

        <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" className="button" disabled={busy} onClick={approve}>
            Approve
          </button>
          <input
            placeholder="reject reason (optional, private)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button type="button" className="button secondary" disabled={busy} onClick={reject}>
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function LiveCard({ item, onDone }: { item: LiveItem; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  async function unpublish() {
    if (!confirm("Pull this back out of the public counters for correction?")) return;
    setBusy(true);
    const res = await fetch("/api/admin/unpublish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaId: item.id }),
    });
    setBusy(false);
    if (res.ok) onDone();
    else alert("Unpublish failed — see console.");
  }

  return (
    <div className="card" style={{ marginBottom: 12, display: "flex", gap: 16, alignItems: "center" }}>
      <div style={{ flex: 1 }}>
        <strong>{item.category}</strong>
        {item.items.length > 0 ? ` — ${item.items.map((i) => `${i.count} ${i.name}`).join(", ")}` : " — general evidence"}
        <div style={{ color: "var(--text-dim)", fontSize: 13 }}>{new Date(item.received_at).toLocaleString()}</div>
      </div>
      <button type="button" className="button secondary" disabled={busy} onClick={unpublish}>
        Unpublish
      </button>
    </div>
  );
}

function SocialDraftCard({ draft, onDone }: { draft: SocialDraftRow; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  async function markPosted() {
    setBusy(true);
    const res = await fetch("/api/admin/drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: draft.id }),
    });
    setBusy(false);
    if (res.ok) onDone();
    else alert("Failed to mark posted — see console.");
  }

  return (
    <div className="card" style={{ marginBottom: 12, display: "flex", gap: 16, alignItems: "center" }}>
      <img
        src={`/api/media/${draft.media_key}`}
        alt=""
        style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6 }}
      />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{draft.platform}</span>
        <p style={{ margin: "4px 0" }}>{draft.caption}</p>
      </div>
      <button
        type="button"
        className="button secondary"
        onClick={() => navigator.clipboard.writeText(draft.caption)}
      >
        Copy
      </button>
      <button type="button" className="button" disabled={busy} onClick={markPosted}>
        Mark posted
      </button>
    </div>
  );
}
