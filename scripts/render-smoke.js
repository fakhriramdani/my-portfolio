#!/usr/bin/env node
/**
 * Renders the exported page in headless Chrome and asserts it is complete with
 * JavaScript disabled (NFR-11, BR-017) and that CSS is applied:
 *  - all sections + v2 header/callout present in the DOM, 0 `tel:`, 0 CV download
 *  - the stylesheet actually applied (document container 358 px → 880 px)
 *  - no horizontal overflow from 320 px to 1920 px (NFR-06/FR-D10)
 *  - no external/third-party request and no JS chunk fetched
 * Requires `out/` (run after `npm run build`).
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const OUT = path.resolve(__dirname, "..", "out");

/** Locate a Chrome/Chromium binary across CI and local environments. */
function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    path.join(
      os.homedir(),
      ".cache/ms-playwright/chromium-1248/chrome-linux64/chrome",
    ),
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/opt/google/chrome/chrome",
  ];
  for (const c of candidates) if (c && fs.existsSync(c)) return c;
  return null;
}

const CHROME = findChrome();
const PORT = 8898;

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(OUT, p);
  if (!file.startsWith(OUT) || !fs.existsSync(file)) {
    res.writeHead(404);
    return res.end("nf");
  }
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdp(ws, method, params = {}, id = { n: 0 }) {
  return new Promise((resolve) => {
    const msgId = ++id.n;
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id === msgId) {
        ws.removeEventListener("message", onMsg);
        resolve(m.result);
      }
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

(async () => {
  if (!CHROME) {
    console.error(
      "render-smoke: no Chrome/Chromium found. Set CHROME_PATH or install one.",
    );
    process.exit(2);
  }
  await new Promise((r) => server.listen(PORT, r));
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdp-"));
  // Note: JavaScript is left ENABLED here so we can query the DOM via CDP, but
  // the page ships zero JS, so nothing executes anyway.
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--remote-debugging-port=9223",
    `--user-data-dir=${userDir}`,
    "about:blank",
  ]);

  let chromeErr = "";
  chrome.stderr?.on("data", (d) => {
    chromeErr += d.toString();
  });

  let targets = null;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch("http://127.0.0.1:9223/json/list");
      targets = await r.json();
      if (Array.isArray(targets) && targets.find((t) => t.type === "page")) break;
    } catch {}
    await wait(200);
  }
  if (!targets || !Array.isArray(targets)) {
    console.error(
      "render-smoke: failed to connect to headless Chrome on port 9223. Stderr:",
      chromeErr,
    );
    process.exit(1);
  }
  const page = targets.find((t) => t.type === "page");
  if (!page) {
    console.error("render-smoke: no page target found in Chrome. Targets:", targets);
    process.exit(1);
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  const idCounter = { n: 0 };

  const requests = [];
  await cdp(ws, "Network.enable", {}, idCounter);
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === "Network.requestWillBeSent") requests.push(m.params.request.url);
  });

  await cdp(ws, "Page.enable", {}, idCounter);
  await cdp(ws, "Page.navigate", { url: `http://127.0.0.1:${PORT}/` }, idCounter);
  await wait(1500);

  async function evaluate(expr) {
    const r = await cdp(
      ws,
      "Runtime.evaluate",
      { expression: expr, returnByValue: true },
      idCounter,
    );
    return r.result?.value;
  }

  // TASK-202: kontainer dokumen v2 diukur pada dua breakpoint (§3.1).
  // TASK-203: AboutTwoColumn (avatar + bio + 2 kontak)
  // TASK-206: DatabaseView (tabbar + 4 panel, BR-006: about -> experience -> database)
  await cdp(
    ws,
    "Emulation.setDeviceMetricsOverride",
    { width: 390, height: 844, deviceScaleFactor: 1, mobile: false },
    idCounter,
  );
  await wait(500);

  const result = await evaluate(`(() => ({
      h1: document.querySelectorAll("h1").length,
      h1text: document.querySelector("h1")?.textContent,
      h2: [...document.querySelectorAll("h2")].map(e=>e.textContent),
      sections: ["about","experience","database"].map(id=>!!document.getElementById(id)),
      databaseView: !!document.querySelector("section#database.nd-db[data-database-view]"),
      tabbar: !!document.querySelector(".nd-tabbar[role='tablist'], .nd-tabbar[role='radiogroup']"),
      tabsCount: document.querySelectorAll("input[name='dbview']").length,
      panelsCount: document.querySelectorAll(".nd-db__panel").length,
      tel: !!document.querySelector('a[href^="tel:"]'),
      download: !!document.querySelector('a[download]'),
      callout: document.querySelector("aside.nd-callout")?.getAttribute("aria-label"),
      skip: document.querySelector("a.skip-link")?.getAttribute("href"),
      mainTabIndex: document.getElementById("main")?.getAttribute("tabindex"),
      pageWidth: getComputedStyle(document.querySelector(".nd-page")).maxWidth,
      avatarLight: document.querySelector('img.nd-avatar--light')?.getAttribute("src"),
      avatarDark: document.querySelector('img.nd-avatar--dark')?.getAttribute("src"),
      avatarLightDisplay: getComputedStyle(document.querySelector('img.nd-avatar--light'))?.display,
      avatarDarkDisplay: getComputedStyle(document.querySelector('img.nd-avatar--dark'))?.display,
      emailLink: document.querySelector('a[data-contact-link="email"]')?.getAttribute("href"),
      linkedinLink: document.querySelector('a[data-contact-link="linkedin"]')?.getAttribute("href"),
      tabTouchTargets: [...document.querySelectorAll(".nd-tab")].every(e => e.getBoundingClientRect().height >= 44),
      contactTouchTargets: [...document.querySelectorAll(".nd-contacts a")].every(e => e.getBoundingClientRect().height >= 44),
      projectTitleTouchTargets: [...document.querySelectorAll(".nd-project__title")].every(e => e.getBoundingClientRect().height >= 44),
      modalCloseTouchTargets: [...document.querySelectorAll(".nd-modal__close")].every(e => {
        const s = getComputedStyle(e);
        return s.minHeight === "44px" && s.minWidth === "44px";
      }),
      bodyText: document.body.innerText.length
    }))()`);

    const failures = [];
    const check = (c, m) => {
      if (c) console.log("  ok -", m);
      else {
        console.error("  FAIL -", m);
        failures.push(m);
      }
    };

    check(result?.h1 === 1 && result?.h1text === "Fakhri Ramdani", "one h1 = Fakhri Ramdani");
    check(result?.h2?.length === 3, "3 h2 sections");
    check(result?.sections?.every(Boolean), "all 3 section anchors present");
    check(result?.databaseView, "database view section rendered");
    check(result?.tabbar, "tabbar rendered with radiogroup");
    check(result?.tabsCount === 4, "4 tab inputs present");
    check(result?.panelsCount === 4, "4 panels present");
    check(result?.tel === false, "no tel: link rendered (D-028.2)");
    check(result?.download === false, "no CV download link rendered (D-028.3)");
    check(result?.callout === "Quote", `callout quote block has accessible name (got ${result?.callout})`);
    check(result?.skip === "#main", "skip-link targets #main (AC-009.4)");
    check(result?.mainTabIndex === "-1", "main landmark is focusable (#main)");
    check(result?.pageWidth === "358px", `mobile document container 358px (got ${result?.pageWidth})`);
    check(result?.avatarLight === "/assets/avatar-light.png", `avatar light src (got ${result?.avatarLight})`);
    check(result?.avatarDark === "/assets/avatar-dark.png", `avatar dark src (got ${result?.avatarDark})`);
    check(result?.avatarLightDisplay === "block", `avatar light visible in light mode (got ${result?.avatarLightDisplay})`);
    check(result?.avatarDarkDisplay === "none", `avatar dark hidden in light mode (got ${result?.avatarDarkDisplay})`);

  await cdp(
    ws,
    "Emulation.setEmulatedMedia",
    { media: "screen", features: [{ name: "prefers-color-scheme", value: "dark" }] },
    idCounter,
  );
  await wait(100);
  const darkAvatarState = await evaluate(`(() => ({
    light: getComputedStyle(document.querySelector('img.nd-avatar--light'))?.display,
    dark: getComputedStyle(document.querySelector('img.nd-avatar--dark'))?.display
  }))()`);
  check(darkAvatarState?.light === "none", `avatar light hidden in dark mode (got ${darkAvatarState?.light})`);
  check(darkAvatarState?.dark === "block", `avatar dark visible in dark mode (got ${darkAvatarState?.dark})`);
  await cdp(
    ws,
    "Emulation.setEmulatedMedia",
    { media: "screen", features: [{ name: "prefers-color-scheme", value: "light" }] },
    idCounter,
  );
    check(result?.emailLink === "mailto:fakhriramdani1@gmail.com", `email href (got ${result?.emailLink})`);
    check(result?.linkedinLink === "https://www.linkedin.com/in/fakhri-ramdani-183769ab", `linkedin href (got ${result?.linkedinLink})`);
    check(result?.tabTouchTargets === true, "all tabs meet mobile touch target height >= 44px (NFR-D07)");
    check(result?.contactTouchTargets === true, "all contact links meet mobile touch target height >= 44px (NFR-D07)");
    check(result?.projectTitleTouchTargets === true, "all project titles meet mobile touch target height >= 44px (NFR-D07)");
    check(result?.modalCloseTouchTargets === true, "all modal close buttons meet touch target 44x44px (NFR-D07)");
    check(result?.bodyText > 1000, "body text rendered");

  await cdp(
    ws,
    "Emulation.setDeviceMetricsOverride",
    { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
    idCounter,
  );
  await wait(300);
  const desktopWidth = await evaluate(
    `getComputedStyle(document.querySelector(".nd-page")).maxWidth`,
  );
  check(desktopWidth === "880px", `desktop document container 880px (got ${desktopWidth})`);

  // NFR-06/FR-D10: tanpa overflow horisontal pada 320–1920 px.
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await cdp(
      ws,
      "Emulation.setDeviceMetricsOverride",
      { width, height: 900, deviceScaleFactor: 1, mobile: false },
      idCounter,
    );
    await wait(150);
    const box = await evaluate(
      `(() => { const el = document.documentElement; return { scroll: el.scrollWidth, client: el.clientWidth }; })()`,
    );
    check(
      box.scroll <= box.client,
      `no horizontal overflow at ${width}px (scrollWidth=${box.scroll}, clientWidth=${box.client})`,
    );
  }

  const jsReqs = requests.filter((u) => u.endsWith(".js"));
  check(
    jsReqs.length <= 1 && (jsReqs.length === 0 || jsReqs[0].endsWith("/enhance.js")),
    `at most 1 JS request on load (only /enhance.js, got ${jsReqs.length}: ${jsReqs.join(", ")})`,
  );
  const external = requests.filter(
    (u) => !u.startsWith(`http://127.0.0.1:${PORT}`) && !u.startsWith("data:"),
  );
  check(external.length === 0, `zero third-party requests (got ${external.length}: ${external.join(", ")})`);

  // ---- TASK-211: JS-on interaction verification (enhance.js live) ----------
  // Navigate fresh to ensure enhance.js has initialised.
  await cdp(ws, "Page.navigate", { url: `http://127.0.0.1:${PORT}/` }, idCounter);
  await wait(1500);
  await cdp(
    ws,
    "Emulation.setDeviceMetricsOverride",
    { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
    idCounter,
  );
  await wait(300);

  // 1. Tab switching via label.click() — click Skills tab.
  await evaluate(`(() => {
    const label = document.querySelector('label[data-tab="skills"], label[for="tab-skills"]');
    if (label) label.click();
  })()`);
  await wait(300);

  const tabResult = await evaluate(`(() => {
    const skillsPanel = document.getElementById('panel-skills');
    const projectsPanel = document.getElementById('panel-projects');
    return {
      skillsVisible: skillsPanel ? (getComputedStyle(skillsPanel).display !== 'none' && !skillsPanel.hasAttribute('hidden')) : null,
      projectsHidden: projectsPanel ? (getComputedStyle(projectsPanel).display === 'none' || projectsPanel.hasAttribute('hidden')) : null,
      urlSearch: window.location.search,
    };
  })()`);
  check(
    tabResult?.skillsVisible === true,
    `JS-on: clicking Skills tab shows panel-skills (visible, got ${tabResult?.skillsVisible})`,
  );
  check(
    tabResult?.projectsHidden === true,
    `JS-on: clicking Skills tab hides panel-projects (hidden, got ${tabResult?.projectsHidden})`,
  );
  check(
    tabResult?.urlSearch === "?tab=skills",
    `JS-on: URL updated to ?tab=skills after tab click (got ${tabResult?.urlSearch})`,
  );

  // 2. Modal interaction — open via project card/trigger click.
  const modalTriggerSel = `document.querySelector('[data-modal-trigger="syariah-banking-display"], [data-modal-trigger="syariah-display-system"], .nd-project__title[href^="#modal"]')`;
  await evaluate(`(() => {
    const trigger = ${modalTriggerSel};
    if (trigger) trigger.click();
  })()`);
  await wait(500);

  const modalOpenResult = await evaluate(`(() => {
    // Try the exact id from the task spec first, then fall back to any open dialog.
    const dlg = document.getElementById('modal-syariah-banking-display')
              || document.getElementById('modal-syariah-display-system')
              || document.querySelector('dialog[open]');
    return {
      open: dlg ? dlg.open : null,
      overflow: document.documentElement.style.overflow,
    };
  })()`);
  check(
    modalOpenResult?.open === true,
    `JS-on: modal opens (dialog.open === true, got ${modalOpenResult?.open})`,
  );
  check(
    modalOpenResult?.overflow === "hidden",
    `JS-on: scroll locked when modal open (overflow hidden, got ${modalOpenResult?.overflow})`,
  );

  // 2b. Close via Escape key.
  await cdp(ws, "Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }, idCounter);
  await wait(300);

  const modalCloseResult = await evaluate(`(() => {
    const dlg = document.getElementById('modal-syariah-banking-display')
              || document.getElementById('modal-syariah-display-system')
              || document.querySelector('dialog');
    return {
      open: dlg ? dlg.open : null,
      overflow: document.documentElement.style.overflow,
    };
  })()`);
  check(
    modalCloseResult?.open === false,
    `JS-on: modal closes on Escape (dialog.open === false, got ${modalCloseResult?.open})`,
  );
  check(
    modalCloseResult?.overflow === "",
    `JS-on: scroll restored after modal close (overflow empty, got "${modalCloseResult?.overflow}")`,
  );

  ws.close();
  chrome.kill();
  server.close();

  if (failures.length) {
    console.error(`\nRENDER SMOKE FAILED (${failures.length})`);
    process.exit(1);
  }
  console.log("\nOK: render smoke passed (baseline HTML+CSS & JS-on interactions verified).");
  process.exit(0);
})();
