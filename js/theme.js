const colorCache = new Map();
const visualCache = new Map();

const fallbackColor = "#2a1612";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
    if (image.complete && image.naturalWidth) resolve(image);
    else image.decode?.().then(() => resolve(image), () => {});
  });
}

function sampleImage(image) {
  const width = 64;
  const height = Math.max(1, Math.round(width * image.naturalHeight / image.naturalWidth));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const buckets = new Map();
  let luminance = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r0 = pixels[i], g0 = pixels[i + 1], b0 = pixels[i + 2];
    const r = Math.min(255, Math.round(r0 / 16) * 16);
    const g = Math.min(255, Math.round(g0 / 16) * 16);
    const b = Math.min(255, Math.round(b0 / 16) * 16);
    const max = Math.max(r0, g0, b0), min = Math.min(r0, g0, b0);
    const saturation = max ? (max - min) / max : 0;
    const key = `${r},${g},${b}`;
    const bucket = buckets.get(key) || { r, g, b, weight: 0 };
    bucket.weight += Math.max(.06, saturation);
    buckets.set(key, bucket);
    luminance += (.2126 * r0 + .7152 * g0 + .0722 * b0) / 255;
  }
  const dominant = [...buckets.values()].sort((a, b) => b.weight - a.weight)[0];
  const hsl = rgbToHsl(dominant.r, dominant.g, dominant.b);
  hsl[1] = clamp(hsl[1], .35, .75);
  hsl[2] = clamp(.10 + .24 * luminance / (width * height), .10, .34);
  return { color: hslToHex(...hsl), backdrop: canvas.toDataURL("image/jpeg", .72) };
}

export async function visualForImage(src, fallback = fallbackColor) {
  if (visualCache.has(src)) return visualCache.get(src);
  const promise = (async () => {
    try {
      const image = await loadImage(src);
      try {
        const sample = sampleImage(image);
        return { src, backdrop: sample.backdrop, color: sample.color, width: image.naturalWidth, height: image.naturalHeight, image };
      } catch {
        return { src, backdrop: src, color: fallback, width: image.naturalWidth, height: image.naturalHeight, image };
      }
    } catch {
      return { src, backdrop: src, color: fallback, width: 1, height: 1, image: null };
    }
  })();
  visualCache.set(src, promise);
  return promise;
}

export async function themeForProject(project) {
  if (project.theme) return project.theme;
  if (colorCache.has(project.slug)) return colorCache.get(project.slug);
  const visual = await visualForImage(project.cover, fallbackColor);
  colorCache.set(project.slug, visual.color || fallbackColor);
  return colorCache.get(project.slug);
}

export async function backdropForProject(project) {
  const visual = await visualForImage(project.cover, project.theme || fallbackColor);
  return { ...visual, color: project.theme || visual.color || fallbackColor };
}

export async function preloadProjectImages(projects, { all = false } = {}) {
  const tasks = projects.flatMap((project) => [
    backdropForProject(project),
    ...(all ? project.images || [] : (project.images || []).slice(0, 3)).map((src) => visualForImage(src, project.theme || fallbackColor)),
  ]);
  return Promise.all(tasks);
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const light = (max + min) / 2;
  let hue = 0, saturation = 0;
  if (delta) {
    saturation = delta / (1 - Math.abs(2 * light - 1));
    if (max === r) hue = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    else if (max === g) hue = ((b - r) / delta + 2) / 6;
    else hue = ((r - g) / delta + 4) / 6;
  }
  return [hue, saturation, light];
}
function hslToHex(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
