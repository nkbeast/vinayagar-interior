/* ═══════════════════════════════════════════════════════════
   MAIN — boot, preloader, smooth scroll, cursor, nav, misc UI
   ═══════════════════════════════════════════════════════════ */
import { SITE_CONFIG, t } from "./config.js";
import { World } from "./world.js";
import { initSections } from "./sections.js";

gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = matchMedia("(hover: none)").matches;

/* ── toast helper ─────────────────────────────────────────── */
export function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.getElementById("toasts").appendChild(el);
  gsap.from(el, { y: 24, opacity: 0, duration: 0.5, ease: "expo.out" });
  setTimeout(() => gsap.to(el, { y: 12, opacity: 0, duration: 0.4, onComplete: () => el.remove() }), 3400);
}

/* ── smooth scroll ────────────────────────────────────────── */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
window.__lenis = lenis;
const scrollTo = (target) => {
  if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (x) => 1 - Math.pow(1 - x, 4) });
  else document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
};
document.querySelectorAll("[data-scroll]").forEach((a) =>
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (href?.startsWith("#")) { e.preventDefault(); scrollTo(href); }
  })
);

/* ── WebGL world ──────────────────────────────────────────── */
let world = null;
try {
  world = new World(document.getElementById("gl"));
} catch (err) {
  console.warn("WebGL unavailable — running DOM-only.", err);
  document.getElementById("gl").style.display = "none";
}
window.__world = world;

addEventListener("mousemove", (e) => world?.setMouse(e.clientX, e.clientY), { passive: true });

/* ── custom cursor ────────────────────────────────────────── */
if (!isTouch) {
  const cursor = document.getElementById("cursor");
  const dot = cursor.querySelector(".c-dot");
  const ring = cursor.querySelector(".c-ring");
  const label = cursor.querySelector(".c-label");
  let cx = innerWidth / 2, cy = innerHeight / 2, rx = cx, ry = cy;
  addEventListener("mousemove", (e) => { cx = e.clientX; cy = e.clientY; }, { passive: true });
  gsap.ticker.add(() => {
    rx += (cx - rx) * 0.16; ry += (cy - ry) * 0.16;
    dot.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    label.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
  });
  document.querySelectorAll("a, button").forEach((el) =>
    el.addEventListener("mouseenter", () => ring.style.width = ring.style.height = "48px"));
  document.querySelectorAll("a, button").forEach((el) =>
    el.addEventListener("mouseleave", () => ring.style.width = ring.style.height = ""));
  window.bindCursor = (sel, cls, text) =>
    document.querySelectorAll(sel).forEach((el) => {
      el.addEventListener("mouseenter", () => { cursor.classList.add(cls); label.textContent = text; });
      el.addEventListener("mouseleave", () => cursor.classList.remove(cls));
    });
}

/* ── magnetic buttons ─────────────────────────────────────── */
if (!isTouch && !reduced) {
  document.querySelectorAll(".magnetic").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      gsap.to(el, { x: dx * 0.22, y: dy * 0.22, duration: 0.4, ease: "power3.out" });
    });
    el.addEventListener("mouseleave", () =>
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1,0.4)" }));
  });
}

/* ── nav behaviour ────────────────────────────────────────── */
const nav = document.getElementById("nav");
let lastY = 0;
const onScrollNav = (y) => {
  nav.classList.toggle("hidden", y > 140 && y > lastY + 4 && !document.body.dataset.menuOpen);
  nav.classList.toggle("shrunk", y > 140);
  lastY = y;
};
ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => onScrollNav(self.scroll()) });

/* light/dark nav per chapter */
const lightChapters = ["philosophy", "works", "stats"];
ScrollTrigger.create({
  start: 0, end: "max",
  onUpdate: () => {
    const sc = window.__activeChapter;
    nav.classList.toggle("on-light", lightChapters.includes(sc));
  },
});

/* active chapter link */
const linkFor = {};
document.querySelectorAll("[data-chapter-link]").forEach((a) => (linkFor[a.dataset.chapterLink] = a));
ScrollTrigger.create({
  start: 0, end: "max",
  onUpdate: () => {
    const sc = window.__activeChapter;
    document.querySelectorAll(".nav-links a").forEach((a) => a.classList.remove("active"));
    if (linkFor[sc]) linkFor[sc].classList.add("active");
  },
});

/* ── progress rail ────────────────────────────────────────── */
const railFill = document.getElementById("rail-fill");
const railDot = document.getElementById("rail-dot");
const railChapter = document.getElementById("rail-chapter");
ScrollTrigger.create({
  start: 0, end: "max",
  onUpdate: (self) => {
    const p = self.progress;
    railFill.style.height = `${p * 100}%`;
    railDot.style.top = `${p * 100}%`;
  },
});
const chapterNames = {
  hero: "Threshold", philosophy: "Our Craft", services: "Services",
  process: "Process", works: "Works", furniture: "Furniture",
  stats: "Trust", contact: "Begin", footer: "விநாயகா",
};

/* ── hero morph word (home ↔ வீடு) ───────────────────────── */
const morphWords = ["home", "வீடு", "elegance", "அழகு"];
const morphEl = document.getElementById("morph-word");
let mi = 0;
if (!reduced) setInterval(() => {
  mi = (mi + 1) % morphWords.length;
  gsap.to(morphEl, {
    y: -18, opacity: 0, filter: "blur(6px)", duration: 0.45, ease: "power2.in",
    onComplete: () => {
      morphEl.textContent = morphWords[mi];
      morphEl.style.fontFamily = /[\u0B80-\u0BFF]/.test(morphWords[mi]) ? "var(--font-t)" : "var(--font-d)";
      gsap.fromTo(morphEl, { y: 18, opacity: 0, filter: "blur(6px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.55, ease: "power2.out" });
    },
  });
}, 3200);

/* ── i18n toggle ──────────────────────────────────────────── */
const langBtn = document.getElementById("lang-toggle");
langBtn.addEventListener("click", () => {
  const ta = document.documentElement.lang !== "ta";
  document.documentElement.lang = ta ? "ta" : "en";
  langBtn.textContent = ta ? "EN" : "தமிழ்";
  const heroSub = document.querySelector(".hero-sub");
  const taSub = t("hero_sub");
  if (taSub && heroSub.dataset.en) {
    heroSub.innerHTML = ta ? taSub : heroSub.dataset.en;
  } else if (taSub) {
    heroSub.dataset.en = heroSub.innerHTML;
    heroSub.innerHTML = taSub;
  }
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.dataset.i18n;
    if (!el.dataset.en) el.dataset.en = el.textContent;
    el.textContent = ta ? (t(k) ?? el.dataset.en) : el.dataset.en;
  });
  toast(ta ? "தமிழ் முறை இயக்கப்பட்டது" : "English mode enabled");
});

/* ── socials coming soon ──────────────────────────────────── */
document.querySelectorAll("[data-soon]").forEach((btn) =>
  btn.addEventListener("click", () =>
    toast(`${btn.querySelector("span").textContent} — launching soon. Follow us then!`))
);

/* ── enquiry form → WhatsApp deep link ────────────────────── */
document.getElementById("enquiry").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("f-name");
  const phone = document.getElementById("f-phone");
  const svc = document.getElementById("f-service");
  const msg = document.getElementById("f-msg");
  let ok = true;
  [[name, (v) => v.trim().length > 1], [phone, (v) => /[\d+ ]{8,}/.test(v)], [svc, (v) => !!v]].forEach(([el, test]) => {
    const bad = !test(el.value);
    el.closest(".field").classList.toggle("err", bad);
    if (bad) ok = false;
  });
  if (!ok) return;
  const text = encodeURIComponent(
    `Hi Vinayagar Interior!\nName: ${name.value}\nPhone: ${phone.value}\nService: ${svc.value}` +
    (msg.value ? `\nAbout: ${msg.value}` : "")
  );
  open(`https://wa.me/917010972189?text=${text}`, "_blank");
  toast("Opening WhatsApp with your enquiry…");
});
document.getElementById("f-service").addEventListener("change", (e) =>
  e.target.classList.toggle("has-value", !!e.target.value));

/* ── copy phone on long context (tel fallback) ────────────── */
document.querySelector(".ct-tel").addEventListener("click", () => {
  navigator.clipboard?.writeText(SITE_CONFIG.phone).then(() => toast("Number copied · " + SITE_CONFIG.phoneDisplay)).catch(() => {});
});

/* ── preloader ────────────────────────────────────────────── */
function runPreloader(done) {
  const pre = document.getElementById("preloader");
  const frame = pre.querySelector(".pre-frame-path");
  const logo = document.getElementById("pre-logo");
  const wordSpans = pre.querySelectorAll(".pre-word span");
  const fill = document.getElementById("pre-fill");
  const pct = document.getElementById("pre-pct");
  const chair = document.getElementById("pre-chair");
  const panels = pre.querySelectorAll(".pre-panel");

  if (reduced) { pre.remove(); done(); return; }

  const tl = gsap.timeline();
  tl.to(frame, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" })
    .to(logo, { clipPath: "inset(0 0% 0 0)", duration: 0.7, ease: "power3.inOut" }, "-=0.25")
    .to(wordSpans, { opacity: 1, transform: "none", duration: 0.4, stagger: 0.05, ease: "back.out(2)" }, "-=0.2");

  // honest progress: logo + fonts must be ready; photos lazy-load on scroll
  let prog = { v: 0 };
  const logoImg = new Image();
  const logoReady = new Promise((res) => { logoImg.onload = logoImg.onerror = res; logoImg.src = logo.src; });
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  const minTime = new Promise((res) => setTimeout(res, 1500));

  const iv = setInterval(() => {
    prog.v = Math.min(prog.v + 0.02, 0.92);
    const v = Math.round(prog.v * 100);
    fill.style.width = v + "%";
    chair.style.left = v + "%";
    pct.textContent = v + "%";
  }, 40);

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearInterval(iv);
    gsap.to(prog, {
      v: 1, duration: 0.35, ease: "power2.in",
      onUpdate: () => {
        const v = Math.round(prog.v * 100);
        fill.style.width = v + "%"; chair.style.left = v + "%"; pct.textContent = v + "%";
      },
      onComplete: () => setTimeout(() => {
        tl.to(pre.querySelector(".pre-inner"), { opacity: 0, y: -20, duration: 0.35 })
          .to(panels, { xPercent: (i) => (i ? 105 : -105), duration: 0.8, ease: "power4.inOut" }, "<")
          .add(() => { pre.remove(); done(); }, "-=0.4");
      }, 250),
    });
  };
  Promise.all([logoReady, fontsReady, minTime]).then(finish);
  setTimeout(finish, 6000); // safety net
}

/* ── boot ─────────────────────────────────────────────────── */
runPreloader(() => {
  initSections({ world, lenis, scrollTo, reduced });
  // hero entrance
  if (!reduced) {
    gsap.to(".hero-title .word", { y: 0, duration: 1.1, stagger: 0.09, ease: "expo.out", delay: 0.15 });
    gsap.to("[data-reveal]", {
      opacity: 1, y: 0, filter: "blur(0px)", duration: 1, stagger: 0.12, ease: "expo.out", delay: 0.5,
      scrollTrigger: { trigger: "#hero", start: "top 80%", once: true },
    });
  } else {
    gsap.set("[data-reveal]", { opacity: 1, filter: "none" });
  }
  gsap.to("#fab", { y: 0, duration: 0.8, ease: "expo.out", delay: 1.2 });
});
