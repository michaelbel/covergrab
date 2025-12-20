// src/download.ts
async function downloadAsFile(url, filename) {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status}`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.target = "_self";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

// src/youtube.ts
var VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
function extractVideoId(raw) {
  const value = String(raw != null ? raw : "").trim();
  if (!value) {
    return null;
  }
  if (VIDEO_ID_REGEX.test(value)) {
    return value;
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.hostname.includes("youtu.be")) {
    const [id] = parsed.pathname.split("/").filter(Boolean);
    return id && VIDEO_ID_REGEX.test(id) ? id : null;
  }
  const videoParam = parsed.searchParams.get("v");
  if (videoParam && VIDEO_ID_REGEX.test(videoParam)) {
    return videoParam;
  }
  const parts = parsed.pathname.split("/").filter(Boolean);
  const shortsIndex = parts.indexOf("shorts");
  if (shortsIndex !== -1) {
    const candidate = parts[shortsIndex + 1];
    if (candidate && VIDEO_ID_REGEX.test(candidate)) {
      return candidate;
    }
  }
  const embedIndex = parts.indexOf("embed");
  if (embedIndex !== -1) {
    const candidate = parts[embedIndex + 1];
    if (candidate && VIDEO_ID_REGEX.test(candidate)) {
      return candidate;
    }
  }
  return null;
}
function makeCandidates(id) {
  return [
    { name: "maxres", url: `https://img.youtube.com/vi/${id}/maxresdefault.jpg` },
    { name: "sd", url: `https://img.youtube.com/vi/${id}/sddefault.jpg` },
    { name: "hq", url: `https://img.youtube.com/vi/${id}/hqdefault.jpg` },
    { name: "mq", url: `https://img.youtube.com/vi/${id}/mqdefault.jpg` },
    { name: "default", url: `https://img.youtube.com/vi/${id}/default.jpg` }
  ];
}
async function loadImageInfo(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => reject(new Error("Image load failed"));
    const cacheBust = url.includes("?") ? "&" : "?";
    img.src = `${url}${cacheBust}cacheBust=${Date.now()}`;
  });
}
async function pickBestThumbnail(id) {
  const variants = makeCandidates(id);
  for (const variant of variants) {
    try {
      const { width } = await loadImageInfo(variant.url);
      if (width >= 640) {
        return variant;
      }
      if (variant.name !== "maxres") {
        return variant;
      }
    } catch {
    }
  }
  return null;
}

// src/main.ts
var urlInput = document.querySelector("#url-input");
var downloadButton = document.querySelector("#download-btn");
var statusEl = document.querySelector("#status");
var cardEl = document.querySelector(".card");
if (!urlInput || !downloadButton || !statusEl || !cardEl) {
  throw new Error("Required DOM elements not found");
}
function setStatus(message) {
  statusEl.textContent = message;
}
function setInputError(hasError) {
  urlInput.classList.toggle("input-error", hasError);
  urlInput.setAttribute("aria-invalid", hasError ? "true" : "false");
}
function setLoading(isLoading) {
  downloadButton.disabled = isLoading;
  downloadButton.textContent = isLoading ? "\u0421\u043A\u0430\u0447\u0438\u0432\u0430\u044E\u2026" : "\u0421\u043A\u0430\u0447\u0430\u0442\u044C";
}
async function handleDownload() {
  setStatus("");
  setInputError(false);
  cardEl.classList.add("is-animating");
  window.setTimeout(() => {
    cardEl.classList.remove("is-animating");
  }, 420);
  const videoId = extractVideoId(urlInput.value);
  if (!videoId) {
    setInputError(true);
    return;
  }
  setLoading(true);
  try {
    const best = await pickBestThumbnail(videoId);
    if (!best) {
      setStatus("\u041D\u0435 \u043D\u0430\u0448\u0451\u043B \u043E\u0431\u043B\u043E\u0436\u043A\u0443 \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0432\u0438\u0434\u0435\u043E.");
      return;
    }
    const filename = `youtube-${videoId}-${best.name}.jpg`;
    try {
      await downloadAsFile(best.url, filename);
      setStatus("");
    } catch {
      setStatus(
        `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u0432\u0440\u0443\u0447\u043D\u0443\u044E: ${best.url}`
      );
    }
  } finally {
    setLoading(false);
  }
}
downloadButton.addEventListener("click", handleDownload);
urlInput.addEventListener("input", () => {
  setInputError(false);
});
urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleDownload();
  }
});
//# sourceMappingURL=main.js.map
