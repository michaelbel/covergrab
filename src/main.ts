import { downloadAsFile } from "./download";
import { extractVideoId, pickBestThumbnail } from "./youtube";

const urlInput = document.querySelector<HTMLInputElement>("#url-input");
const downloadButton = document.querySelector<HTMLButtonElement>("#download-btn");
const statusEl = document.querySelector<HTMLDivElement>("#status");
const cardEl = document.querySelector<HTMLElement>(".card");

if (!urlInput || !downloadButton || !statusEl || !cardEl) {
  throw new Error("Required DOM elements not found");
}

function setStatus(message: string): void {
  statusEl.textContent = message;
}

function setInputError(hasError: boolean): void {
  urlInput.classList.toggle("input-error", hasError);
  urlInput.setAttribute("aria-invalid", hasError ? "true" : "false");
}

function setLoading(isLoading: boolean): void {
  downloadButton.disabled = isLoading;
  downloadButton.textContent = isLoading ? "Скачиваю…" : "Скачать";
}

async function handleDownload(): Promise<void> {
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
      setStatus("Не нашёл обложку для этого видео.");
      return;
    }

    const filename = `youtube-${videoId}-${best.name}.jpg`;

    try {
      await downloadAsFile(best.url, filename);
      setStatus("");
    } catch {
      setStatus(
        `Не удалось скачать автоматически. Откройте ссылку вручную: ${best.url}`,
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
