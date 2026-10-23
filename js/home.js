import { gsap, splitReveal, reducedMotion, animatePage } from "./reveal.js";
import { siteConfig } from "./config.js";

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export function createHomeView(root) {
  const home = siteConfig.home;
  root.innerHTML = `
    <section class="home-stage" aria-label="Nneka Egara portfolio">
      <figure class="home-small home-small-left"><img data-page-image src="${siteConfig.imagePaths.image2}" alt="Portrait from Nneka Egara's portfolio"></figure>
      <figure class="home-small home-small-right"><img data-page-image src="${siteConfig.imagePaths.image3}" alt="A still image from the portfolio"></figure>
      <div class="home-feature">
        <div class="feature-meta utility"><span data-reveal="words">${escapeHTML(home.label)}</span><span data-reveal="words">${escapeHTML(home.dates)}</span></div>
        <figure class="feature-image"><img data-page-image src="${siteConfig.imagePaths.image1}" alt="Featured film and photography portfolio still"></figure>
        <figcaption class="feature-caption utility" data-reveal="words">${escapeHTML(home.caption)}</figcaption>
      </div>
      <div class="home-headline" aria-live="polite"><div class="headline-side headline-left"></div><span class="home-year utility" data-reveal="words">${escapeHTML(home.year)}</span><div class="headline-side headline-right"></div></div>
    </section>`;

  let cleanupPage = () => {};
  let currentLeft, currentRight, rotationTimer;
  const left = () => root.querySelector(".headline-left");
  const right = () => root.querySelector(".headline-right");

  function fitHeadline() {
    [left(), right()].forEach((el) => {
      if (!el) return;
      el.style.fontSize = "";
      const available = el.clientWidth, rendered = el.scrollWidth;
      if (available && rendered > available) {
        el.style.fontSize = `${parseFloat(getComputedStyle(el).fontSize) * (available / rendered) * 0.98}px`;
      }
    });
  }

  function splitPair(pair, animate = true) {
    left().textContent = pair[0];
    right().textContent = pair[1];
    currentLeft = splitReveal(left(), "chars", "home-char", true);
    currentRight = splitReveal(right(), "chars", "home-char", true);
    const chars = [...currentLeft.chars, ...currentRight.chars];
    gsap.set(chars, { yPercent: animate ? 110 : 0 });
    requestAnimationFrame(fitHeadline);
    if (animate) gsap.to(chars, {
      yPercent: 0, duration: reducedMotion ? 0.01 : 0.7, ease: "hop2",
      stagger: reducedMotion ? 0 : { each: 0.03, from: "random" },
    });
  }

  function rotatePair(index) {
    const chars = [...currentLeft.chars, ...currentRight.chars];
    gsap.killTweensOf(chars);
    gsap.to(chars, {
      yPercent: -110, duration: 0.42, ease: "hop2", stagger: { each: 0.015, from: "random" },
      onComplete: () => {
        currentLeft.revert(); currentRight.revert();
        splitPair(home.rotatingPairs[index]);
      },
    });
  }

  return {
    ready() {
      const images = [...root.querySelectorAll("img")];
      return Promise.all([document.fonts.ready, ...images.map((img) => img.decode?.().catch(() => {}) || Promise.resolve())]);
    },
    show() {
      gsap.set(root.querySelectorAll("[data-page-image]"), { clipPath: "inset(0)", scale: 1 });
      root.querySelectorAll("[data-reveal]").forEach((el) => { el.style.visibility = "visible"; });
      currentLeft?.revert(); currentRight?.revert();
      splitPair(home.rotatingPairs[0], false);
      requestAnimationFrame(fitHeadline);
    },
    play(timeline, at = 0) {
      if (!timeline) return;
      const images = [...root.querySelectorAll("[data-page-image]")];
      timeline.fromTo(images, { clipPath: "inset(48% 48% 48% 48%)", scale: .96 }, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: reducedMotion ? .01 : .72, ease: "hop", stagger: reducedMotion ? 0 : .08 }, at);
    },
    start() {
      let pairIndex = 0;
      if (!reducedMotion && home.rotatingPairs.length > 1) {
        rotationTimer = window.setInterval(() => {
          pairIndex = (pairIndex + 1) % home.rotatingPairs.length;
          rotatePair(pairIndex);
        }, 3500 / gsap.globalTimeline.timeScale());
      }
      window.addEventListener("resize", fitHeadline);
    },
    enter() { cleanupPage = animatePage(root); currentLeft?.revert(); currentRight?.revert(); splitPair(home.rotatingPairs[0], true); this.start(); },
    stop() {
      window.clearInterval(rotationTimer);
      window.removeEventListener("resize", fitHeadline);
      gsap.killTweensOf([...root.querySelectorAll("*"), ...(currentLeft?.chars || []), ...(currentRight?.chars || [])]);
    },
    destroy() {
      currentLeft?.revert(); currentRight?.revert();
      cleanupPage();
      root.remove();
    },
  };
}
