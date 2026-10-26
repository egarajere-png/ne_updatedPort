import { gsap, reducedMotion } from "./reveal.js";
import { createHomeView } from "./home.js";
import { createContactView } from "./contact.js";
import {
  createPhotographyView,
  returnIndex as photographyReturnIndex,
} from "./photography.js";
import { createProjectView } from "./project.js";
import { createTransitionManager } from "./transitions.js";
import { siteConfig } from "./config.js";
import { themeForProject } from "./theme.js";

const pages = {
  "/": {
    title: "Nneka Egara — Filmmaker & Copywriter",
    create: createHomeView,
    label: "HOME",
    color: "#e0e2db",
  },
  "/about": {
    title: "About — Nneka Egara",
    heading: "GET TO KNOW ME",
    note: "Coming soon — a little more about Nneka.",
    label: "ABOUT ME",
    color: "#e0e2db",
  },
  "/gallery": {
    title: "Gallery — Nneka Egara",
    heading: "MY GALLERY",
    note: "Coming soon — selected still images and frames.",
    label: "MY GALLERY",
    color: "#e0e2db",
  },
  "/contact": {
    title: "Say hi — Nneka Egara",
    create: createContactView,
    label: "CONTACT ME",
    color: "#f9f7f6",
  },
  "/films": {
    title: "Films — Nneka Egara",
    heading: "MY FILMS",
    note: "Coming soon — stories made to move you.",
    label: "MY FILMS",
    color: "#e0e2db",
  },
  "/photography": {
    title: "Photography — Nneka Egara",
    create: createPhotographyView,
    label: "PHOTOGRAPHY",
  },
};

export const routeFromHash = (hash = location.hash) => {
  const path = (hash.replace(/^#/, "") || "/").replace(/\/$/, "") || "/";
  if (path.startsWith("/photography/")) return path;
  return pages[path] ? path : "/";
};

const routeTitle = (route) =>
  route.startsWith("/photography/")
    ? `${route.split("/").at(-1).replaceAll("-", " ")} — Photography | Nneka Egara`
    : pages[route]?.title || pages["/"].title;

export function createRouter() {
  const layer = document.querySelector("#page-layer");
  const transitionManager = createTransitionManager(
    layer,
    document.querySelector("#menu-card"),
  );
  let currentRoute = routeFromHash();
  let currentView = null;
  let currentNode = null;
  let currentStopped = false;
  let ignoreHash = null;
  let starting = false;

  function createView(route, node) {
    if (route.startsWith("/photography/"))
      return createProjectView(node, route.split("/").at(-1), {
        navigate: transitionTo,
      });
    const page = pages[route];
    if (page?.create) return page.create(node, { navigate: transitionTo });
    node.innerHTML = `<section class="placeholder-main"><h1 class="placeholder-title" data-reveal="chars">${page.heading}</h1><p class="placeholder-note" data-reveal="words">${page.note}</p></section>`;
    let cleanup = () => {};
    return {
      ready: () => document.fonts.ready,
      show() {
        cleanup();
        cleanup = () => {};
        node.querySelectorAll("[data-reveal]").forEach((el) => {
          el.style.visibility = "visible";
        });
      },
      play() {},
      start() {},
      stop() {
        cleanup();
        cleanup = () => {};
      },
      destroy() {
        node.remove();
      },
    };
  }

  async function make(route) {
    const node = document.createElement("div");
    node.className = "page-view";
    node.dataset.route = route;
    if (route.startsWith("/photography/"))
      node.classList.add("page-view-project");
    const view = createView(route, node);
    await (view.ready?.() || Promise.resolve());
    return { route, node, view };
  }

  function removeCurrent() {
    if (!currentView) return;
    if (!currentStopped) currentView.stop?.();
    currentView.destroy?.();
    currentNode?.remove();
    currentView = null;
    currentNode = null;
    currentStopped = false;
  }

  function mount(next, { arrival = false } = {}) {
    layer.replaceChildren(next.node);
    next.view.show?.();
    currentRoute = next.route;
    currentNode = next.node;
    currentView = next.view;
    currentStopped = false;
    document.title = routeTitle(currentRoute);
    layer.inert = false;
    if (arrival) {
      gsap.set(layer, {
        visibility: "visible",
        opacity: 1,
        scale: reducedMotion ? 1 : 1.1,
        rotate: 0,
        yPercent: reducedMotion ? 0 : 6,
        transformOrigin: "50% 100%",
        force3D: true,
      });
    } else {
      gsap.set(layer, {
        visibility: "visible",
        opacity: 1,
        clearProps: "transform",
      });
    }
  }

  async function presentationFor(route, titleOverride, colorOverride) {
    if (route.startsWith("/photography/")) {
      const project =
        siteConfig.photography.projects.find(
          (item) => item.slug === route.split("/").at(-1),
        ) || siteConfig.photography.projects[0];
      return {
        label: titleOverride || project.title,
        color: colorOverride || (await themeForProject(project)),
      };
    }
    if (route === "/photography") {
      const item =
        siteConfig.photography.projects[photographyReturnIndex] ||
        siteConfig.photography.projects[0];
      return {
        label: titleOverride || siteConfig.photography.backLabel,
        color: colorOverride || (await themeForProject(item)),
      };
    }
    if (titleOverride || colorOverride) {
      const page = pages[route];
      return {
        label: titleOverride || page?.label || "NNEKA EGARA",
        color: colorOverride || page?.color || "#e0e2db",
      };
    }
    const page = pages[route] || pages["/"];
    return { label: page.label, color: page.color };
  }

  async function transitionTo(route, options = {}) {
    if (starting || route === currentRoute) return false;
    starting = true;
    document.body.classList.add("transition-lock");
    layer.inert = true;
    if (currentView && !currentStopped) {
      currentView.stop?.();
      currentStopped = true;
    }
    const prepared = make(route);
    try {
      const presentation = await presentationFor(
        route,
        options.cardTitle,
        options.cardTheme,
      );
      return await transitionManager.run({
        label: presentation.label,
        color: presentation.color,
        fromMenu: Boolean(options.fromMenu),
        onCovered: async (timeline) => {
          const next = await prepared;
          removeCurrent();
          mount(next, { arrival: true });
          layer.inert = true;
          currentView?.play?.(timeline, 1.75);
        },
        onLiftStart: options.onLiftStart,
        onError: (error) => {
          console.error(
            "Route transition could not prepare the destination view.",
            error,
          );
          layer.inert = false;
          currentStopped = false;
        },
        onComplete: () => {
          try {
            if (location.hash !== `#${route}`) {
              ignoreHash = route;
              location.hash = route;
            }
            currentView?.start?.();
            options.onComplete?.();
          } finally {
            layer.inert = false;
            starting = false;
            document.body.classList.remove("transition-lock");
          }
        },
      });
    } catch (error) {
      layer.inert = false;
      currentStopped = false;
      currentView?.start?.();
      starting = false;
      document.body.classList.remove("transition-lock");
      throw error;
    }
  }

  async function start(onReady) {
    if (!location.hash)
      history.replaceState(
        null,
        "",
        `${location.pathname}${location.search}#/`,
      );
    currentRoute = routeFromHash();
    mount(await make(currentRoute));
    await document.fonts.ready;
    await onReady?.();
  }

  function enterInitial() {
    currentView?.show?.();
    currentView?.start?.();
  }

  async function directNavigate(route) {
    if (route === currentRoute) return false;
    return transitionTo(route);
  }

  async function historyNavigate(route) {
    if (route === currentRoute) return;
    if (currentRoute.startsWith("/photography/") && route === "/photography") {
      const from =
        siteConfig.photography.projects.find(
          (item) => item.slug === currentRoute.split("/").at(-1),
        ) || siteConfig.photography.projects[0];
      await transitionTo(route, {
        cardTitle: siteConfig.photography.backLabel,
        cardTheme: await themeForProject(from),
      });
      return;
    }
    document.body.classList.add("transition-lock");
    const next = await make(route);
    const oldNode = currentNode;
    const oldView = currentView;
    if (oldView && !currentStopped) oldView.stop?.();
    next.view.show?.();
    layer.append(next.node);
    gsap.set(next.node, { opacity: reducedMotion ? 1 : 0 });
    currentRoute = route;
    currentNode = next.node;
    currentView = next.view;
    currentStopped = false;
    document.title = routeTitle(route);
    const finish = () => {
      oldView?.destroy?.();
      oldNode?.remove();
      currentView?.start?.();
      document.body.classList.remove("transition-lock");
    };
    if (reducedMotion) finish();
    else
      gsap
        .timeline({ onComplete: finish })
        .to(next.node, { opacity: 1, duration: 0.35, ease: "power1.out" }, 0)
        .to(oldNode, { opacity: 0, duration: 0.35, ease: "power1.out" }, 0);
  }

  async function handleHistory() {
    const route = routeFromHash();
    if (ignoreHash === route) {
      ignoreHash = null;
      return;
    }
    await historyNavigate(route);
  }
  window.addEventListener("hashchange", handleHistory);

  return {
    start,
    enterInitial,
    directNavigate,
    transitionTo,
    get currentRoute() {
      return currentRoute;
    },
    get transitionCard() {
      return transitionManager.card;
    },
  };
}
