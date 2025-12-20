const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
const urlInput = document.querySelector("#url-input");
const downloadButton = document.querySelector("#download-btn");
const statusEl = document.querySelector("#status");
const cardEl = document.querySelector(".card");

if (!urlInput || !downloadButton || !statusEl || !cardEl) {
  throw new Error("Required DOM elements not found");
}

const setStatus = (message) => {
  statusEl.textContent = message;
};

const setLoading = (isLoading) => {
  downloadButton.disabled = isLoading;
  downloadButton.textContent = isLoading ? "Скачиваю…" : "Скачать";
};

const extractVideoId = (raw) => {
  const value = String(raw ?? "").trim();
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
};

const makeCandidates = (id) => [
  { name: "maxres", url: `https://img.youtube.com/vi/${id}/maxresdefault.jpg` },
  { name: "sd", url: `https://img.youtube.com/vi/${id}/sddefault.jpg` },
  { name: "hq", url: `https://img.youtube.com/vi/${id}/hqdefault.jpg` },
  { name: "mq", url: `https://img.youtube.com/vi/${id}/mqdefault.jpg` },
  { name: "default", url: `https://img.youtube.com/vi/${id}/default.jpg` },
];

const loadImageInfo = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => reject(new Error("Image load failed"));
    const cacheBust = url.includes("?") ? "&" : "?";
    img.src = `${url}${cacheBust}cacheBust=${Date.now()}`;
  });

const pickBestThumbnail = async (id) => {
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
      // try next
    }
  }

  return null;
};

const downloadAsFile = async (url, filename) => {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(objectUrl);
};

const openInNewTab = (url) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

const handleDownload = async () => {
  setStatus("");
  cardEl.classList.add("is-animating");
  window.setTimeout(() => {
    cardEl.classList.remove("is-animating");
  }, 420);

  const videoId = extractVideoId(urlInput.value);
  if (!videoId) {
    setStatus(
      "Не смог распознать ссылку или videoId.\nПример: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    );
    return;
  }

  const fallbackWindow = window.open("about:blank", "_blank");
  if (fallbackWindow) {
    fallbackWindow.opener = null;
    fallbackWindow.document.title = "Подготовка загрузки…";
    fallbackWindow.document.body.innerHTML =
      "<p style='font-family: sans-serif; padding: 24px;'>Готовлю обложку…</p>";
  }

  setLoading(true);

  try {
    const best = await pickBestThumbnail(videoId);
    if (!best) {
      setStatus("Не нашёл обложку для этого видео.");
      fallbackWindow?.close();
      return;
    }

    const filename = `youtube-${videoId}-${best.name}.jpg`;

    try {
      await downloadAsFile(best.url, filename);
      setStatus("");
      fallbackWindow?.close();
    } catch {
      if (fallbackWindow) {
        fallbackWindow.location.href = best.url;
      } else {
        openInNewTab(best.url);
      }
      setStatus(
        `Открыл в новой вкладке: ${best.name}\nЕсли браузер не дал скачать автоматически — сохраните картинку вручную.`
      );
    }
  } finally {
    setLoading(false);
  }
};

downloadButton.addEventListener("click", handleDownload);
urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleDownload();
  }
});
