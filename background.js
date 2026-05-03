// Download Router - Background Service Worker

// ── CONTEXT MENU ─────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-with-router",
    title: "Save Image with Router", // ⬇
    contexts: ["image"],
  });
});

chrome.contextMenus.onClicked.addListener((info, _tab) => {
  if (info.menuItemId === "save-with-router" && info.srcUrl) {
    chrome.downloads.download({ url: info.srcUrl });
  }
});

// ── DOWNLOAD INTERCEPTION ─────────────────────────────────────────────────────
function computeRoutedPath(downloadItem, rules) {
  if (!rules?.length) return null;

  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  const url = downloadItem.url || "";
  const fullFilename = downloadItem.filename || "";
  const baseFilename = fullFilename.split(/[\\/]/).pop() || "";
  const extension = baseFilename.includes(".")
    ? "." + baseFilename.split(".").pop().toLowerCase()
    : "";

  let hostname = "";
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {}

  for (const rule of sorted) {
    if (rule.enabled === false) continue;

    let matched = false;

    if (rule.type === "domain") {
      const ruleHost = String(rule.value || "")
        .replace(/^www\./, "")
        .toLowerCase();
      matched =
        hostname.toLowerCase() === ruleHost ||
        hostname.toLowerCase().endsWith("." + ruleHost);
    } else if (rule.type === "extension") {
      const ruleExt = String(rule.value || "").startsWith(".")
        ? String(rule.value || "").toLowerCase()
        : "." + String(rule.value || "").toLowerCase();
      matched = extension === ruleExt;
    } else if (rule.type === "pattern") {
      try {
        const re = new RegExp(rule.value, "i");
        matched = re.test(baseFilename) || re.test(url);
      } catch {}
    }

    if (!matched) continue;

    let folder = String(rule.folder || "")
      .trim()
      .replace(/\\/g, "/");
    if (folder.startsWith("/")) folder = folder.slice(1);
    if (folder.endsWith("/")) folder = folder.slice(0, -1);

    return folder ? `${folder}/${baseFilename}` : baseFilename;
  }

  return null;
}

chrome.downloads.onCreated.addListener((downloadItem) => {
  if (!chrome.downloads?.rename) return;

  chrome.storage.sync.get({ rules: [] }, ({ rules }) => {
    const newPath = computeRoutedPath(downloadItem, rules);
    if (!newPath) return;

    chrome.downloads.rename(downloadItem.id, newPath, () => {
      void chrome.runtime?.lastError;
    });
  });
});
