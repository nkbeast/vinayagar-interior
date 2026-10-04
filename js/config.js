/* ═══════════════════════════════════════════════════════════
   SITE CONFIG — single source of truth.
   Swap phone / socials / map here when the business listing
   and social accounts go live.
   ═══════════════════════════════════════════════════════════ */
export const SITE_CONFIG = {
  name: "Vinayagar Interior",
  nameTamil: "விநாயகா இன்டீரியர்",
  phone: "+917010972189",
  phoneDisplay: "+91 70109 72189",
  whatsapp: "https://wa.me/917010972189",
  whatsappPrefill:
    "https://wa.me/917010972189?text=Hi%20Vinayagar%20Interior%2C%20I%27d%20like%20to%20discuss%20my%20interior%20project.",
  mapsPin: "https://www.google.com/maps?q=11.0757108,76.8598009&z=17&hl=en",
  mapsEmbed:
    "https://maps.google.com/maps?q=11.0757108,76.8598009&z=17&hl=en&output=embed",
  socials: {
    instagram: null, // TODO: set URL when created
    youtube: null,   // TODO: set URL when created
    facebook: null,  // TODO: set URL when created
  },
};

/* ── Works gallery (curated from real project photos) ────── */
export const WORKS = [
  { img: "img-01.jpg", cap: "Bookshelf & Décor Styling" },
  { img: "img-19.jpg", cap: "Bedroom Wardrobe Wall" },
  { img: "img-12.jpg", cap: "Kitchen · Fluted Breakfast Counter" },
  { img: "img-25.jpg", cap: "Kitchen Partition Counter" },
  { img: "img-08.jpg", cap: "Storage Cabinet · Open & Closed" },
  { img: "img-10.jpg", cap: "Storage Cabinet · Mosaic Doors" },
  { img: "img-20.jpg", cap: "TV Wall Panel · Marble & Wood" },
  { img: "img-03.jpg", cap: "Workshop-Finish Wardrobe" },
  { img: "img-07.jpg", cap: "Modular Wardrobe Interior" },
  { img: "img-14.jpg", cap: "Fluted Panel Detail" },
  { img: "img-16.jpg", cap: "Office Partitions · In Progress" },
  { img: "img-05.jpg", cap: "Kitchen Base · Black Granite" },
];

/* ── Process timeline (real workshop & site photos) ──────── */
export const PROCESS = [
  {
    no: "01", name: "Consultation & Site Visit",
    text: "We measure, mark and photograph every corner — your habits define the plan.",
    before: "img-29.jpg", after: null, tag: "On-site · Measurements",
  },
  {
    no: "02", name: "3D Design & Transparent Quote",
    text: "See your furniture before we build it. One detailed quote — no surprise extras later.",
    before: "img-10.jpg", after: null, tag: "Design Studio",
  },
  {
    no: "03", name: "Material Selection",
    text: "Branded plywood and laminates, hot-pressed in our own unit for a bond that lasts.",
    before: "img-15.jpg", after: null, tag: "Our Factory · Hot Press",
  },
  {
    no: "04", name: "Factory Production",
    text: "Panel saw, hot press and automatic edge banding under one roof — showroom finish, every panel.",
    before: "img-13.jpg", after: null, tag: "Made In-house",
  },
  {
    no: "05", name: "Installation & Finishing",
    text: "Bare frames become finished rooms. Hover the card to see a real before → after.",
    before: "img-49.jpg", after: "img-19.jpg", tag: "Bare → Finished",
  },
  {
    no: "06", name: "Handover & Warranty",
    text: "Cleaned, styled, blessed and handed over — with warranty on wood and hardware.",
    before: "img-33.jpg", after: null, tag: "Griha Pravesh Ready",
  },
];

/* ── Services ────────────────────────────────────────────── */
export const SERVICES = [
  {
    name: "Residential Interiors",
    desc: "Complete home interiors — living rooms, bedrooms, modular kitchens, wardrobes, false ceiling and layered lighting, designed around how your family actually lives.",
    points: ["Modular kitchens & wardrobes", "False ceiling & lighting design", "Painting, tiling & civil work"],
    object: "sofa",
    wa: "Residential%20Interiors",
  },
  {
    name: "Commercial Interiors",
    desc: "Showrooms, retail shops, restaurants and clinics — fit-outs engineered to look premium, survive footfall and open on schedule.",
    points: ["Retail & showroom fit-outs", "Reception & dining spaces", "Branding-friendly finishes"],
    object: "counter",
    wa: "Commercial%20Interiors",
  },
  {
    name: "Office & Workspace Design",
    desc: "Ergonomic workspaces, cabins, conference rooms and receptions that make small teams feel like serious companies.",
    points: ["Workstations & cabins", "Glass & aluminium partitions", "Acoustic & lighting comfort"],
    object: "desk",
    wa: "Office%20%26%20Workspace%20Design",
  },
  {
    name: "Turnkey Interior Solutions",
    desc: "Design → civil → carpentry → electrical → painting → handover. One contract, one team, zero coordination burden on you.",
    points: ["Single-point responsibility", "Fixed timelines & milestones", "Weekly photo progress updates"],
    object: "plan",
    wa: "Turnkey%20Interior%20Solutions",
  },
  {
    name: "Modular Furniture & Carpentry",
    desc: "Factory-finish wardrobes, TV units, crockery units, cots and study units — edge-banded in our workshop, assembled dust-free at your home.",
    points: ["Factory edge-banding finish", "Soft-close German hardware", "Made to your mm, not to a catalogue"],
    object: "wardrobe",
    wa: "Modular%20Furniture%20%26%20Custom%20Carpentry",
  },
  {
    name: "Furniture Sales & Styling",
    desc: "Ready-to-buy sofas, cots, dining sets and décor from our own collection — walk in, pick today, deliver this week.",
    points: ["Ready-stock furniture", "Custom upholstery options", "Décor & soft furnishings"],
    object: "chair",
    wa: "Furniture%20Sales%20%26%20Styling",
  },
];

/* ── Light i18n (EN default; தமிழ் for key UI strings) ───── */
export const I18N = {
  ta: {
    cta_whatsapp: "வாட்ஸ்அப்பில் பேசுங்கள்",
    scroll: "உருட்டி உள்ளே வாங்க",
    hero_sub: "மேட்டுப்பாளையம், கோயம்புத்தூர் & நீலகிரி முழுவதும் — வீடு, கடை மற்றும் அலுவலக இன்டீரியர்: வடிவமைப்பு முதல் கையளிப்பு வரை.",
    start_project: "உங்கள் ப்ராஜெக்டை தொடங்குங்கள்",
    explore_work: "நம்ம வேலைகளை பாருங்க",
  },
};
export const t = (k) => (document.documentElement.lang === "ta" ? I18N.ta[k] : null);
