import gsap from "gsap";
import { SplitText, reducedMotion } from "./reveal.js";
import { siteConfig } from "./config.js";
import { backdropForProject, preloadProjectImages } from "./theme.js";
import { getCursor } from "./cursor.js";

gsap.registerPlugin(SplitText);

// Deck controls. Keep these together so the stack can be tuned as a unit.
const VISIBLE = 5;
const FRONT = VISIBLE - 1;
const DURATION = 1;
const STEP_DURATION = reducedMotion ? 0.3 : DURATION;
const EASE = "power3.inOut";
const INPUT_COOLDOWN = 1150;
const OVERSHOOT = 3;
const WHEEL_THRESHOLD = 100;
const TOUCH_THRESHOLD = 40;
const projects = siteConfig.photography.projects;
let returnIndex = 0;
let hasInteracted = false;
export { returnIndex };

// Stack proportions copied from the reference: each layer behind the front is a little
// narrower and peeks a little higher above the one in front of it. Index = depth from the front.
const DEPTH_SCALE = [1, 0.877, 0.781, 0.704, 0.64, 0.585];
const DEPTH_PEEK = [0, 0.027, 0.046, 0.064, 0.08, 0.095]; // fraction of the front image height
const GROW_PER_SLOT = 0.3; // how much bigger the front layer gets per slot when it flies toward the viewer
const DECK_ASPECT_DESKTOP = 16 / 9;
const DECK_ASPECT_MOBILE = 4 / 5;
const geo = { w: 0, h: 0, top: 0 };

const mod = (n, length) => ((n % length) + length) % length;
const sample = (table, d) => {
  const i = Math.max(0, Math.min(Math.floor(d), table.length - 2));
  return table[i] + (table[i + 1] - table[i]) * (d - i);
};
// p = slot position: 0 is the farthest back, FRONT is the closest. Fractions and values outside
// 0..FRONT are allowed (used by the layers entering and leaving). Every layer scales from its top centre.
const pos = (p) => {
  const d = FRONT - p;
  if (d >= 0) {
    return {
      xPercent: -50,
      y: geo.top - sample(DEPTH_PEEK, d) * geo.h,
      scale: sample(DEPTH_SCALE, d),
      force3D: true,
    };
  }
  const scale = 1 + -d * GROW_PER_SLOT;
  return {
    xPercent: -50,
    y: geo.top - ((scale - 1) * geo.h) / 2,
    scale,
    force3D: true,
  };
};
const slotOpacity = (p) =>
  p < 0 || p > FRONT ? 0 : [0.28, 0.43, 0.6, 0.79, 1][p];

export function createPhotographyView(root, { navigate } = {}) {
  const stage = document.createElement("section");
  stage.className = "photo-stage";
  stage.setAttribute("aria-label", "Photography projects");
  stage.innerHTML = `<div class="photo-backdrops"><div class="photo-backdrop photo-backdrop-a"></div><div class="photo-backdrop photo-backdrop-b"></div></div><div class="photo-theme-wash"></div><div class="photo-label photo-progress utility"></div><div class="photo-project-count utility"></div><div class="photo-year utility"></div><button class="photo-scroll utility" type="button" aria-label="Next project"><span class="photo-scroll-label">SCROLL</span><span aria-hidden="true">↓</span></button><div class="photo-layers"></div>`;
  root.replaceChildren(stage);

  const layerWrap = stage.querySelector(".photo-layers");
  const backdropNodes = [...stage.querySelectorAll(".photo-backdrop")];
  const wash = stage.querySelector(".photo-theme-wash");
  const counter = stage.querySelector(".photo-progress");
  const count = stage.querySelector(".photo-project-count");
  const year = stage.querySelector(".photo-year");
  const scrollHint = stage.querySelector(".photo-scroll");
  const cursor = getCursor();
  let layers = [];
  let active = mod(returnIndex, projects.length);
  let backdropIndex = 0;
  let busy = false;
  let cooldown = false;
  let queuedDirection = 0;
  let stepTimeline = null;
  let cooldownCall = null;
  let wheelSum = 0;
  let wheelDirection = 0;
  let wheelReset = null;
  let running = false;
  let disposed = false;

  function createLayer(projectIndex, where = "append") {
    const project = projects[mod(projectIndex, projects.length)];
    const button = document.createElement("button");
    button.className = "photo-project-layer";
    button.type = "button";
    button.setAttribute("aria-label", `Open ${project.title} project`);
    button.innerHTML = `<span class="photo-cover"><img src="${project.cover}" alt="${project.title} photography cover" decoding="async"></span><span class="photo-title">${project.title}</span>`;
    if (where === "prepend") layerWrap.prepend(button);
    else layerWrap.append(button);
    const titleEl = button.querySelector(".photo-title");
    const split = SplitText.create(titleEl, {
      type: "words",
      mask: "words",
      wordsClass: "photo-title-word",
    });
    const layer = {
      project,
      button,
      image: button.querySelector("img"),
      titleEl,
      words: split.words,
      split,
    };
    button.addEventListener("pointerenter", () => {
      if (layers.at(-1) === layer) cursor?.show("OPEN");
    });
    button.addEventListener("pointerleave", () => cursor?.hide());
    button.addEventListener("click", () => {
      if (busy || layers.at(-1) !== layer) return;
      hasInteracted = true;
      scrollHint.classList.add("is-hidden");
      returnIndex = active;
      navigate?.(`/photography/${layer.project.slug}`, {
        cardTitle: layer.project.title,
        cardTheme: layer.theme,
      });
    });
    return layer;
  }

  function displayProject(index, animate = false, timeline = null) {
    const item = projects[index];
    const percent = Math.round(
      (100 * index) / Math.max(1, projects.length - 1),
    );
    const newCounter = `[ ${String(percent).padStart(3, "0")} ]`;
    const newCount = `${index + 1}–${projects.length}  ${item.title.toUpperCase()}`;
    const newYear = `YEAR\n${item.year}`;
    const city = document.querySelector(".bottom-city");
    if (animate && timeline) {
      timeline
        .to(
          wash,
          {
            backgroundColor: item.theme || item.visual?.color || "#2a1612",
            duration: STEP_DURATION,
            ease: reducedMotion ? "none" : EASE,
          },
          0,
        )
        .to(
          document.documentElement,
          {
            "--bar-ink": "#f4efe8",
            duration: STEP_DURATION,
            ease: reducedMotion ? "none" : EASE,
          },
          0,
        );
      rollLabel(counter, newCounter, timeline);
      rollLabel(count, newCount, timeline);
      rollLabel(year, newYear, timeline);
      rollLabel(city, item.location, timeline);
    } else {
      counter.textContent = newCounter;
      count.textContent = newCount;
      year.innerHTML = `YEAR<br>${item.year}`;
      city.textContent = item.location;
      wash.style.backgroundColor =
        item.theme || item.visual?.color || "#2a1612";
      document.documentElement.style.setProperty("--bar-ink", "#f4efe8");
    }
    document.querySelector(".clock").hidden = true;
    const color = item.theme || item.visual?.color || "#2a1612";
    document.documentElement.style.setProperty("--bg", color);
    document.documentElement.style.setProperty("--ink", "#f4efe8");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", color);
  }

  function rollLabel(node, value, timeline) {
    // Small metadata is a masked two-line swap; it is built into the step timeline.
    const original = node.textContent;
    if (original === value) return;
    const mask = document.createElement("span");
    mask.className = "photo-label-mask";
    const oldLine = document.createElement("span");
    const newLine = document.createElement("span");
    oldLine.className = "photo-label-copy";
    newLine.className = "photo-label-copy photo-label-copy-in";
    oldLine.textContent = original;
    newLine.textContent = value;
    mask.append(oldLine, newLine);
    node.replaceChildren(mask);
    gsap.set(newLine, { yPercent: 100 });
    timeline
      .to(
        oldLine,
        {
          yPercent: reducedMotion ? 0 : -100,
          duration: reducedMotion ? 0.01 : 0.55,
          ease: reducedMotion ? "none" : "hop2",
        },
        0,
      )
      .to(
        newLine,
        {
          yPercent: 0,
          duration: reducedMotion ? 0.01 : 0.55,
          ease: reducedMotion ? "none" : "hop2",
        },
        0,
      );
    timeline.add(() => {
      node.textContent = value;
    }, STEP_DURATION);
  }

  function setBackdrop(project, targetIndex, timeline = null) {
    const from = backdropNodes[backdropIndex];
    const nextIndex = 1 - backdropIndex;
    const to = backdropNodes[nextIndex];
    to.style.backgroundImage = `url("${project.visual.backdrop}")`;
    to.style.setProperty("--backdrop-tint", project.visual.color);
    gsap.set(from, { zIndex: 1 });
    gsap.set(to, { opacity: 0, zIndex: 2, force3D: true });
    if (timeline) {
      from.style.willChange = "opacity";
      to.style.willChange = "opacity";
      timeline
        .to(from, { opacity: 0, duration: STEP_DURATION, ease: "none" }, 0)
        .to(to, { opacity: 1, duration: STEP_DURATION, ease: "none" }, 0);
      timeline.add(() => {
        backdropIndex = nextIndex;
        from.style.willChange = "auto";
        to.style.willChange = "auto";
      }, STEP_DURATION);
    } else {
      gsap.set(from, { opacity: 0 });
      gsap.set(to, { opacity: 1 });
      backdropIndex = nextIndex;
    }
  }

  function setNearLayers() {
    layers.forEach((layer, index) => {
      const p = index;
      layer.button.style.willChange = "auto";
      layer.image.style.willChange = "auto";
      gsap.set(layer.button, {
        ...pos(p),
        opacity: slotOpacity(p),
        pointerEvents: p === FRONT ? "auto" : "none",
      });
      gsap.set(layer.words, { yPercent: p === FRONT ? 0 : 110 });
    });
  }

  function layout() {
    // Use layout sizes (clientWidth, offsetTop), not bounding boxes: the page layer is scaled during transitions.
    const W = stage.clientWidth || window.innerWidth;
    const H = stage.clientHeight || window.innerHeight;
    const rem =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    // Safe area: below the labels under the top bar, above the bottom bar.
    const labels = [counter, count, scrollHint, ...(mobile ? [year] : [])];
    const labelsBottom = stage.clientHeight
      ? Math.max(...labels.map((node) => node.offsetTop + node.offsetHeight))
      : 0;
    const safeTop = Math.max(
      labelsBottom + 0.7 * rem,
      (mobile ? 7.4 : 6.4) * rem,
    );
    const bar = document.querySelector("#bottom-bar");
    const barTop = H - (bar?.offsetHeight || 28);
    const safeBottom = Math.min(H - 4 * rem, barTop - 2.4 * rem);
    const safeHeight = Math.max(200, safeBottom - safeTop);
    const peekTotal = DEPTH_PEEK[FRONT];
    const aspect = mobile ? DECK_ASPECT_MOBILE : DECK_ASPECT_DESKTOP;
    // Width: 84vw on desktop, 90vw on mobile, never taller than the safe area allows.
    const maxW = W * (mobile ? 0.9 : 0.84);
    const w = Math.min(maxW, (safeHeight / (1 + peekTotal)) * aspect);
    const h = w / aspect;
    const groupHeight = h * (1 + peekTotal);
    geo.w = w;
    geo.h = h;
    geo.top = safeTop + (safeHeight - groupHeight) / 2 + peekTotal * h; // top of the FRONT image; the stack peeks above it
    stage.style.setProperty("--deck-w", `${w}px`);
    stage.style.setProperty("--deck-h", `${h}px`);
  }

  let layoutFrame = 0;
  const onResize = () => {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => {
      layout();
      if (!busy) setNearLayers();
      updateScrollHintLabel();
    });
  };

  function initialize() {
    layout();
    layers.forEach(({ split }) => split.revert());
    layers = [];
    for (let p = 0; p < VISIBLE; p++) {
      layers.push(createLayer(mod(active - FRONT + p, projects.length)));
    }
    setNearLayers();
    const initialProject = projects[active];
    backdropNodes[backdropIndex].style.backgroundImage =
      `url("${initialProject.cover}")`;
    backdropNodes[backdropIndex].style.setProperty(
      "--backdrop-tint",
      initialProject.theme || "#2a1612",
    );
    displayProject(active, false);
  }

  function requestStep(direction) {
    if (!running || disposed || root.closest("#page-layer")?.inert) return;
    hasInteracted = true;
    scrollHint.classList.add("is-hidden");
    if (busy || cooldown) {
      queuedDirection = direction;
      return;
    }
    changeSlide(direction);
  }

  function finishStep() {
    if (disposed) return;
    busy = false;
    cooldown = true;
    cooldownCall?.kill();
    cooldownCall = gsap.delayedCall(
      Math.max(0, INPUT_COOLDOWN / 1000 - DURATION),
      () => {
        cooldown = false;
        if (queuedDirection) {
          const direction = queuedDirection;
          queuedDirection = 0;
          requestStep(direction);
        }
      },
    );
  }

  function changeSlide(direction) {
    if (busy || !running || disposed) return;
    busy = true;
    const down = direction > 0;
    const oldFront = layers[FRONT];
    const outgoing = down ? layers[0] : oldFront;
    active = mod(active + direction, projects.length);
    returnIndex = active;
    const incomingIndex = down ? active : mod(active - FRONT, projects.length);
    const incoming = createLayer(incomingIndex, down ? "append" : "prepend");
    incoming.theme =
      projects[incomingIndex].theme || projects[incomingIndex].visual.color;
    gsap.set(incoming.button, {
      ...pos(down ? FRONT - 1.2 : -1),
      opacity: 0,
      pointerEvents: "none",
    });
    gsap.set(incoming.words, { yPercent: 110 });
    [...layers, incoming].forEach((layer) => {
      layer.image.style.willChange = "transform, opacity";
      layer.button.style.willChange = "transform, opacity";
    });

    const timeline = gsap.timeline({
      defaults: {
        duration: STEP_DURATION,
        ease: reducedMotion ? "power1.out" : EASE,
      },
      onComplete: () => {
        outgoing.split.revert();
        outgoing.button.remove();
        layers = down
          ? [...layers.slice(1), incoming]
          : [incoming, ...layers.slice(0, FRONT)];
        layers.forEach((layer, p) => {
          layer.button.style.willChange = "auto";
          layer.image.style.willChange = "auto";
          gsap.set(layer.button, {
            ...pos(p),
            opacity: slotOpacity(p),
            pointerEvents: p === FRONT ? "auto" : "none",
          });
          if (layer !== incoming && p !== FRONT)
            gsap.set(layer.words, { yPercent: 110 });
        });
        gsap.set(incoming.words, { yPercent: 0 });
        displayProject(active, false);
        stepTimeline = null;
        finishStep();
      },
      onInterrupt: () => {
        stepTimeline = null;
        busy = false;
      },
    });
    stepTimeline = timeline;
    setBackdrop(projects[active], 0, timeline);
    displayProject(active, true, timeline);

    const shift = down ? -1 : 1;
    layers.forEach((layer, p) => {
      const target = down ? p - 1 : p + 1;
      if (reducedMotion) {
        const target = down ? p - 1 : p + 1;
        if (layer === outgoing)
          timeline.to(
            layer.button,
            { opacity: 0, duration: STEP_DURATION, ease: "none" },
            0,
          );
        else
          timeline.set(
            layer.button,
            { ...pos(target), opacity: slotOpacity(target) },
            0,
          );
        if (!down && layer === layers[FRONT - 1])
          timeline.set(layer.words, { yPercent: 0 }, STEP_DURATION);
      } else if (layer === outgoing && !down) {
        timeline.to(layer.button, { ...pos(FRONT + OVERSHOOT), opacity: 0 }, 0);
        timeline.to(
          layer.words,
          {
            yPercent: -110,
            duration: 0.42,
            ease: "hop2",
            stagger: { each: 0.015, from: "random" },
          },
          0,
        );
      } else {
        timeline.to(
          layer.button,
          { ...pos(target), opacity: slotOpacity(target) },
          0,
        );
      }
      if (down && layer === oldFront) {
        timeline.to(
          layer.words,
          {
            yPercent: 110,
            duration: 0.55,
            ease: "hop2",
            stagger: { each: 0.015, from: "random" },
          },
          0,
        );
      } else if (!down && layer === layers[FRONT - 1]) {
        // This becomes the new front and rises into place as the deck settles.
        timeline.to(
          layer.words,
          { yPercent: 0, duration: 0.75, ease: "power4.out", stagger: 0.15 },
          0.5,
        );
      }
    });
    timeline.to(
      incoming.button,
      {
        ...pos(down ? FRONT : 0),
        opacity: slotOpacity(down ? FRONT : 0),
        duration: STEP_DURATION,
        ease: reducedMotion ? "none" : EASE,
      },
      0,
    );
    if (down && reducedMotion)
      timeline.set(incoming.words, { yPercent: 0 }, STEP_DURATION);
    else if (down)
      timeline.to(
        incoming.words,
        { yPercent: 0, duration: 0.75, ease: "power4.out", stagger: 0.15 },
        0.5,
      );
    else timeline.to(incoming.words, { yPercent: 110, duration: 0.01 }, 0);
  }

  const onWheel = (event) => {
    event.preventDefault();
    if (busy || cooldown || !running) return; // ignore trackpad inertia while a step is running
    wheelSum += Math.abs(event.deltaY);
    clearTimeout(wheelReset);
    wheelReset = setTimeout(() => {
      wheelSum = 0;
    }, 150);
    if (wheelSum >= WHEEL_THRESHOLD) {
      wheelSum = 0;
      requestStep(event.deltaY > 0 ? 1 : -1);
    }
  };

  // Touch: one swipe = one step. Finger moving up goes to the next project.
  let touchStartY = null;
  let touchStartX = 0;
  let touchHandled = false;
  const onTouchStart = (event) => {
    if (event.touches.length !== 1) {
      touchStartY = null;
      return;
    }
    touchStartY = event.touches[0].clientY;
    touchStartX = event.touches[0].clientX;
    touchHandled = false;
  };
  const onTouchMove = (event) => {
    if (event.cancelable) event.preventDefault(); // stop the browser from scrolling or pull-to-refresh
    if (touchStartY === null || touchHandled || event.touches.length !== 1)
      return;
    const dy = touchStartY - event.touches[0].clientY;
    const dx = touchStartX - event.touches[0].clientX;
    if (Math.abs(dy) >= TOUCH_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
      touchHandled = true;
      requestStep(dy > 0 ? 1 : -1);
    }
  };
  const onTouchEnd = () => {
    touchStartY = null;
    touchHandled = false;
  };
  const onKey = (event) => {
    if (root.closest("#page-layer")?.inert) return;
    if (["ArrowDown", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      requestStep(1);
    } else if (["ArrowUp", "PageUp"].includes(event.key)) {
      event.preventDefault();
      requestStep(-1);
    } else if (event.key === "Enter") layers.at(-1)?.button.click();
  };
  const onScrollClick = () => requestStep(1);
  const updateScrollHintLabel = () => {
    scrollHint.querySelector(".photo-scroll-label").textContent = matchMedia(
      "(max-width: 768px)",
    ).matches
      ? "SWIPE"
      : "SCROLL";
  };

  async function ready() {
    const visuals = await Promise.all(
      projects.map((project) => backdropForProject(project)),
    );
    await preloadProjectImages(projects);
    projects.forEach((project) => {
      const visual = visuals[projects.indexOf(project)];
      project.visual = visual;
      project.themeColor = project.theme || visual.color;
    });
    layers.forEach((layer) => {
      layer.visual = projects.find(
        (project) => project.slug === layer.project.slug,
      )?.visual;
      layer.project.visual = layer.visual;
      layer.theme = layer.project.theme || layer.visual?.color;
    });
    const activeProject = projects[active];
    const activeVisual =
      activeProject.visual || (await backdropForProject(activeProject));
    backdropNodes[0].style.backgroundImage = `url("${activeVisual.backdrop}")`;
    backdropNodes[0].style.setProperty(
      "--backdrop-tint",
      activeProject.theme || activeVisual.color,
    );
    backdropNodes[1].style.backgroundImage = `url("${activeVisual.backdrop}")`;
    backdropNodes[1].style.setProperty(
      "--backdrop-tint",
      activeProject.theme || activeVisual.color,
    );
    return Promise.all([
      document.fonts.ready,
      ...layers.map(
        ({ image }) => image.decode?.().catch(() => {}) || Promise.resolve(),
      ),
    ]);
  }

  function show() {
    if (!layers.length) initialize();
    layout();
    setNearLayers();
    document.fonts?.ready.then(() => {
      if (!disposed && !busy) {
        layout();
        setNearLayers();
      }
    });
    backdropIndex = 0;
    gsap.set(backdropNodes[0], { opacity: 1 });
    gsap.set(backdropNodes[0], { zIndex: 2 });
    gsap.set(backdropNodes[1], { opacity: 0, zIndex: 1 });
    displayProject(active, false);
    gsap.set(wash, {
      backgroundColor:
        projects[active].theme || projects[active].visual?.color || "#2a1612",
    });
    scrollHint.classList.toggle("is-hidden", hasInteracted);
    updateScrollHintLabel();
  }

  function start() {
    if (running) return;
    running = true;
    disposed = false;
    layout();
    setNearLayers();
    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchmove", onTouchMove, { passive: false });
    stage.addEventListener("touchend", onTouchEnd, { passive: true });
    stage.addEventListener("touchcancel", onTouchEnd, { passive: true });
    stage.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    scrollHint.addEventListener("click", onScrollClick);
  }

  function stop() {
    if (!running && disposed) return;
    running = false;
    disposed = true;
    stage.removeEventListener("touchstart", onTouchStart);
    stage.removeEventListener("touchmove", onTouchMove);
    stage.removeEventListener("touchend", onTouchEnd);
    stage.removeEventListener("touchcancel", onTouchEnd);
    cancelAnimationFrame(layoutFrame);
    stage.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    scrollHint.removeEventListener("click", onScrollClick);
    clearTimeout(wheelReset);
    cooldownCall?.kill();
    cooldownCall = null;
    stepTimeline?.kill();
    stepTimeline = null;
    busy = false;
    cooldown = false;
    queuedDirection = 0;
    cursor?.hide();
    document.querySelector(".clock").hidden = false;
    document.querySelector(".bottom-city").textContent =
      siteConfig.navigation.location;
    document.documentElement.style.setProperty("--bg", "#e0e2db");
    document.documentElement.style.setProperty("--ink", "#141414");
    document.documentElement.style.setProperty("--bar-ink", "#141414");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", "#e0e2db");
  }

  initialize();
  return {
    ready,
    show,
    play() {},
    start,
    stop,
    destroy() {
      stop();
      layers.forEach(({ split }) => split.revert());
      root.remove();
    },
  };
}
