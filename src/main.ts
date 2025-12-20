import { downloadAsFile, openInNewTab } from "./download";
import { extractVideoId, pickBestThumbnail } from "./youtube";

const urlInput = document.querySelector<HTMLInputElement>("#url-input");
const downloadButton = document.querySelector<HTMLButtonElement>("#download-btn");
const statusEl = document.querySelector<HTMLDivElement>("#status");
const previewEl = document.querySelector<HTMLImageElement>("#preview");
const cardEl = document.querySelector<HTMLElement>(".card");

if (!urlInput || !downloadButton || !statusEl || !previewEl || !cardEl) {
  throw new Error("Required DOM elements not found");
}

function setStatus(message: string): void {
  statusEl.textContent = message;
}

function setLoading(isLoading: boolean): void {
  downloadButton.disabled = isLoading;
  downloadButton.textContent = isLoading ? "Скачиваю…" : "Скачать";
}

async function handleDownload(): Promise<void> {
  previewEl.classList.remove("is-visible");
  setStatus("");
  cardEl.classList.add("is-animating");
  window.setTimeout(() => {
    cardEl.classList.remove("is-animating");
  }, 420);

  const videoId = extractVideoId(urlInput.value);
  if (!videoId) {
    setStatus(
      "Не смог распознать ссылку или videoId.\nПример: https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    return;
  }

  setLoading(true);

  try {
    const best = await pickBestThumbnail(videoId);
    if (!best) {
      setStatus("Не нашёл обложку для этого видео.");
      return;
    }

    previewEl.src = best.url;
    previewEl.classList.add("is-visible");

    const filename = `youtube-${videoId}-${best.name}.jpg`;

    try {
      await downloadAsFile(best.url, filename);
      setStatus("");
    } catch {
      openInNewTab(best.url);
      setStatus(
        `Открыл в новой вкладке: ${best.name}\nЕсли браузер не дал скачать автоматически — сохраните картинку вручную.`,
      );
    }
  } finally {
    setLoading(false);
  }
}

downloadButton.addEventListener("click", handleDownload);
urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleDownload();
  }
});
