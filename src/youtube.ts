export type ThumbnailVariant = {
  name: "maxres" | "sd" | "hq" | "mq" | "default";
  url: string;
};

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function extractVideoId(raw: string): string | null {
  const value = String(raw ?? "").trim();
  if (!value) {
    return null;
  }

  if (VIDEO_ID_REGEX.test(value)) {
    return value;
  }

  let parsed: URL;
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

export function makeCandidates(id: string): ThumbnailVariant[] {
  return [
    { name: "maxres", url: `https://img.youtube.com/vi/${id}/maxresdefault.jpg` },
    { name: "sd", url: `https://img.youtube.com/vi/${id}/sddefault.jpg` },
    { name: "hq", url: `https://img.youtube.com/vi/${id}/hqdefault.jpg` },
    { name: "mq", url: `https://img.youtube.com/vi/${id}/mqdefault.jpg` },
    { name: "default", url: `https://img.youtube.com/vi/${id}/default.jpg` },
  ];
}

export async function loadImageInfo(url: string): Promise<{ width: number; height: number }> {
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

export async function pickBestThumbnail(id: string): Promise<ThumbnailVariant | null> {
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
}
