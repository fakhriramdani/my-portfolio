#!/usr/bin/env node
/**
 * probe-token-foundation.js — bukti runtime TASK-201 (fondasi token, tema, font).
 * Menjalankan `out/` lewat HTTP lokal, lalu mengukur di Chromium:
 *  · keempat bobot Inter benar-benar dimuat (inter-700.woff2 diminta & 200)
 *  · mode gelap via prefers-color-scheme dan via hook [data-theme]
 *  · warna kanvas/teks/tautan = nilai token v2
 * Output: qa/evidence/tech-v2/token-foundation.json
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "out");
const EVIDENCE = path.join(ROOT, "qa", "evidence", "tech-v2");
const PORT = 8899;

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".ico": "image/x-icon",
};

(async () => {
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
  await new Promise((resolve) => server.listen(PORT, resolve));

  const browser = await chromium.launch();
  const requests = [];
  const results = {};

  try {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    page.on("response", (response) => {
      if (response.url().endsWith(".woff2")) {
        requests.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "load" });

    results["fonts"] = await page.evaluate(async () => {
      const loaded = {};
      for (const weight of [400, 500, 600, 700]) {
        await document.fonts.load(`${weight} 16px Inter`);
        loaded[weight] = document.fonts.check(`${weight} 16px Inter`);
      }
      return loaded;
    });

    const theme = async (label, run) => {
      await run();
      results[label] = await page.evaluate(() => {
        const body = getComputedStyle(document.body);
        const link = document.querySelector("a[href^='mailto']");
        return {
          dataTheme: document.documentElement.getAttribute("data-theme"),
          canvas: body.backgroundColor,
          text: body.color,
          link: link ? getComputedStyle(link).color : null,
          fontFamily: body.fontFamily.split(",")[0],
          htmlColorScheme: getComputedStyle(document.documentElement)
            .colorScheme,
        };
      });
    };

    await theme("light_media_no_hook", async () => {});
    await theme("dark_media_no_hook", async () => {
      await page.emulateMedia({ colorScheme: "dark" });
    });
    await theme("light_media_with_dark_hook", async () => {
      await page.emulateMedia({ colorScheme: "light" });
      await page.evaluate(() =>
        document.documentElement.setAttribute("data-theme", "dark"),
      );
    });
    await theme("dark_media_with_light_hook", async () => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.evaluate(() =>
        document.documentElement.setAttribute("data-theme", "light"),
      );
    });
    await page.emulateMedia({ colorScheme: "light" });
    await page.evaluate(() =>
      document.documentElement.removeAttribute("data-theme"),
    );

    const meta = await page.evaluate(() =>
      document
        .querySelector('meta[name="color-scheme"]')
        ?.getAttribute("content"),
    );

    // warna kanvas pada kedua mode harus sama persis dengan token §5.2
    const expected = {
      light_canvas: "#ffffff",
      dark_canvas: "#191919",
      light_link: "#1d6ec0",
      dark_link: "#529cca",
    };
    const rgb = (hex) =>
      `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
    const checks = {
      meta_color_scheme: meta === "light dark",
      fonts_400_500_600_700: Object.values(results.fonts).every(Boolean),
      inter_700_requested_200: requests.some(
        (r) => r.url.endsWith("/fonts/inter-700.woff2") && r.status === 200,
      ),
      light_canvas:
        results.light_media_no_hook.canvas === rgb(expected.light_canvas),
      dark_canvas:
        results.dark_media_no_hook.canvas === rgb(expected.dark_canvas),
      dark_canvas_via_hook:
        results.light_media_with_dark_hook.canvas === rgb(expected.dark_canvas),
      light_canvas_via_hook:
        results.dark_media_with_light_hook.canvas ===
        rgb(expected.light_canvas),
      light_link_token:
        results.light_media_no_hook.link === rgb(expected.light_link),
      dark_link_token:
        results.dark_media_no_hook.link === rgb(expected.dark_link),
      font_family_inter: results.light_media_no_hook.fontFamily === "Inter",
      html_color_scheme:
        results.light_media_no_hook.htmlColorScheme === "light dark",
    };

    const evidence = {
      task: "TASK-201",
      generatedAt: new Date().toISOString(),
      artefacts: {
        fonts: [400, 500, 600, 700].map((w) => ({
          file: `public/fonts/inter-${w}.woff2`,
          bytes: fs.statSync(
            path.join(ROOT, "public", "fonts", `inter-${w}.woff2`),
          ).size,
        })),
        fontRequests: requests,
      },
      measurements: results,
      expected,
      checks,
      passed: Object.values(checks).every(Boolean),
    };

    fs.mkdirSync(EVIDENCE, { recursive: true });
    fs.writeFileSync(
      path.join(EVIDENCE, "token-foundation.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
    );

    for (const [name, ok] of Object.entries(checks)) {
      console.log(`  ${ok ? "ok  " : "FAIL"} - ${name}`);
    }
    console.log(`\nfonts loaded: ${JSON.stringify(results.fonts)}`);
    console.log(`woff2 responses: ${JSON.stringify(requests)}`);
    console.log(
      `light canvas ${results.light_media_no_hook.canvas} · dark canvas ${results.dark_media_no_hook.canvas}`,
    );
    console.log(`evidence: qa/evidence/tech-v2/token-foundation.json`);
    await browser.close();
    server.close();
    process.exit(evidence.passed ? 0 : 1);
  } catch (error) {
    await browser.close();
    server.close();
    throw error;
  }
})();
