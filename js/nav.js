import { gsap, SplitText, reducedMotion } from "./reveal.js";
import { siteConfig } from "./config.js";

const routeForHref = (href) => href.replace(/^#/, "") || "/";

export function createNavigation(router) {
  const card = document.querySelector("#menu-card");
  const pageLayer = document.querySelector("#page-layer");
  const toggle = document.querySelector(".menu-toggle");
  const menuColumns = document.querySelector(".menu-columns");
  const urlPill = document.querySelector(".menu-url");
  const menuWord = document.querySelector(".menu-word");
  const closeWord = document.querySelector(".close-word");
  const labels = [];
  const hoverStates = [];
  let menuOpen = false;
  let isAnimating = false;
  let pendingRoute = null;
  let routeAtMenuOpen = router.currentRoute;
  let priorBarInk = "#141414";
  const outsideLinks = [...document.querySelectorAll(".topbar-brand, .topbar-dark-mode, .talk-link")];
  const setOutsideTabbable = (enabled) => outsideLinks.forEach((element) => {
    if (enabled) element.removeAttribute("tabindex");
    else element.setAttribute("tabindex", "-1");
  });

  document.querySelector(".topbar-brand").textContent = siteConfig.navigation.brand;
  document.querySelector(".bottom-tagline").textContent = siteConfig.navigation.bottomLine;
  document.querySelector(".bottom-city").textContent = siteConfig.navigation.location;

  const columns = [document.createElement("div"), document.createElement("div")];
  columns.forEach((column, index) => {
    column.className = "menu-column";
    column.dataset.column = String(index);
    menuColumns.append(column);
  });

  function makeCopies(charSpan) {
    const character = charSpan.textContent === " " ? "\u00a0" : charSpan.textContent;
    const mask = document.createElement("span");
    mask.className = "menu-char-mask";
    const copyA = document.createElement("span");
    const copyB = document.createElement("span");
    copyA.className = "menu-char-copy menu-char-a";
    copyB.className = "menu-char-copy menu-char-b";
    copyA.textContent = character;
    copyB.textContent = character;
    mask.append(copyA, copyB);
    charSpan.replaceChildren(mask);
    return { copyA, copyB, character };
  }

  siteConfig.navigation.links.forEach((item, index) => {
    const anchor = document.createElement("a");
    anchor.className = "menu-link";
    anchor.href = item.href;
    anchor.dataset.path = item.path;
    anchor.setAttribute("aria-label", item.label);
    anchor.innerHTML = `<span class="menu-thumb" aria-hidden="true"><img src="${siteConfig.imagePaths[item.image]}" alt=""></span><span class="menu-line-mask"><span class="menu-link-label">${item.label}</span></span>`;
    columns[index < 3 ? 0 : 1].append(anchor);
    const label = anchor.querySelector(".menu-link-label");
    const split = SplitText.create(label, {
      type: "words,chars",
      wordsClass: "menu-word",
      charsClass: "menu-split-char",
    });
    const pairs = split.chars.map((char) => {
      const copies = makeCopies(char);
      return { ...copies, rest: copies.copyA, incoming: copies.copyB };
    });
    gsap.set(pairs.map((pair) => pair.copyA), { yPercent: 0 });
    gsap.set(pairs.map((pair) => pair.copyB), { yPercent: 100 });
    labels.push(label);
    const hoverState = { anchor, pairs, queue: [], rolling: false, split };
    hoverStates.push(hoverState);

    const roll = () => {
      hoverState.queue.push(true);
      if (hoverState.rolling) return;
      playNextRoll(hoverState);
    };
    if (window.matchMedia("(hover: hover)").matches) {
      anchor.addEventListener("mouseenter", () => { anchor.classList.add("is-hovered"); urlPill.textContent = `${siteConfig.navigation.previewDomain}${item.path === "/" ? "" : item.path}`; urlPill.classList.add("is-visible"); roll(); });
      anchor.addEventListener("mouseleave", () => { anchor.classList.remove("is-hovered"); urlPill.classList.remove("is-visible"); roll(); });
    }
  });

  function playNextRoll(state) {
    if (!state.queue.length) { state.rolling = false; return; }
    state.queue.shift();
    state.rolling = true;
    const a = state.pairs.map((pair) => pair.rest);
    const b = state.pairs.map((pair) => pair.incoming);
    gsap.killTweensOf([...a, ...b]);
    gsap.set(a, { yPercent: 0 });
    gsap.set(b, { yPercent: 100 });
    gsap.timeline({ onComplete: () => {
      // Exchange the identical character copies after every full roll, then restore a clean rest pose.
      state.pairs.forEach((pair) => {
        [pair.rest, pair.incoming] = [pair.incoming, pair.rest];
      });
      gsap.set(state.pairs.map((pair) => pair.rest), { yPercent: 0 });
      gsap.set(state.pairs.map((pair) => pair.incoming), { yPercent: 100 });
      playNextRoll(state);
    } })
      .to(a, { yPercent: -100, duration: reducedMotion ? 0.01 : 0.5, ease: "hop2", stagger: reducedMotion ? 0 : 0.015 }, 0)
      .to(b, { yPercent: 0, duration: reducedMotion ? 0.01 : 0.5, ease: "hop2", stagger: reducedMotion ? 0 : 0.015 }, 0);
  }

  function resetHoverState() {
    hoverStates.forEach((state) => {
      state.queue.length = 0;
      state.rolling = false;
      const copies = state.pairs.flatMap(({ copyA, copyB }) => [copyA, copyB]);
      gsap.killTweensOf(copies);
      gsap.set(state.pairs.map((pair) => pair.rest), { yPercent: 0 });
      gsap.set(state.pairs.map((pair) => pair.incoming), { yPercent: 100 });
      state.anchor.classList.remove("is-hovered");
    });
    urlPill.classList.remove("is-visible");
  }

  function finishMenuNavigation(route) {
    card.inert = true;
    card.setAttribute("aria-hidden", "true");
    pageLayer.inert = false;
    gsap.set(labels, { yPercent: 110 });
    gsap.set(card.querySelectorAll(".menu-link"), { yPercent: 0 });
    gsap.set(menuColumns, { x: 0, opacity: 1, clearProps: "visibility" });
    gsap.set(card.querySelector(".menu-mobile-actions"), { autoAlpha: 1 });
    resetHoverState();
    setOutsideTabbable(true);
    toggle.setAttribute("aria-expanded", "false");
    menuOpen = false;
    isAnimating = false;
    if (route === routeAtMenuOpen) document.documentElement.style.setProperty("--bar-ink", priorBarInk);
    pendingRoute = null;
    toggle.focus();
  }

  function fitMenuLinks() {
    if (window.matchMedia("(max-width: 768px)").matches) return;
    const links = [...card.querySelectorAll(".menu-link")];
    links.forEach((link) => { link.style.fontSize = ""; });
    const scale = Math.min(1, ...links.map((link) => {
      const label = link.querySelector(".menu-link-label");
      return label.clientWidth && label.scrollWidth > label.clientWidth
        ? label.clientWidth / label.scrollWidth
        : 1;
    }));
    if (scale < 1) links.forEach((link) => {
      link.style.fontSize = `${parseFloat(getComputedStyle(link).fontSize) * scale * 0.985}px`;
    });
  }
  document.fonts.ready.then(fitMenuLinks);
  window.addEventListener("resize", fitMenuLinks);

  gsap.set(card, { autoAlpha: 0, yPercent: -110, rotate: -10, transformOrigin: "0% 100%", force3D: true });
  gsap.set(pageLayer, { transformOrigin: "50% 100%", force3D: true });
  gsap.set(labels, { yPercent: 110, force3D: true });
  gsap.set(menuWord, { yPercent: 0 });
  gsap.set(closeWord, { yPercent: 110 });

  const openTimeline = gsap.timeline({
    paused: true,
    onComplete: () => {
      gsap.set(pageLayer, { visibility: "hidden" });
      pageLayer.classList.remove("is-transition-moving");
      card.classList.remove("is-transitioning");
      pageLayer.inert = true;
      card.inert = false;
      menuOpen = true;
      isAnimating = false;
      document.body.classList.remove("transition-lock");
      card.style.pointerEvents = "auto";
      card.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-expanded", "true");
      getFocusable()[0]?.focus();
    },
  });
  if (reducedMotion) {
    openTimeline.set(card, { display: "block", autoAlpha: 0, pointerEvents: "none", yPercent: 0, rotate: 0 }, 0)
      .to(card, { autoAlpha: 1, duration: 0.3 }, 0)
      .to(menuWord, { yPercent: -110, duration: 0.12 }, 0.06)
      .to(closeWord, { yPercent: 0, duration: 0.12 }, 0.18)
      .to(labels, { yPercent: 0, duration: 0.01, stagger: 0 }, 0.2);
  } else {
    openTimeline.set(card, { display: "block", autoAlpha: 1, pointerEvents: "none" }, 0)
      .to(card, { yPercent: 0, rotate: 0, duration: 0.9, ease: "hop", force3D: true }, 0)
      .to(pageLayer, { scale: 1.08, yPercent: -4, duration: 0.9, ease: "hop", force3D: true }, 0)
      .to(menuWord, { yPercent: -110, duration: 0.2, ease: "hop2" }, 0.3)
      .to(closeWord, { yPercent: 0, duration: 0.2, ease: "hop2" }, 0.5)
      .to(labels, { yPercent: 0, duration: 0.75, ease: "hop2", stagger: (i) => i < 3 ? i * 0.06 : 0.08 + (i - 3) * 0.06, force3D: true }, 0.45);
  }

  const leaveTimeline = gsap.timeline({
    paused: true,
    onComplete: () => {
      card.inert = true;
      card.setAttribute("aria-hidden", "true");
      gsap.set(card, { display: "none", autoAlpha: 0, yPercent: -110, rotate: -10, clearProps: "pointerEvents" });
      gsap.set(pageLayer, { visibility: "visible", opacity: 1, scale: 1, yPercent: 0, clearProps: "transformOrigin,rotate" });
      pageLayer.classList.remove("is-transition-moving");
      card.classList.remove("is-transitioning");
      pageLayer.inert = false;
      gsap.set(labels, { yPercent: 110, x: 0 });
      gsap.set(menuColumns, { x: 0 });
      resetHoverState();
      document.body.classList.remove("transition-lock");
      setOutsideTabbable(true);
      toggle.setAttribute("aria-expanded", "false");
      menuOpen = false;
      isAnimating = false;
      if (!pendingRoute || pendingRoute === routeAtMenuOpen) document.documentElement.style.setProperty("--bar-ink", priorBarInk);
      pendingRoute = null;
      toggle.focus();
    },
  });
  if (reducedMotion) {
    leaveTimeline.to(card, { autoAlpha: 0, duration: 0.3 }, 0.1)
      .to(pageLayer, { opacity: 1, duration: 0.3 }, 0.1)
      .to(closeWord, { yPercent: -110, duration: 0.12 }, 0.25)
      .to(menuWord, { yPercent: 0, duration: 0.12 }, 0.37);
  } else {
    leaveTimeline.to(menuColumns, { x: "-3vw", duration: 0.3, ease: "power2.out", force3D: true }, 0)
      .to(card, { yPercent: -110, rotate: -10, duration: 0.9, ease: "hop", force3D: true }, 0.1)
      .to(pageLayer, { scale: 1, yPercent: 0, duration: 0.9, ease: "hop", force3D: true }, 0.1)
      .to(closeWord, { yPercent: -110, duration: 0.2, ease: "hop2" }, 0.25)
      .to(menuWord, { yPercent: 0, duration: 0.2, ease: "hop2" }, 0.45);
  }

  function getFocusable() {
    return [...card.querySelectorAll("a[href], button:not([disabled])")].filter((element) => element.getClientRects().length);
  }
  function beginLeave(route) {
    if (isAnimating) return;
    if (route && route !== router.currentRoute) {
      isAnimating = true;
      document.body.classList.add("transition-lock");
      setOutsideTabbable(false);
      pageLayer.inert = true;
      pendingRoute = route;
      const item = siteConfig.navigation.links.find((link) => link.path === route);
      router.transitionTo(route, {
        fromMenu: menuOpen,
        cardTitle: item?.label || route.replace(/^\//, "").replaceAll("-", " ").toUpperCase(),
        onLiftStart: () => {
          gsap.to(closeWord, { yPercent: -110, duration: reducedMotion ? .01 : .2, ease: "hop2" });
          gsap.to(menuWord, { yPercent: 0, duration: reducedMotion ? .01 : .2, ease: "hop2" });
        },
        onComplete: () => finishMenuNavigation(route),
      });
      return;
    }
    isAnimating = true;
    document.body.classList.add("transition-lock");
    card.classList.add("is-transitioning");
    pageLayer.classList.add("is-transition-moving");
    setOutsideTabbable(false);
    pageLayer.inert = true;
    pendingRoute = null;
    card.inert = false;
    leaveTimeline.play(0);
  }
  function openMenu() {
    if (isAnimating || menuOpen) return;
    isAnimating = true;
    document.body.classList.add("transition-lock");
    card.classList.add("is-transitioning");
    pageLayer.classList.add("is-transition-moving");
    setOutsideTabbable(false);
    pageLayer.inert = true;
    pageLayer.style.visibility = "visible";
    priorBarInk = getComputedStyle(document.documentElement).getPropertyValue("--bar-ink").trim() || "#141414";
    routeAtMenuOpen = router.currentRoute;
    document.documentElement.style.setProperty("--bar-ink", "#141414");
    card.style.display = "block";
    fitMenuLinks();
    card.inert = false;
    card.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    openTimeline.play(0);
  }

  toggle.addEventListener("click", () => {
    if (isAnimating) return;
    if (menuOpen) beginLeave(null);
    else openMenu();
  });
  card.addEventListener("click", (event) => {
    const anchor = event.target.closest("a[href^='#/']");
    if (!anchor || isAnimating) return;
    event.preventDefault();
    const route = anchor.dataset.path || routeForHref(anchor.getAttribute("href"));
    beginLeave(route);
  });
  document.querySelectorAll(".topbar-brand, .talk-link, .menu-talk-link").forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      event.preventDefault();
      if (isAnimating) return;
      const route = routeForHref(anchor.getAttribute("href"));
      if (menuOpen) beginLeave(route);
      else router.directNavigate(route);
    });
  });
  document.addEventListener("keydown", (event) => {
    if (isAnimating && event.key === "Tab") { event.preventDefault(); return; }
    if (event.key === "Escape" && menuOpen && !isAnimating) { event.preventDefault(); beginLeave(null); }
    if (!menuOpen || isAnimating || event.key !== "Tab") return;
    const focusable = [...getFocusable(), toggle];
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  const clock = document.querySelector(".clock");
  const updateClock = () => {
    clock.textContent = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).format(new Date());
  };
  updateClock();
  const clockInterval = window.setInterval(updateClock, 1000);
  window.addEventListener("pagehide", () => window.clearInterval(clockInterval), { once: true });

  return {
    openMenu,
    closeMenu: () => beginLeave(null),
    get isAnimating() { return isAnimating; },
    get menuOpen() { return menuOpen; },
  };
}
