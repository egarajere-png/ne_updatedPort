import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { SplitText } from "gsap/SplitText";
import { siteConfig } from "./config.js";

gsap.registerPlugin(CustomEase, SplitText);
CustomEase.create("hop", "0.8, 0, 0.2, 1");
CustomEase.create("hop2", "0.9, 0, 0.1, 1");

export { gsap, SplitText };
export const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function splitReveal(target, type = "chars", className = "char", masked = true) {
  return SplitText.create(target, {
    type,
    [`${type}Class`]: className,
    ...(masked ? { mask: type } : {}),
  });
}

export function revealText(target, { type = "chars", duration = 0.9, ease = "hop", stagger = "random" } = {}) {
  const split = splitReveal(target, type, "reveal-item", true);
  gsap.set(split[type], { yPercent: 110 });
  gsap.to(split[type], {
    yPercent: 0,
    duration: reducedMotion ? 0.01 : duration,
    ease,
    stagger: reducedMotion ? 0 : stagger === "random" ? { each: 0.035, from: "random" } : stagger,
  });
  return split;
}

export function animatePage(root) {
  const splits = [];
  const images = [...root.querySelectorAll("[data-page-image]")];
  if (images.length) {
    gsap.fromTo(images,
      { clipPath: "inset(48% 48% 48% 48%)", scale: 0.96 },
      { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: reducedMotion ? 0.01 : 0.85, ease: "hop", stagger: reducedMotion ? 0 : 0.1, force3D: true },
    );
  }
  root.querySelectorAll("[data-reveal]").forEach((el) => {
    const type = el.dataset.reveal || "chars";
    splits.push(revealText(el, { type, duration: 0.75, stagger: type === "words" ? 0.055 : "random" }));
  });
  return () => {
    gsap.killTweensOf([...images, ...root.querySelectorAll("*")]);
    splits.forEach((split) => split.revert());
  };
}

export function playPreloader(onComplete) {
  const loader = document.querySelector(".preloader");
  const finish = () => {
    if (loader) gsap.set(loader, { display: "none" });
    sessionStorage.setItem("nneka-preloader-played", "1");
    onComplete();
  };
  if (!loader || sessionStorage.getItem("nneka-preloader-played")) {
    loader?.remove();
    onComplete();
    return;
  }

  document.querySelectorAll(".preloader-img img").forEach((img, i) => {
    img.src = siteConfig.imagePaths[`image${(i % 5) + 1}`];
  });
  const text = splitReveal(".preloader-header h1", "chars", "char");
  const counter = document.querySelector(".preloader-counter p");
  const rotations = [7.5, -2.5, -10, 12.5, -5, 5];
  gsap.set(".preloader-img", {
    xPercent: -50, yPercent: -50, scale: 0,
    rotate: (i) => rotations[i % rotations.length],
    clipPath: "polygon(20% 20%, 80% 20%, 80% 80%, 20% 80%)",
  });
  gsap.set([text.chars, counter], { y: "100%" });
  if (reducedMotion) {
    gsap.set(loader, { display: "none" });
    finish();
    return;
  }
  const timeline = gsap.timeline({ delay: 0.5, onComplete: finish });
  timeline.to(".preloader-img", {
    scale: 1, clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    duration: 1, ease: "hop", stagger: 0.2,
  });
  timeline.to(text.chars, { y: "0%", duration: 1, ease: "hop2", stagger: { each: 0.125, from: "random" } }, 0.35);
  timeline.to(counter, {
    y: "0%", duration: 1, ease: "hop2", onStart: () => {
      const value = { current: 0 };
      gsap.to(value, { current: 100, duration: 2, delay: 0.5, ease: "power2.inOut", onUpdate: () => {
        counter.textContent = String(Math.round(value.current)).padStart(3, "0");
      } });
    },
  }, "<");
  timeline.to(counter, { y: "-100%", duration: 0.75, ease: "hop2" }, 3.25);
  timeline.to(text.chars, { y: "-100%", duration: 0.75, ease: "hop2", stagger: { each: 0.125, from: "random" } }, 3.25);
  timeline.to(".preloader-img", {
    scale: 0, clipPath: "polygon(20% 20%, 80% 20%, 80% 80%, 20% 80%)",
    duration: 1, ease: "hop2", stagger: -0.075,
  }, 3.5);
  timeline.to(loader, { clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)", duration: 1, ease: "hop2" }, 4.35);
}
