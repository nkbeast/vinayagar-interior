/* ═══════════════════════════════════════════════════════════
   SECTIONS — scroll choreography for every chapter
   ═══════════════════════════════════════════════════════════ */
import { SERVICES, PROCESS, WORKS, SITE_CONFIG } from "./config.js";

export function initSections({ world, lenis, scrollTo, reduced }) {
  const chapterEls = document.querySelectorAll(".chapter, #footer");

  /* ── chapter watcher (world scene + rail + nav) ─────────── */
  const chapterLabel = { hero: "Threshold", philosophy: "Our Craft", services: "Services", process: "Process", works: "Works", furniture: "Furniture", stats: "Trust", contact: "Begin", footer: "விநாயகா" };
  const setChapter = (name) => {
    if (window.__activeChapter === name) return;
    window.__activeChapter = name;
    world?.setChapter(name === "stats" ? "furniture" : name);
    document.getElementById("rail-chapter").textContent = chapterLabel[name] ?? name;
  };
  chapterEls.forEach((el) => {
    const name = el.dataset.chapter || (el.id === "footer" ? "footer" : el.id);
    ScrollTrigger.create({
      trigger: el,
      start: name === "footer" ? "top 85%" : "top 55%",
      end: name === "footer" ? "bottom bottom" : "bottom 45%",
      onToggle: (self) => { if (self.isActive) setChapter(name); },
    });
  });

  /* ═══════════ HERO ═══════════ */
  if (world) {
    ScrollTrigger.create({
      trigger: "#hero", start: "top top", end: "bottom top", scrub: true,
      onUpdate: (self) => world.setProgress(self.progress),
    });
  }
  // scroll cue — CSS-driven
  gsap.to(".hero-tamil-ghost", {
    yPercent: -30, ease: "none",
    scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true },
  });

  /* ═══════════ PHILOSOPHY — word fill + Ganesha draw ═══════════ */
  const mani = document.getElementById("manifesto");
  mani.innerHTML = mani.textContent.trim().split(/\s+/)
    .map((w) => (w.startsWith("<") ? w : `<span class="w">${w}</span>`)).join(" ");
  // re-wrap <em> content words
  mani.querySelectorAll("em").forEach((em) => {
    em.innerHTML = em.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
  });
  const words = mani.querySelectorAll(".w");
  gsap.to(words, {
    opacity: 1, stagger: 0.06, ease: "none",
    scrollTrigger: { trigger: ".ph-manifesto", start: "top 78%", end: "bottom 45%", scrub: true },
  });
  // brass underline draws itself under key phrases
  mani.querySelectorAll("em").forEach((em) => {
    ScrollTrigger.create({
      trigger: em, start: "top 72%", end: "top 42%", scrub: true,
      onUpdate: (self) => em.style.setProperty("--p", self.progress),
    });
  });
  document.head.insertAdjacentHTML("beforeend", `<style>.scrub-text em::after{transform:scaleX(var(--p,0))!important}</style>`);

  // Ganesha self-draw
  const gPaths = document.querySelectorAll("#ganesha .g-path");
  gPaths.forEach((p, i) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    gsap.to(p, {
      strokeDashoffset: 0, ease: "none",
      scrollTrigger: { trigger: ".ph-ganesha", start: "top 85%", end: "top 25%", scrub: true },
    });
  });
  gsap.to("#ganesha .g-dot", {
    opacity: 1, scale: 1, ease: "back.out(3)",
    scrollTrigger: { trigger: ".ph-ganesha", start: "top 30%", end: "top 10%", scrub: true },
  });

  // kolam canvas
  const kolam = document.getElementById("kolam");
  const kctx = kolam.getContext("2d");
  let kt = 0;
  const drawKolam = () => {
    const w = kolam.width = kolam.offsetWidth;
    const h = kolam.height = kolam.offsetHeight;
    kctx.clearRect(0, 0, w, h);
    const gap = 46;
    kctx.fillStyle = "rgba(201,162,39,.4)";
    for (let y = gap / 2; y < h; y += gap)
      for (let x = gap / 2; x < w; x += gap) {
        const d = 2 + Math.sin(kt + (x + y) * 0.02) * 1.2;
        kctx.beginPath(); kctx.arc(x, y, Math.max(0.6, d), 0, 7); kctx.fill();
        kctx.strokeStyle = "rgba(46,196,198,.25)";
        kctx.save(); kctx.translate(x, y); kctx.rotate(kt * 0.2);
        kctx.strokeRect(-6, -6, 12, 12); kctx.restore();
      }
    kt += 0.012;
    if (!reduced) requestAnimationFrame(drawKolam);
  };
  drawKolam();

  /* ═══════════ SERVICES — pinned copy + morphing 3D ═══════════ */
  const svSection = document.getElementById("services");
  svSection.style.height = `${innerHeight * (SERVICES.length * 1.15)}px`;
  const svEls = {
    idx: document.getElementById("sv-idx"),
    name: document.getElementById("sv-name"),
    desc: document.getElementById("sv-desc"),
    points: document.getElementById("sv-points"),
    cta: document.getElementById("sv-cta"),
    progress: document.getElementById("sv-progress"),
    cur: document.getElementById("sv-cur"),
    tamil: document.getElementById("sv-tamil"),
  };
  const svTamil = ["வீடு", "கடை", "அலுவலகம்", "முழு பணி", "தச்சு வேலை", "பர்னிச்சர்"];
  let svShown = -1;
  const showService = (i) => {
    if (i === svShown) return;
    svShown = i;
    const svc = SERVICES[i];
    const tl = gsap.timeline();
    tl.to([svEls.name, svEls.desc, svEls.points], { opacity: 0, y: -14, duration: 0.18, stagger: 0.03, ease: "power2.in" })
      .add(() => {
        svEls.idx.textContent = String(i + 1).padStart(2, "0");
        svEls.cur.textContent = String(i + 1).padStart(2, "0");
        svEls.tamil.textContent = svTamil[i];
        svEls.name.textContent = svc.name;
        svEls.desc.textContent = svc.desc;
        svEls.points.innerHTML = svc.points.map((p) => `<li>${p}</li>`).join("");
        svEls.cta.href = `${SITE_CONFIG.whatsapp}?text=Hi%20Vinayagar%20Interior%2C%20I%27m%20interested%20in%20${svc.wa}.`;
      })
      .to([svEls.name, svEls.desc, svEls.points], { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "expo.out" });
    world?.setService(i);
  };
  ScrollTrigger.create({
    trigger: svSection, start: "top top", end: "bottom bottom", scrub: true,
    onUpdate: (self) => {
      const idx = Math.min(SERVICES.length - 1, Math.floor(self.progress * SERVICES.length * 1.02));
      showService(idx);
      svEls.progress.style.width = `${self.progress * 100}%`;
    },
  });

  /* ═══════════ PROCESS — horizontal timeline ═══════════ */
  const track = document.getElementById("pr-track");
  track.innerHTML = PROCESS.map((p) => `
    <div class="pr-card glass">
      <div class="pr-step"><span class="pr-step-no">${p.no}</span><span class="pr-step-name">${p.name}</span></div>
      <p>${p.text}</p>
      <div class="pr-media">
        <img src="assets/img/work/${p.before}" alt="${p.name}" loading="lazy" />
        ${p.after ? `<img class="after" src="assets/img/work/${p.after}" alt="${p.name} finished" loading="lazy" /><span class="pr-tagline">hover — before → after</span>` : `<span class="pr-tagline">${p.tag}</span>`}
      </div>
    </div>`).join("");

  const setTrackH = () => {
    // sticky technique (same as services/works) — no ScrollTrigger pin, so no
    // pin-spacer height shifting every later trigger's position
    const dist = () => track.scrollWidth - innerWidth + innerWidth * 0.2;
    document.getElementById("process").style.height = `${innerHeight + dist()}px`;
    gsap.to(track, {
      x: () => -dist(), ease: "none",
      scrollTrigger: {
        trigger: "#process", start: "top top", end: "bottom bottom",
        scrub: 0.6, invalidateOnRefresh: true,
      },
    });
  };
  // line draw across the timeline
  const linePath = document.getElementById("pr-line-path");
  const lineLen = linePath.getTotalLength();
  linePath.style.strokeDasharray = lineLen;
  gsap.fromTo(linePath, { strokeDashoffset: lineLen }, {
    strokeDashoffset: 0, ease: "none",
    scrollTrigger: { trigger: "#process", start: "top top", end: "bottom bottom", scrub: 0.6 },
  });
  if (!reduced) setTrackH();

  /* ═══════════ WORKS — horizontal parallax gallery ═══════════ */
  const rows = document.getElementById("wk-rows");
  const rowA = document.createElement("div");
  const rowB = document.createElement("div");
  rowA.className = "wk-row"; rowB.className = "wk-row";
  WORKS.forEach((w, i) => {
    const card = document.createElement("div");
    card.className = "wk-card";
    card.dataset.cap = w.cap;
    card.innerHTML = `<span class="wk-idx">${String(i + 1).padStart(2, "0")}</span><img src="assets/img/work/${w.img}" alt="${w.cap}" loading="lazy" /><span class="wk-cap">${w.cap}</span>`;
    (i % 2 ? rowB : rowA).appendChild(card);
  });
  rows.append(rowA, rowB);

  const mkRowScroll = (row, dir) => {
    gsap.fromTo(row, { x: () => (dir > 0 ? 0 : -(row.scrollWidth - innerWidth * 0.7)) }, {
      x: () => (dir > 0 ? -(row.scrollWidth - innerWidth * 0.7) : 0), ease: "none",
      scrollTrigger: { trigger: "#works", start: "top top", end: "bottom bottom", scrub: 0.5, invalidateOnRefresh: true },
    });
  };
  const setWorksH = () => { mkRowScroll(rowA, 1); mkRowScroll(rowB, -1); };
  const worksH = innerHeight * 3.2;
  document.getElementById("works").style.height = `${worksH}px`;
  if (!reduced) setWorksH();

  // tilt toward viewport center
  if (!reduced && !matchMedia("(hover:none)").matches) {
    document.querySelectorAll(".wk-card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, { rotateY: px * 10, rotateX: -py * 8, transformPerspective: 700, duration: 0.4 });
      });
      card.addEventListener("mouseleave", () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.7, ease: "elastic.out(1,0.5)" }));
    });
  }
  window.bindCursor?.(".wk-card", "is-photo", "View");

  // lightbox
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lb-img");
  const lbCap = document.getElementById("lb-cap");
  let lbIdx = 0;
  const openLb = (i) => {
    lbIdx = (i + WORKS.length) % WORKS.length;
    lbImg.src = `assets/img/work/${WORKS[lbIdx].img}`;
    lbCap.textContent = WORKS[lbIdx].cap;
    lb.hidden = false;
    lenis?.stop();
    document.body.style.overflow = "hidden";
  };
  const closeLb = () => { lb.hidden = true; lenis?.start(); document.body.style.overflow = ""; };
  document.querySelectorAll(".wk-card").forEach((c, i) => c.addEventListener("click", () => openLb(i)));
  lb.querySelector(".lb-close").addEventListener("click", closeLb);
  lb.querySelector(".lb-prev").addEventListener("click", () => openLb(lbIdx - 1));
  lb.querySelector(".lb-next").addEventListener("click", () => openLb(lbIdx + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") openLb(lbIdx - 1);
    if (e.key === "ArrowRight") openLb(lbIdx + 1);
  });

  /* ═══════════ FURNITURE ═══════════ */
  document.querySelectorAll(".swatch").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".swatch").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      world?.setFinish(b.dataset.finish);
    }));
  // turntable drag
  let dragging = false, lastX = 0;
  const fur = document.getElementById("furniture");
  fur.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; });
  addEventListener("pointermove", (e) => {
    if (!dragging || !world) return;
    world.addDrag((e.clientX - lastX) * 0.02);
    lastX = e.clientX;
  });
  addEventListener("pointerup", () => (dragging = false));
  window.bindCursor?.("#furniture", "is-drag", "Drag");
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      gsap.to(card, { rotateY: ((e.clientX - r.left) / r.width - 0.5) * 8, rotateX: -((e.clientY - r.top) / r.height - 0.5) * 8, transformPerspective: 600, duration: 0.4 });
    });
    card.addEventListener("mouseleave", () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.6 }));
  });

  /* ═══════════ STATS ═══════════ */
  document.querySelectorAll(".st-num").forEach((el) => {
    const end = +el.dataset.count;
    ScrollTrigger.create({
      trigger: el, start: "top 85%", once: true,
      onEnter: () => gsap.fromTo(el, { innerText: 0 }, {
        innerText: end, duration: 1.8, ease: "power2.out", snap: { innerText: 1 },
        onUpdate: function () { el.textContent = Math.round(+el.textContent).toLocaleString("en-IN"); },
      }),
    });
  });
  const quotes = [
    ["They finished our whole flat — kitchen to wardrobes — exactly on the date they promised. The finishing is better than showrooms.", "Client family, Mettupalayam"],
    ["One team handled design, civil work and furniture. We just watched our shop transform in three weeks.", "Boutique owner, Karamadai"],
    ["The 3D design matched the final work almost exactly. No hidden costs, no surprises.", "Homeowner, Coimbatore"],
  ];
  let qi = 0;
  setInterval(() => {
    qi = (qi + 1) % quotes.length;
    gsap.to("#quote-text, #quote-cite", {
      opacity: 0, y: -10, duration: 0.3, onComplete: () => {
        document.getElementById("quote-text").textContent = quotes[qi][0];
        document.getElementById("quote-cite").innerHTML = `— ${quotes[qi][1]} <em>(placeholder)</em>`;
        gsap.to("#quote-text, #quote-cite", { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" });
      },
    });
  }, 5200);

  /* ═══════════ CONTACT — floor plan morph progress ═══════════ */
  if (world) {
    ScrollTrigger.create({
      trigger: "#contact", start: "top 60%", end: "bottom bottom", scrub: true,
      onUpdate: (self) => world.setProgress(self.progress),
    });
  }

  /* ═══════════ FOOTER — logo re-animation ═══════════ */
  gsap.to("#ft-logo-img", {
    clipPath: "inset(0 0% 0 0)", duration: 1.2, ease: "power3.inOut",
    scrollTrigger: { trigger: "#footer", start: "top 80%", once: true },
  });

  /* ═══════════ reveal-on-scroll for remaining bits ═══════════ */
  gsap.utils.toArray(".chapter-no, .pr-title, .fn-title, .ct-title, .st-grid .clay, .ct-panel, .ct-side > *").forEach((el) => {
    if (el.closest("#hero")) return;
    gsap.from(el, {
      opacity: 0, y: 40, duration: 0.9, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  });

  addEventListener("resize", () => ScrollTrigger.refresh());
  addEventListener("load", () => ScrollTrigger.refresh());
  // heights + pin spacers changed layout after the earlier triggers computed
  // their positions — recalc everything once the DOM settles
  requestAnimationFrame(() => ScrollTrigger.refresh());
  setTimeout(() => ScrollTrigger.refresh(), 400);
}
