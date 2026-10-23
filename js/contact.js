import { gsap, animatePage } from "./reveal.js";
import { siteConfig } from "./config.js";

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export function createContactView(root) {
  const c = siteConfig.contact;
  const phone = c.phone.replace(/[^+\d]/g, "");
  root.innerHTML = `
    <main class="contact-view">
      <section class="contact-main"><div class="contact-center">
        <span class="contact-eyebrow" data-reveal="words">${escapeHTML(c.eyebrow)}</span>
        <h1 class="contact-title" aria-label="No need to be shy">
          <span class="contact-line"><span class="contact-arrow" aria-hidden="true">→</span><span data-reveal="chars">${escapeHTML(c.headline[0])}</span>
            <svg class="bubble-icon" viewBox="0 0 100 100" role="img" aria-label="Speech bubble with three dots"><path d="M50 5C25 5 6 23 6 46s19 41 44 41c6 0 11-1 16-3l18 11-3-22c8-7 13-16 13-27C94 23 75 5 50 5Z" fill="none" stroke="currentColor" stroke-width="6"/><circle cx="34" cy="47" r="4"/><circle cx="50" cy="47" r="4"/><circle cx="66" cy="47" r="4"/></svg>
          </span>
          <span class="contact-line"><span data-reveal="chars">${escapeHTML(c.headline[1])}</span><span class="contact-image-slot"><img data-page-image src="${siteConfig.imagePaths.image5}" alt="A small frame from Nneka's work"></span><span data-reveal="chars">${escapeHTML(c.headline[2])}</span></span>
        </h1>
        <a class="contact-cta" href="mailto:${escapeHTML(c.email)}?subject=${encodeURIComponent(c.mailSubject)}"><span aria-hidden="true">→</span><span data-reveal="words">${escapeHTML(c.mailLabel)}</span></a>
      </div></section>
      <footer class="contact-footer">
        <div class="footer-col footer-opener"><span class="footer-arrow" aria-hidden="true">→</span><p data-reveal="words">${escapeHTML(c.opener)}</p></div>
        <div class="footer-col"><h2 data-reveal="words">SOCIAL</h2><div class="social-pills">${c.social.map(({ label, url }) => `<a href="${escapeHTML(url)}" target="_blank" rel="noreferrer" aria-label="${escapeHTML(label)} profile">${escapeHTML(label)}</a>`).join("")}</div></div>
        <div class="footer-col"><h2 data-reveal="words">CONTACTS</h2><a href="mailto:${escapeHTML(c.email)}" data-reveal="words">${escapeHTML(c.email)}</a><a href="tel:${phone}" data-reveal="words">${escapeHTML(c.phone)}</a></div>
        <div class="footer-col"><h2 data-reveal="words">LOCATION</h2><p data-reveal="words">${escapeHTML(c.location)}</p></div>
      </footer>
    </main>`;

  let cleanup = () => {};
  return {
    ready() {
      const images = [...root.querySelectorAll("img")];
      return Promise.all([document.fonts.ready, ...images.map((img) => img.decode?.().catch(() => {}) || Promise.resolve())]);
    },
    show() {
      gsap.set(root.querySelectorAll("[data-page-image]"), { clipPath: "inset(0)", scale: 1 });
      root.querySelectorAll("[data-reveal]").forEach((el) => { el.style.visibility = "visible"; });
    },
    play() {},
    start() {},
    enter() { cleanup = animatePage(root); },
    stop() { cleanup(); cleanup = () => {}; },
    destroy() { root.remove(); },
  };
}
