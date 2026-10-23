import { gsap } from "./reveal.js";

let cursor;
export function getCursor() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return null;
  if (cursor) return cursor;
  const node = document.createElement("div");
  node.className = "portfolio-cursor";
  node.innerHTML = `<span></span>`;
  node.setAttribute("aria-hidden", "true");
  document.body.append(node);
  const x = gsap.quickTo(node, "x", { duration: .35, ease: "power2.out" });
  const y = gsap.quickTo(node, "y", { duration: .35, ease: "power2.out" });
  window.addEventListener("pointermove", (event) => { x(event.clientX); y(event.clientY); }, { passive: true });
  cursor = {
    node,
    show(label = "") { node.querySelector("span").textContent = label; node.classList.add("is-visible"); },
    hide() { node.classList.remove("is-visible"); },
    label(label) { node.querySelector("span").textContent = label; },
  };
  return cursor;
}
