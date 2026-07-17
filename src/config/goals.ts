/**
 * Build-time constants + copy for the "/10k" relief-plan goal page.
 *
 * The dollar targets come from Jaifred's campaign brief for the June 24 2026
 * twin earthquakes — the itemized budget for the first relief tranche
 * ($3,500 + $3,000 + $3,000 = $9,500). They are a *published plan*, not a
 * per-donation attribution: every donation lands in the one on-chain wallet
 * in src/config/addresses.ts, so the tracker shows a single real raised total
 * against this plan and never invents a per-bucket split.
 *
 * This page is a PREVIEW under review by Jaifred before it's linked from the
 * site (the page is noindex). Its copy lives here — in a small en/es map —
 * rather than in src/i18n/ui.ts on purpose: the wording is still under review,
 * and pushing not-yet-approved strings through the 14-locale ui.ts + machine
 * translation pipeline would be wasted work that ui.ts's type system would
 * also force onto all 14 locales at once. On promotion, move these strings
 * into ui.ts and let the existing pipeline fill in the other 12 locales.
 */

export type GoalLang = "en" | "es";
export type BucketKey = "supplies" | "shelter" | "animals";

export interface GoalBucket {
  key: BucketKey;
  /** This slice of the plan, in USD. */
  usd: number;
}

/** Priority order === deploy order: family supplies first, then emergency
 * shelters, then the animal shelter (FUNREMURA). The tracker's segmented bar
 * is laid out left-to-right in this order. */
export const GOAL_BUCKETS: readonly GoalBucket[] = [
  { key: "supplies", usd: 3500 },
  { key: "shelter", usd: 3000 },
  { key: "animals", usd: 3000 },
];

/** $9,500 — summed from the plan above so the two never drift apart. */
export const RELIEF_GOAL_USD = GOAL_BUCKETS.reduce((sum, b) => sum + b.usd, 0);

interface BucketCopy {
  title: string;
  body: string;
}

interface GoalCopy {
  metaTitle: string;
  metaDescription: string;
  previewNote: string;
  heroTitle: string;
  heroBody: string;
  howHeading: string;
  steps: { title: string; body: string }[];
  progressHeading: string;
  raised: string;
  ofGoal: string;
  toGo: string;
  unavailable: string;
  planNote: string;
  buckets: Record<BucketKey, BucketCopy>;
  donateHeading: string;
  donateBody: string;
}

export const GOAL_COPY: Record<GoalLang, GoalCopy> = {
  en: {
    metaTitle: "Our $9,500 earthquake relief plan",
    metaDescription:
      "Exactly what Crypto for Venezuela is raising for after the June 2026 earthquakes — food, shelter and medicine — and how far we've gotten. Wallet to wallet, every purchase photo-verified.",
    previewNote: "Preview for review — not yet linked from the site.",
    heroTitle: "Turn $9,500 in crypto into food, shelter and medicine.",
    heroBody:
      "After the June 24 earthquakes, here's exactly what we're raising for — and how close we are. Every dollar lands in one public wallet and is spent on the supplies below, with every purchase photographed.",
    howHeading: "How it works",
    steps: [
      {
        title: "You send crypto",
        body: "Any coin, any of 9 chains — straight to a self-custodied wallet. No account, no middleman.",
      },
      {
        title: "Volunteers buy supplies",
        body: "A team on the ground in Caracas buys food, water, tents and medicine, and delivers them to families.",
      },
      {
        title: "You see the proof",
        body: "Every purchase and delivery is photographed and posted, with the on-chain transaction anyone can verify.",
      },
    ],
    progressHeading: "The plan: $9,500",
    raised: "raised so far",
    ofGoal: "of",
    toGo: "still to go",
    unavailable: "Live USD total is briefly unavailable — the plan below is unchanged.",
    planNote:
      "One wallet, one running total. The segments show the order funds are deployed, not a per-donation split.",
    buckets: {
      supplies: {
        title: "Food, water & family supplies",
        body: "Non-perishable food, drinking water, baby formula, diapers, hygiene kits, clothing and packing for family combos.",
      },
      shelter: {
        title: "Emergency shelters",
        body: "20 tents and 30m of plastic tarp to get families off the street through Venezuela's rainy season.",
      },
      animals: {
        title: "Animal shelter — FUNREMURA",
        body: "Dog and cat food plus building materials to repair and expand a Caracas animal rescue.",
      },
    },
    donateHeading: "Donate",
    donateBody: "Pick a chain and send any amount. The total above updates as transactions confirm on-chain.",
  },
  es: {
    metaTitle: "Nuestro plan de ayuda de $9.500",
    metaDescription:
      "Exactamente para qué recauda Crypto for Venezuela tras los terremotos de junio de 2026 — comida, refugio y medicinas — y cuánto hemos avanzado. Billetera a billetera, cada compra verificada con fotos.",
    previewNote: "Vista previa para revisión — aún no enlazada desde el sitio.",
    heroTitle: "Convierte $9.500 en cripto en comida, refugio y medicinas.",
    heroBody:
      "Tras los terremotos del 24 de junio, esto es exactamente para lo que recaudamos, y qué tan cerca estamos. Cada dólar llega a una sola billetera pública y se gasta en los suministros de abajo, con cada compra fotografiada.",
    howHeading: "Cómo funciona",
    steps: [
      {
        title: "Envías cripto",
        body: "Cualquier moneda, en cualquiera de 9 redes — directo a una billetera autocustodiada. Sin cuenta, sin intermediarios.",
      },
      {
        title: "Los voluntarios compran suministros",
        body: "Un equipo en terreno en Caracas compra comida, agua, carpas y medicinas, y las entrega a las familias.",
      },
      {
        title: "Ves la prueba",
        body: "Cada compra y entrega se fotografía y se publica, con la transacción en cadena que cualquiera puede verificar.",
      },
    ],
    progressHeading: "El plan: $9.500",
    raised: "recaudado hasta ahora",
    ofGoal: "de",
    toGo: "por recaudar",
    unavailable: "El total en USD no está disponible por un momento — el plan de abajo no cambia.",
    planNote:
      "Una billetera, un total acumulado. Los segmentos muestran el orden en que se despliegan los fondos, no un reparto por donación.",
    buckets: {
      supplies: {
        title: "Comida, agua y suministros familiares",
        body: "Alimentos no perecederos, agua potable, fórmula infantil, pañales, kits de higiene, ropa y empaque para combos familiares.",
      },
      shelter: {
        title: "Refugios de emergencia",
        body: "20 carpas y 30 m de lona plástica para sacar a las familias de la calle durante la temporada de lluvias en Venezuela.",
      },
      animals: {
        title: "Refugio de animales — FUNREMURA",
        body: "Comida para perros y gatos más materiales de construcción para reparar y ampliar un refugio de animales en Caracas.",
      },
    },
    donateHeading: "Dona",
    donateBody:
      "Elige una red y envía cualquier monto. El total de arriba se actualiza a medida que las transacciones se confirman en cadena.",
  },
};
