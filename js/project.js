import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { SplitText, reducedMotion } from "./reveal.js";
import { siteConfig } from "./config.js";
import { themeForProject, visualForImage } from "./theme.js";
import { getCursor } from "./cursor.js";

gsap.registerPlugin(ScrollTrigger, SplitText);
const projects = siteConfig.photography.projects;
const pad = (n) => String(n).padStart(2, "0");
const INITIAL_IMAGE_COUNT = 3;
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function createProjectView(root, slug, { navigate } = {}) {
  const index = Math.max(0, projects.findIndex((p) => p.slug === slug));
  const project = projects[index];
  const next = projects[(index + 1) % projects.length];
  const images = project.images;
  const projectPageBg = "#f6f5ef";
  let projectTheme = project.theme || "#2a1612";
  let nextTheme = next.theme || "#2a1612";
  let imageVisuals = [];
  let lenis = null;
  let lenisTicker = null;
  let viewer = null;
  let viewerOpening = false;
  let cursor = getCursor();
  let detailSplits = [];
  let scrollTriggers = [];
  let started = false;
  let disposed = false;
  let endDelta = 0;
  let nextProgress = 0;
  let handoffStarted = false;
  let touchStartY = null;
  let fallbackOverflow = "";

  root.innerHTML = `<main class="project-page">
    <div class="project-scroll-counter utility">[ <span>00</span> ]</div>
    <button class="project-mobile-close utility" type="button">${siteConfig.photography.backLabel} ×</button>
    <section class="project-intro">
      <figure class="project-intro-image"><img data-project-image src="${project.cover}" alt="${escapeHTML(project.title)} project cover" decoding="async"></figure>
      <div class="project-info utility"><div><span>PROJECT</span><p>${escapeHTML(project.title)}<br>${escapeHTML(project.category)}<br>${escapeHTML(project.location)}<br>${project.year}</p></div><div><span>SERVICES</span><p>${project.services.map(escapeHTML).join("<br>")}</p></div></div>
      <h1 class="project-title">${escapeHTML(project.title)}</h1><p class="project-scroll-hint">SCROLL TO SEE MORE</p>
      <figure class="project-intro-portrait"><img data-project-image src="${images[1]}" alt="${escapeHTML(project.title)} portrait" decoding="async"></figure>
    </section>
    <section class="project-details">${[
      ["ABOUT THE WORK", `<p>${escapeHTML(project.about)}</p>`],
      ["MODELS", project.models.map((m) => `<p>${escapeHTML(m.name)}<br><a href="${escapeHTML(m.url)}" target="_blank" rel="noreferrer">${escapeHTML(m.handle)}</a></p>`).join("")],
      ["GEAR USED", project.gear.map((v) => `<p>${escapeHTML(v)}</p>`).join("")],
      ["SERVICES PROVIDED", project.services.map((v) => `<p>${escapeHTML(v)}</p>`).join("")],
    ].map(([label, body]) => `<div class="project-detail-col"><h2 class="utility" data-detail-reveal>${label}</h2><div data-detail-reveal>${body}</div></div>`).join("")}</section>
    <section class="project-gallery">${images.map((src, i) => `<figure class="project-gallery-item gallery-item-${i % 6}" data-gallery-index="${i}"><div class="project-image-mask"><img src="${src}" alt="${escapeHTML(project.title)} photograph ${i + 1}" loading="${i < INITIAL_IMAGE_COUNT ? "eager" : "lazy"}" decoding="async"></div></figure>`).join("")}</section>
    <section class="next-project"><img class="next-project-bg" src="${next.cover}" alt="" decoding="async"><div class="next-shade"></div><span class="next-number next-number-left">${pad(index + 2 > projects.length ? 1 : index + 2)}</span><span class="next-number next-number-right">${pad(index + 2 > projects.length ? 1 : index + 2)}</span><button class="next-project-open" type="button" aria-label="Open ${escapeHTML(next.title)} project"><span class="next-project-label utility">NEXT PROJECT</span><span class="next-project-title">${escapeHTML(next.title)}</span></button><div class="next-project-footer"><a href="mailto:${siteConfig.contact.email}">${escapeHTML(siteConfig.contact.email)}</a><button class="back-to-top">BACK TO TOP</button><span>${escapeHTML(next.location)}</span></div><div class="next-progress"><span></span></div></section>
  </main>
  <section class="image-viewer" aria-hidden="true" inert>
    <div class="viewer-backdrop viewer-backdrop-a"></div><div class="viewer-backdrop viewer-backdrop-b"></div><div class="viewer-theme-wash"></div>
    <div class="viewer-scrim"></div><div class="viewer-label utility"><span class="viewer-label-count"></span><span>${escapeHTML(project.title)}</span></div><button class="viewer-close utility" type="button">CLOSE</button>
    <div class="viewer-current"><div class="viewer-image viewer-image-a"><img alt=""></div><div class="viewer-image viewer-image-b"><img alt=""></div></div>
    <div class="viewer-counter viewer-counter-left"><span class="viewer-number-a">01</span><span class="viewer-number-b">01</span></div><div class="viewer-counter viewer-counter-right">${pad(images.length)}</div>
    <button class="viewer-next-thumb" type="button" aria-label="Next photograph"><img alt="Next photograph"></button>
    <div class="viewer-zones"><button class="viewer-zone viewer-prev" aria-label="Previous photograph"></button><button class="viewer-zone viewer-next" aria-label="Next photograph"></button></div>
    <div class="viewer-mobile-arrows"><button class="viewer-prev-button" aria-label="Previous photograph">‹</button><button class="viewer-next-button" aria-label="Next photograph">›</button></div>
  </section>`;

  const projectPage = root.querySelector(".project-page");
  const scrollCounter = root.querySelector(".project-scroll-counter span");
  const introTitle = root.querySelector(".project-title");
  const introTitleSplit = SplitText.create(introTitle, { type: "chars", mask: "chars", charsClass: "project-title-char" });
  const nextTitle = root.querySelector(".next-project-title");
  const nextTitleSplit = SplitText.create(nextTitle, { type: "chars", mask: "chars", charsClass: "next-project-char" });
  const nextTitlePairs = nextTitleSplit.chars.map((char) => {
    const value = char.textContent === " " ? "\u00a0" : char.textContent;
    const mask = document.createElement("span");
    const first = document.createElement("span");
    const second = document.createElement("span");
    mask.className = "next-project-char-mask";
    first.className = "next-project-char-copy";
    second.className = "next-project-char-copy next-project-char-copy-in";
    first.textContent = value;
    second.textContent = value;
    mask.append(first, second);
    char.replaceChildren(mask);
    return { rest: first, incoming: second };
  });
  gsap.set(nextTitlePairs.map((pair) => pair.rest), { yPercent: 0 });
  gsap.set(nextTitlePairs.map((pair) => pair.incoming), { yPercent: 100 });
  const nextTitleRoll = { busy: false, queued: 0 };
  const gallery = [...root.querySelectorAll(".project-gallery-item")];
  const viewerEl = root.querySelector(".image-viewer");
  const viewerLayers = {
    a: { wrap: viewerEl.querySelector(".viewer-image-a"), img: viewerEl.querySelector(".viewer-image-a img"), backdrop: viewerEl.querySelector(".viewer-backdrop-a") },
    b: { wrap: viewerEl.querySelector(".viewer-image-b"), img: viewerEl.querySelector(".viewer-image-b img"), backdrop: viewerEl.querySelector(".viewer-backdrop-b") },
  };
  const viewerCounter = viewerEl.querySelector(".viewer-counter-left");
  const numberCopies = [viewerEl.querySelector(".viewer-number-a"), viewerEl.querySelector(".viewer-number-b")];
  const viewerLabelCount = viewerEl.querySelector(".viewer-label-count");
  const viewerThumb = viewerEl.querySelector(".viewer-next-thumb img");
  const viewerWash = viewerEl.querySelector(".viewer-theme-wash");
  let numberRest = numberCopies[0];
  let numberIncoming = numberCopies[1];
  let viewerFront = "a";
  let viewerTimeline = null;
  let viewerTouchX = null;
  let detailTitleSplit = null;
  let galleryListeners = [];

  function createCounterState() {
    return { busy: false, queued: null, pairs: [{ rest: numberRest, incoming: numberIncoming }] };
  }

  function rollCounter(value) {
    if (reducedMotion) { numberRest.textContent = value; numberIncoming.textContent = value; return; }
    const state = viewer?.counterState || (viewer.counterState = createCounterState());
    if (state.busy) { state.queued = value; return; }
    state.busy = true;
    state.pairs[0].incoming.textContent = value;
    gsap.set(state.pairs[0].rest, { yPercent: 0 });
    gsap.set(state.pairs[0].incoming, { yPercent: 100 });
    gsap.timeline({ onComplete: () => {
      [state.pairs[0].rest, state.pairs[0].incoming] = [state.pairs[0].incoming, state.pairs[0].rest];
      numberRest = state.pairs[0].rest;
      numberIncoming = state.pairs[0].incoming;
      state.busy = false;
      if (state.queued != null) { const queued = state.queued; state.queued = null; rollCounter(queued); }
    } }).to(state.pairs[0].rest, { yPercent: -100, duration: .5, ease: "hop2" }, 0)
      .to(state.pairs[0].incoming, { yPercent: 0, duration: .5, ease: "hop2" }, 0);
  }

  function setViewerImage(layer, imageIndex, visual) {
    const asset = layer.img;
    asset.src = visual.src;
    asset.alt = `${project.title} photograph ${imageIndex + 1}`;
    const portrait = visual.height > visual.width;
    asset.style.objectFit = !matchMedia("(max-width: 768px)").matches && portrait ? "contain" : "cover";
    layer.backdrop.style.backgroundImage = `url("${visual.backdrop}")`;
    layer.backdrop.style.setProperty("--viewer-tint", visual.color);
  }

  function syncViewerMeta(imageIndex) {
    viewerLabelCount.textContent = `${pad(imageIndex + 1)}–${pad(images.length)}`;
    viewerThumb.src = images[(imageIndex + 1) % images.length];
    viewerThumb.alt = `Next photograph: ${pad((imageIndex + 2) % images.length || images.length)}`;
    rollCounter(pad(imageIndex + 1));
  }

  async function changeViewer(direction) {
    if (!viewer || viewer.closing) return;
    if (viewer.moving) { viewer.queuedDirection = direction; return; }
    viewer.moving = true;
    const oldIndex = viewer.imageIndex;
    const nextIndex = (oldIndex + direction + images.length) % images.length;
    const visual = imageVisuals[nextIndex];
    if (!visual?.image) {
      const recovered = await visualForImage(images[nextIndex], projectTheme);
      imageVisuals[nextIndex] = recovered;
    }
    if (!viewer || viewer.closing) return;
    const incomingKey = viewerFront === "a" ? "b" : "a";
    const oldLayer = viewerLayers[viewerFront];
    const incomingLayer = viewerLayers[incomingKey];
    const incomingVisual = imageVisuals[nextIndex];
    setViewerImage(incomingLayer, nextIndex, incomingVisual);
    incomingLayer.wrap.classList.remove("viewer-image-current");
    gsap.set(oldLayer.wrap, { zIndex: 1 });
    gsap.set(incomingLayer.wrap, { zIndex: 2 });
    gsap.set(incomingLayer.wrap, { opacity: 1, xPercent: 0, scale: 1, clipPath: direction > 0 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)", force3D: true });
    gsap.set(oldLayer.wrap, { opacity: 1, clipPath: "inset(0)", force3D: true });
    viewer.imageIndex = nextIndex;
    syncViewerMeta(nextIndex);
    viewerEl.style.backgroundColor = incomingVisual.color;
    incomingLayer.backdrop.style.opacity = "0";
    oldLayer.img.style.willChange = "transform, opacity";
    incomingLayer.wrap.style.willChange = "clip-path";
    oldLayer.backdrop.style.willChange = "opacity";
    incomingLayer.backdrop.style.willChange = "opacity";
    viewerTimeline?.kill();
    if (reducedMotion) {
      viewerTimeline = gsap.timeline({ onComplete: finishViewerStep });
      viewerTimeline.to(oldLayer.wrap, { opacity: 0, duration: .2, ease: "none" }, 0)
        .to(incomingLayer.wrap, { clipPath: "inset(0)", duration: .2, ease: "none" }, 0)
        .to(oldLayer.backdrop, { opacity: 0, duration: .2, ease: "none" }, 0)
        .to(incomingLayer.backdrop, { opacity: 1, duration: .2, ease: "none" }, 0);
    } else {
      viewerTimeline = gsap.timeline({ onComplete: finishViewerStep });
      viewerTimeline.to(oldLayer.img, { xPercent: direction > 0 ? -12 : 12, scale: 1.06, duration: .8, ease: "hop" }, 0)
        .to(incomingLayer.wrap, { clipPath: "inset(0)", duration: .8, ease: "hop", force3D: true }, 0)
        .to(oldLayer.backdrop, { opacity: 0, duration: .8, ease: "none" }, 0)
        .to(incomingLayer.backdrop, { opacity: 1, duration: .8, ease: "none" }, 0)
        .to(viewerWash, { backgroundColor: incomingVisual.color, duration: .8, ease: "hop" }, 0);
    }

    function finishViewerStep() {
      gsap.set(oldLayer.wrap, { opacity: 0, xPercent: 0, scale: 1, clipPath: "inset(0)", clearProps: "willChange" });
      gsap.set(oldLayer.img, { xPercent: 0, scale: 1 });
      gsap.set(incomingLayer.wrap, { clipPath: "inset(0)", opacity: 1 });
      oldLayer.img.style.willChange = "auto";
      incomingLayer.wrap.style.willChange = "auto";
      oldLayer.backdrop.style.willChange = "auto";
      incomingLayer.backdrop.style.willChange = "auto";
      viewerFront = incomingKey;
      viewer.moving = false;
      viewerTimeline = null;
      if (viewer.queuedDirection) {
        const queued = viewer.queuedDirection;
        viewer.queuedDirection = 0;
        changeViewer(queued);
      }
    }
  }

  function updateProgress() {
    const max = root.scrollHeight - root.clientHeight;
    const value = max > 0 ? Math.round(root.scrollTop / max * 100) : 0;
    scrollCounter.textContent = pad(value);
  }

  function resetEndProgress() {
    endDelta = 0;
    nextProgress = 0;
    gsap.to(root.querySelector(".next-progress span"), { scaleX: 0, duration: reducedMotion ? .01 : .2, ease: "power1.out" });
  }

  function rollNextTitle() {
    if (nextTitleRoll.busy) { nextTitleRoll.queued = 1; return; }
    nextTitleRoll.busy = true;
    const rest = nextTitlePairs.map((pair) => pair.rest);
    const incoming = nextTitlePairs.map((pair) => pair.incoming);
    gsap.killTweensOf([...rest, ...incoming]);
    gsap.set(rest, { yPercent: 0 }); gsap.set(incoming, { yPercent: 100 });
    gsap.timeline({ onComplete: () => {
      nextTitlePairs.forEach((pair) => [pair.rest, pair.incoming] = [pair.incoming, pair.rest]);
      nextTitleRoll.busy = false;
      if (nextTitleRoll.queued) { nextTitleRoll.queued = 0; rollNextTitle(); }
    } }).to(rest, { yPercent: -100, duration: reducedMotion ? .01 : .5, ease: "hop2", stagger: reducedMotion ? 0 : .015 }, 0)
      .to(incoming, { yPercent: 0, duration: reducedMotion ? .01 : .5, ease: "hop2", stagger: reducedMotion ? 0 : .015 }, 0);
  }

  function openNext() {
    if (handoffStarted) return;
    handoffStarted = true;
    navigate?.(`/photography/${next.slug}`, { cardTitle: next.title, cardTheme: nextTheme });
  }

  function progressHandoff(delta) {
    const bottom = root.scrollTop + root.clientHeight >= root.scrollHeight - 8;
    if (!bottom || delta < 0) { if (delta < 0) resetEndProgress(); return; }
    endDelta += delta;
    nextProgress = Math.min(1, endDelta / (window.innerHeight * 1.2));
    gsap.to(root.querySelector(".next-progress span"), { scaleX: nextProgress, duration: reducedMotion ? .01 : .12, ease: "none" });
    if (nextProgress >= 1) openNext();
  }
  const onNextWheel = (event) => progressHandoff(event.deltaY);
  const onNextTouchStart = (event) => { touchStartY = event.touches[0].clientY; };
  const onNextTouchEnd = (event) => {
    if (touchStartY == null) return;
    const delta = touchStartY - event.changedTouches[0].clientY;
    touchStartY = null;
    progressHandoff(delta);
  };

  function bindViewerControls() {
    viewerEl.querySelector(".viewer-close").addEventListener("click", () => closeViewer());
    viewerEl.querySelector(".viewer-prev").addEventListener("click", () => changeViewer(-1));
    viewerEl.querySelector(".viewer-next").addEventListener("click", () => changeViewer(1));
    viewerEl.querySelector(".viewer-prev-button").addEventListener("click", () => changeViewer(-1));
    viewerEl.querySelector(".viewer-next-button").addEventListener("click", () => changeViewer(1));
    viewerEl.querySelector(".viewer-next-thumb").addEventListener("click", () => changeViewer(1));
    viewerEl.querySelector(".viewer-prev").addEventListener("pointerenter", () => cursor?.show("←"));
    viewerEl.querySelector(".viewer-next").addEventListener("pointerenter", () => cursor?.show("→"));
    viewerEl.querySelectorAll(".viewer-zone").forEach((zone) => zone.addEventListener("pointerleave", () => cursor?.hide()));
    viewerEl.addEventListener("touchstart", (event) => { viewerTouchX = event.touches[0].clientX; }, { passive: true });
    viewerEl.addEventListener("touchend", (event) => {
      if (viewerTouchX == null) return;
      const delta = viewerTouchX - event.changedTouches[0].clientX;
      viewerTouchX = null;
      if (Math.abs(delta) > 40) changeViewer(delta > 0 ? 1 : -1);
    }, { passive: true });
  }

  async function ready() {
    const [coverTheme, followingTheme, visuals] = await Promise.all([
      themeForProject(project),
      themeForProject(next),
      Promise.all(
        images
          .slice(0, INITIAL_IMAGE_COUNT)
          .map((src) => visualForImage(src, project.theme || "#2a1612")),
      ),
    ]);
    projectTheme = coverTheme;
    nextTheme = followingTheme;
    imageVisuals = visuals;
    const imagePromises = [...root.querySelectorAll("img")]
      .filter((img) => img.loading !== "lazy")
      .map((img) => img.decode?.().catch(() => {}) || Promise.resolve());
    return Promise.all([document.fonts.ready, ...imagePromises]);
  }

  function show() {
    document.documentElement.style.setProperty("--bg", projectPageBg);
    document.documentElement.style.setProperty("--ink", "#141414");
    document.documentElement.style.setProperty("--bar-ink", "#141414");
    root.scrollTop = 0;
    gsap.set(root.querySelectorAll("img"), { clipPath: "inset(0)", scale: 1 });
    gsap.set(introTitleSplit.chars, { yPercent: 0 });
    gsap.set(nextTitleSplit.chars, { yPercent: reducedMotion ? 0 : 110 });
    root.querySelectorAll("[data-detail-reveal]").forEach((el) => { el.style.visibility = "visible"; });
  }

  function start() {
    if (started || disposed) return;
    started = true;
    document.documentElement.style.setProperty("--bg", projectPageBg);
    document.documentElement.style.setProperty("--ink", "#141414");
    document.documentElement.style.setProperty("--bar-ink", "#141414");
    bindViewerControls();
    try {
      lenis = new Lenis({ wrapper: root, content: projectPage, autoRaf: false, smoothWheel: true });
      lenisTicker = (time) => lenis?.raf(time * 1000);
      gsap.ticker.add(lenisTicker);
      lenis.on("scroll", () => { ScrollTrigger.update(); updateProgress(); });
      lenis.start();
    } catch (error) {
      console.warn("Lenis unavailable; using native project scrolling.", error);
      lenis = null;
      root.style.overflowY = "auto";
    }
    const progressTrigger = ScrollTrigger.create({ trigger: projectPage, scroller: root, start: "top top", end: "bottom bottom", onUpdate: (self) => { scrollCounter.textContent = pad(Math.round(self.progress * 100)); } });
    scrollTriggers.push(progressTrigger);
    detailSplits = [...root.querySelectorAll("[data-detail-reveal]")].map((el) => {
      const split = SplitText.create(el, { type: "words", mask: "words" });
      gsap.set(split.words, { yPercent: reducedMotion ? 0 : 110 });
      const trigger = ScrollTrigger.create({ trigger: el, scroller: root, start: "top 90%", once: true, onEnter: () => gsap.to(split.words, { yPercent: 0, duration: reducedMotion ? .01 : .7, ease: "hop2", stagger: reducedMotion ? 0 : .035 }) });
      scrollTriggers.push(trigger);
      return split;
    });
    gallery.forEach((figure, i) => {
      const image = figure.querySelector("img");
      const reveal = ScrollTrigger.create({ trigger: figure, scroller: root, start: "top 90%", once: true, onEnter: () => gsap.fromTo(figure.querySelector(".project-image-mask"), { clipPath: reducedMotion ? "inset(0)" : "inset(10% 10% 10% 10%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: reducedMotion ? .01 : .8, ease: "hop" }) });
      scrollTriggers.push(reveal);
      if (!reducedMotion) {
        const parallax = gsap.to(image, { yPercent: i % 2 ? -6 : 6, ease: "none", scrollTrigger: { trigger: figure, scroller: root, start: "top bottom", end: "bottom top", scrub: true, onToggle: (self) => { image.style.willChange = self.isActive ? "transform" : "auto"; } } });
        scrollTriggers.push(parallax.scrollTrigger);
      }
      const enter = () => cursor?.show("VIEW");
      const leave = () => cursor?.hide();
      const open = () => openViewer(i);
      figure.addEventListener("pointerenter", enter); figure.addEventListener("pointerleave", leave); figure.addEventListener("click", open);
      galleryListeners.push(() => { figure.removeEventListener("pointerenter", enter); figure.removeEventListener("pointerleave", leave); figure.removeEventListener("click", open); });
    });
    const introOpen = () => openViewer(0);
    const portraitOpen = () => openViewer(1);
    const nextOpen = () => openNext();
    const sectionOpen = (event) => { if (!event.target.closest("a,button")) openNext(); };
    const backToTop = () => lenis?.scrollTo(0, { duration: 1.2 }) ?? root.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });
    const hoverIn = () => cursor?.show("OPEN");
    const hoverOut = () => cursor?.hide();
    const nextSection = root.querySelector(".next-project");
    const nextButton = root.querySelector(".next-project-open");
    const topButton = root.querySelector(".back-to-top");
    const mobileBack = root.querySelector(".project-mobile-close");
    root.querySelector(".project-intro-image").addEventListener("click", introOpen);
    root.querySelector(".project-intro-portrait")?.addEventListener("click", portraitOpen);
    nextButton.addEventListener("click", nextOpen);
    nextSection.addEventListener("click", sectionOpen);
    nextSection.addEventListener("pointerenter", hoverIn);
    nextSection.addEventListener("pointerleave", hoverOut);
    nextButton.addEventListener("pointerenter", rollNextTitle);
    nextButton.addEventListener("pointerleave", rollNextTitle);
    topButton.addEventListener("click", backToTop);
    mobileBack.addEventListener("click", () => navigate?.("/photography", { cardTitle: siteConfig.photography.backLabel, cardTheme: projectTheme }));
    const nextTitleTrigger = ScrollTrigger.create({ trigger: nextSection, scroller: root, start: "top 85%", once: true, onEnter: () => { if (reducedMotion) gsap.set(nextTitleSplit.chars, { yPercent: 0 }); else gsap.to(nextTitleSplit.chars, { yPercent: 0, duration: .7, ease: "hop2", stagger: { each: .025, from: "random" } }); } });
    scrollTriggers.push(nextTitleTrigger);
    root.addEventListener("wheel", onNextWheel, { passive: true });
    root.addEventListener("touchstart", onNextTouchStart, { passive: true });
    root.addEventListener("touchend", onNextTouchEnd, { passive: true });
    window.addEventListener("popstate", onPop, true);
    ScrollTrigger.refresh();
  }

  function stop() {
    if (!started) return;
    started = false;
    if (viewer) closeViewer({ instant: true });
    if (lenisTicker) gsap.ticker.remove(lenisTicker);
    lenisTicker = null;
    lenis?.destroy(); lenis = null;
    scrollTriggers.forEach((trigger) => trigger?.kill()); scrollTriggers = [];
    detailSplits.forEach((split) => split.revert()); detailSplits = [];
    galleryListeners.forEach((remove) => remove()); galleryListeners = [];
    window.removeEventListener("popstate", onPop, true);
    root.removeEventListener("wheel", onNextWheel);
    root.removeEventListener("touchstart", onNextTouchStart);
    root.removeEventListener("touchend", onNextTouchEnd);
    cursor?.hide();
    handoffStarted = false;
  }

  async function openViewer(startAt) {
    if (viewer || viewerOpening || !started) return;
    viewerOpening = true;
    let visual;
    try {
      visual =
        imageVisuals[startAt] ||
        (imageVisuals[startAt] = await visualForImage(
          images[startAt],
          projectTheme,
        ));
    } finally {
      viewerOpening = false;
    }
    if (viewer || !started || disposed) return;
    viewerFront = "a";
    setViewerImage(viewerLayers.a, startAt, visual);
    setViewerImage(viewerLayers.b, startAt, visual);
    gsap.set(viewerLayers.a.wrap, { opacity: 1, xPercent: 0, scale: 1, clipPath: "inset(0)" });
    gsap.set(viewerLayers.a.wrap, { zIndex: 2 });
    gsap.set(viewerLayers.b.wrap, { opacity: 0, xPercent: 0, scale: 1, clipPath: "inset(0)", zIndex: 1 });
    gsap.set(viewerLayers.a.backdrop, { opacity: 1 }); gsap.set(viewerLayers.b.backdrop, { opacity: 0 });
    viewerEl.style.backgroundColor = visual.color;
    viewerWash.style.backgroundColor = visual.color;
    viewerEl.classList.add("is-open"); viewerEl.inert = false; viewerEl.setAttribute("aria-hidden", "false");
    document.documentElement.style.setProperty("--bar-ink", "#f4efe8");
    viewer = { imageIndex: startAt, moving: false, closing: false, queuedDirection: 0, route: location.hash, counterState: null };
    numberRest = numberCopies[0]; numberIncoming = numberCopies[1];
    numberRest.textContent = pad(startAt + 1); numberIncoming.textContent = pad(startAt + 1);
    gsap.set(numberRest, { yPercent: 0 }); gsap.set(numberIncoming, { yPercent: 100 });
    viewerLabelCount.textContent = `${pad(startAt + 1)}–${pad(images.length)}`;
    viewerThumb.src = images[(startAt + 1) % images.length];
    projectPage.inert = true;
    fallbackOverflow = root.style.overflowY;
    root.style.overflowY = "hidden";
    lenis?.stop();
    history.pushState({ nnekaViewer: true }, "", location.hash);
    window.addEventListener("keydown", viewerKey);
    viewerTimeline?.kill();
    viewerEl.style.willChange = "transform";
    viewerLayers.a.img.style.willChange = "transform, opacity";
    viewerTimeline = gsap.timeline();
    viewerTimeline.fromTo(viewerEl, { yPercent: 100 }, { yPercent: 0, duration: reducedMotion ? .3 : .9, ease: reducedMotion ? "none" : "hop", force3D: true }, 0)
      .fromTo(viewerLayers.a.img, { scale: reducedMotion ? 1 : 1.15, opacity: 0 }, { scale: 1, opacity: 1, duration: reducedMotion ? .3 : .9, ease: reducedMotion ? "none" : "hop", force3D: true }, 0)
      .add(() => { viewerEl.style.willChange = "auto"; viewerLayers.a.img.style.willChange = "auto"; }, reducedMotion ? .3 : .9);
    cursor?.hide();
  }

  function viewerKey(event) {
    if (event.key === "ArrowRight") changeViewer(1);
    else if (event.key === "ArrowLeft") changeViewer(-1);
    else if (event.key === "Escape") closeViewer();
  }

  function closeViewer({ fromPop = false, instant = false } = {}) {
    if (!viewer || viewer.closing) return;
    const closing = viewer;
    closing.closing = true;
    closing.queuedDirection = 0;
    window.removeEventListener("keydown", viewerKey);
    viewerTimeline?.kill();
    const finish = () => {
      viewerEl.classList.remove("is-open"); viewerEl.inert = true; viewerEl.setAttribute("aria-hidden", "true");
      viewerEl.style.willChange = "auto";
      projectPage.inert = false; root.style.overflowY = fallbackOverflow;
      document.documentElement.style.setProperty("--bar-ink", "#141414");
      if (lenis && started) lenis.start();
      if (history.state?.nnekaViewer) history.replaceState(null, "", location.href);
      viewer = null; viewerTimeline = null; cursor?.hide();
    };
    if (instant || reducedMotion) { gsap.set(viewerEl, { yPercent: 100 }); finish(); return; }
    viewerEl.style.willChange = "transform";
    viewerTimeline = gsap.timeline({ onComplete: finish }).to(viewerEl, { yPercent: 100, duration: reducedMotion ? .3 : .9, ease: reducedMotion ? "none" : "hop", force3D: true });
  }

  const onPop = (event) => {
    if (!viewer) return;
    event.stopImmediatePropagation();
    // Restore the viewer URL after the browser traverses its same-document entry,
    // so the route itself remains in place while the overlay slides closed.
    history.pushState({ nnekaViewer: true }, "", viewer.route);
    closeViewer({ fromPop: true });
  };

  return {
    ready,
    show,
    play() {},
    start,
    stop,
    destroy() { disposed = true; introTitleSplit.revert(); nextTitleSplit.revert(); root.remove(); },
  };
}
