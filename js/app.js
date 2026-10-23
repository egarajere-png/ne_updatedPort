import { gsap, playPreloader } from "./reveal.js";
import { siteConfig } from "./config.js";
import { createRouter } from "./router.js";
import { createNavigation } from "./nav.js";
import { preloadProjectImages, themeForProject } from "./theme.js";

const slow = Number(new URLSearchParams(location.search).get("slow"));
if (slow > 0) gsap.globalTimeline.timeScale(1 / slow);
gsap.ticker.lagSmoothing(0);

if (new URLSearchParams(location.search).has("fps")) {
  const meter = document.createElement("output");
  meter.className = "dev-fps-meter";
  meter.setAttribute("aria-live", "off");
  Object.assign(meter.style, { position: "fixed", zIndex: "1001", left: "50%", bottom: "2rem", transform: "translateX(-50%)", padding: ".35rem .5rem", background: "#141414", color: "#f7f7f7", font: "10px/1 monospace", pointerEvents: "none" });
  document.body.append(meter);
  let frames = 0;
  let lastReport = performance.now();
  let previousFrame = lastReport;
  const reportFrame = () => {
    const now = performance.now();
    const frame = now - previousFrame;
    previousFrame = now;
    frames++;
    if (frame > 24) console.warn(`[fps] long frame: ${frame.toFixed(1)}ms`);
    if (now - lastReport >= 500) {
      meter.textContent = `${Math.round(frames * 1000 / (now - lastReport))} FPS`;
      frames = 0;
      lastReport = now;
    }
  };
  gsap.ticker.add(reportFrame);
  window.addEventListener("pagehide", () => { gsap.ticker.remove(reportFrame); meter.remove(); }, { once: true });
}

const router = createRouter();

function preloadImages() {
  const preload = () => {
    Object.values(siteConfig.imagePaths).forEach((path) => {
      const image = new Image();
      image.src = path;
    });
    preloadProjectImages(siteConfig.photography.projects);
    siteConfig.photography.projects.forEach((project) => themeForProject(project));
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(preload, { timeout: 1500 });
  else window.setTimeout(preload, 250);
}

preloadImages();
// SplitText measures the final font metrics, so build the menu after the font is ready.
document.fonts.ready.then(() => {
  createNavigation(router);
  router.start(() => playPreloader(() => router.enterInitial()));
});
