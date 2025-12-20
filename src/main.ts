import { downloadAsFile, openInNewTab } from "./download";
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

function setLoading(isLoading: boolean): void {
  downloadButton.disabled = isLoading;
  downloadButton.textContent = isLoading ? "Скачиваю…" : "Скачать";
}

async function handleDownload(): Promise<void> {
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
