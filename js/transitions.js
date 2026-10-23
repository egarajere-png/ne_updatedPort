import { gsap, SplitText, reducedMotion } from "./reveal.js";

const CARD_DROP = .70;
const CARD_TEXT_IN = .70;
const CARD_TEXT_IN_DURATION = .50;
const CARD_TEXT_OUT = 1.45;
const CARD_TEXT_OUT_DURATION = .40;
const CARD_LIFT = 1.75;
const CARD_LIFT_DURATION = .90;
const MENU_LINK_OUT = .35;
const REDUCED_DURATION = .30;

function readableInk(color) {
  const hex = String(color || "#e0e2db").replace("#", "");
  const channels = hex.length === 3 ? hex.split("").map((part) => parseInt(part + part, 16)) : [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const luminance = channels.reduce((sum, value, index) => sum + [0.2126, 0.7152, 0.0722][index] * value, 0);
  return luminance < 130 ? "#f4efe8" : "#141414";
}

export function createTransitionManager(pageLayer, card = document.querySelector("#menu-card")) {
  const title = card.querySelector(".transition-card-title");
  let timeline = null;
  let split = null;
  let active = false;

  function clearTitle() {
    split?.revert();
    split = null;
    title.textContent = "";
    title.style.visibility = "hidden";
  }

  function run({ label, color = "#e0e2db", fromMenu = false, onCovered = () => {}, onLiftStart = () => {}, onComplete = () => {}, onError = () => {} }) {
    if (active) return Promise.resolve(false);
    active = true;
    timeline?.kill();
    split?.revert();
    title.textContent = label || "";
    title.style.visibility = "visible";
    split = SplitText.create(title, { type: "chars", mask: "chars", charsClass: "transition-title-char" });
    const chars = split.chars;
    const ink = readableInk(color);

    card.style.display = "block";
    card.setAttribute("aria-hidden", "false");
    card.inert = true;
    card.classList.add("is-transitioning");
    pageLayer.classList.add("is-transition-moving");
    if (!fromMenu) card.style.backgroundColor = color;
    card.style.color = ink;
    if (!fromMenu) gsap.set(card.querySelectorAll(".menu-columns,.menu-mobile-actions,.menu-url"), { visibility: "hidden" });
    gsap.set(chars, { yPercent: 110, force3D: true });

    const durationScale = reducedMotion ? REDUCED_DURATION : 1;
    const timelinePromise = new Promise((resolve) => {
      const finish = (ok = true) => {
        clearTitle();
        card.classList.remove("is-transitioning");
        pageLayer.classList.remove("is-transition-moving");
        card.style.pointerEvents = "none";
        gsap.set(card.querySelectorAll(".menu-columns,.menu-mobile-actions,.menu-url"), { clearProps: "visibility" });
        gsap.set(card.querySelectorAll(".menu-link"), { yPercent: 0 });
        gsap.set(card.querySelector(".menu-mobile-actions"), { autoAlpha: 1 });
        gsap.set(card, { display: "none", autoAlpha: 0, yPercent: -110, rotate: -10, clearProps: "backgroundColor,color,pointerEvents" });
        active = false;
        try { onComplete(); } finally { resolve(ok); }
      };

      timeline = gsap.timeline({ paused: true, onComplete: () => finish(true) });
      if (reducedMotion) {
        if (fromMenu) {
          timeline.to(card, { backgroundColor: color, duration: durationScale, ease: "none" }, 0)
            .to(card.querySelectorAll(".menu-link"), { yPercent: -110, duration: durationScale, ease: "none", stagger: 0 }, 0);
        } else {
          gsap.set(card, { yPercent: -110, rotate: 0, transformOrigin: "0% 100%", autoAlpha: 1, force3D: true });
          timeline.to(card, { yPercent: 0, duration: durationScale, ease: "none" }, 0)
            .to(pageLayer, { scale: 1, yPercent: 0, duration: durationScale, ease: "none" }, 0);
        }
        timeline.addPause(durationScale, () => {
          Promise.resolve().then(() => onCovered(timeline)).then(() => timeline?.resume(), (error) => { onError(error); timeline?.resume(); });
        });
        timeline.set(chars, { yPercent: 0 }, durationScale)
          .to(chars, { yPercent: -110, duration: durationScale, ease: "none", stagger: 0 }, durationScale + .2)
          .add(() => onLiftStart(), durationScale + .35)
          .to(card, { autoAlpha: 0, duration: durationScale, ease: "none" }, durationScale + .35)
          .to(pageLayer, { scale: 1, yPercent: 0, duration: durationScale, ease: "none" }, durationScale + .35);
      } else {
        if (fromMenu) {
          gsap.set(card, { yPercent: 0, rotate: 0, autoAlpha: 1, transformOrigin: "0% 100%", force3D: true });
          timeline.to(card, { backgroundColor: color, duration: MENU_LINK_OUT, ease: "power2.out" }, 0)
            .to(card.querySelectorAll(".menu-link"), { yPercent: -110, duration: MENU_LINK_OUT, ease: "hop2", stagger: .03, force3D: true }, 0)
            .set(card.querySelector(".menu-columns"), { visibility: "hidden" }, MENU_LINK_OUT)
            .set(card.querySelector(".menu-mobile-actions"), { autoAlpha: 0 }, MENU_LINK_OUT);
        } else {
          gsap.set(card, { yPercent: -110, rotate: -10, transformOrigin: "0% 100%", autoAlpha: 1, force3D: true });
          gsap.set(pageLayer, { visibility: "visible", transformOrigin: "50% 100%", force3D: true });
          timeline.to(card, { yPercent: 0, rotate: 0, duration: CARD_DROP, ease: "hop", force3D: true }, 0)
            .to(pageLayer, { scale: 1.08, yPercent: -4, duration: CARD_DROP, ease: "hop", force3D: true }, 0);
        }

        // Pause at full cover until the new view is ready and mounted underneath.
        timeline.addPause(CARD_DROP, () => {
          Promise.resolve().then(() => onCovered(timeline)).then(
            () => timeline?.resume(),
            (error) => { onError(error); timeline?.resume(); },
          );
        });
        timeline.to(chars, { yPercent: 0, duration: CARD_TEXT_IN_DURATION, ease: "hop2", stagger: { each: .03, from: "random" }, force3D: true }, CARD_TEXT_IN)
          .to(chars, { yPercent: -110, duration: CARD_TEXT_OUT_DURATION, ease: "hop2", stagger: { each: .015, from: "random" }, force3D: true }, CARD_TEXT_OUT)
          .add(() => onLiftStart(), CARD_LIFT)
          .to(card, { yPercent: -110, rotate: -10, duration: CARD_LIFT_DURATION, ease: "hop", force3D: true }, CARD_LIFT)
          .fromTo(pageLayer, { scale: 1.1, yPercent: 6 }, { scale: 1, yPercent: 0, duration: CARD_LIFT_DURATION, ease: "hop", force3D: true }, CARD_LIFT);
      }
      timeline.play(0);
    });
    return timelinePromise;
  }

  return {
    run,
    get card() { return card; },
    kill() {
      timeline?.kill();
      clearTitle();
      card.classList.remove("is-transitioning");
      pageLayer.classList.remove("is-transition-moving");
      active = false;
    },
  };
}
