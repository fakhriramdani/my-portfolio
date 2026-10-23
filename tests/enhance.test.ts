/**
 * tests/enhance.test.ts — Unit & integration tests for public/enhance.js and scripts/check-enhance.js
 * (TASK-209, TECH-SPEC v2.0 §4.5, §4.7, ADR-0005, ADR-0006).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {
  checkEnhanceFile,
  checkEnhanceSource,
  MAX_GZIP_BYTES,
  FORBIDDEN_RULES,
} from "../scripts/check-enhance.js";

const ROOT = path.resolve(__dirname, "..");
const ENHANCE_PATH = path.join(ROOT, "public", "enhance.js");

// ============================================================================
// PART 1: check-enhance.js hygiene guards and size budget
// ============================================================================

test("check-enhance: passes on untouched public/enhance.js (positive control)", () => {
  assert.ok(fs.existsSync(ENHANCE_PATH), "public/enhance.js must exist");
  const result = checkEnhanceFile(ENHANCE_PATH);
  assert.equal(result.ok, true, `Expected check to pass, but got errors: ${result.errors.join(", ")}`);
  assert.equal(result.errors.length, 0);
  assert.ok(result.gzipBytes <= MAX_GZIP_BYTES, `gzip size ${result.gzipBytes} <= ${MAX_GZIP_BYTES}`);
  assert.ok(result.gzipBytes > 500, "enhance.js should have non-trivial size");
});

test("check-enhance: fails when file is not found", () => {
  const result = checkEnhanceFile(path.join(ROOT, "public", "nonexistent-script.js"));
  assert.equal(result.ok, false);
  assert.match(result.errors[0]!, /\[not_found\]/);
});

test("check-enhance: fails on syntax error", () => {
  const result = checkEnhanceSource("function bad( {", "bad-syntax.js");
  assert.equal(result.ok, false);
  assert.match(result.errors[0]!, /\[syntax\]/);
});

test("check-enhance: fails when gzip size exceeds 5 KB budget", () => {
  // Generate random incompressible payload > 5KB
  const largeSource = "var padding = '" + "x".repeat(10000) + "';" +
    Array.from({ length: 6000 }, (_, i) => `var v${i} = ${i * 3};`).join("\n");
  const result = checkEnhanceSource(largeSource, "bloated.js");
  assert.equal(result.ok, false);
  assert.match(result.errors[0]!, /\[size\]/);
});

test("check-enhance: rejects eval and Function constructor", () => {
  const evalCheck = checkEnhanceSource("var x = eval('1+1');", "eval-test.js");
  assert.equal(evalCheck.ok, false);
  assert.ok(evalCheck.errors.some((e) => e.includes("[forbidden:eval]")));

  const fnCheck1 = checkEnhanceSource("var fn = new Function('a', 'return a');", "fn-test.js");
  assert.equal(fnCheck1.ok, false);
  assert.ok(fnCheck1.errors.some((e) => e.includes("[forbidden:new Function]")));

  const fnCheck2 = checkEnhanceSource("var fn = Function('return 1');", "fn2-test.js");
  assert.equal(fnCheck2.ok, false);
  assert.ok(fnCheck2.errors.some((e) => e.includes("[forbidden:new Function]")));
});

test("check-enhance: rejects innerHTML and outerHTML", () => {
  const innerCheck = checkEnhanceSource("el.innerHTML = '<span>text</span>';", "inner-test.js");
  assert.equal(innerCheck.ok, false);
  assert.ok(innerCheck.errors.some((e) => e.includes("[forbidden:innerHTML/outerHTML]")));

  const outerCheck = checkEnhanceSource("el.outerHTML = '<div/>';", "outer-test.js");
  assert.equal(outerCheck.ok, false);
  assert.ok(outerCheck.errors.some((e) => e.includes("[forbidden:innerHTML/outerHTML]")));
});

test("check-enhance: rejects external URLs", () => {
  const httpCheck = checkEnhanceSource("var url = 'http://api.example.com';", "http-test.js");
  assert.equal(httpCheck.ok, false);
  assert.ok(httpCheck.errors.some((e) => e.includes("[forbidden:external URLs]")));

  const httpsCheck = checkEnhanceSource("var url = 'https://analytics.example.com';", "https-test.js");
  assert.equal(httpsCheck.ok, false);
  assert.ok(httpsCheck.errors.some((e) => e.includes("[forbidden:external URLs]")));

  const protoRelCheck = checkEnhanceSource("var url = '//cdn.example.com/lib.js';", "proto-test.js");
  assert.equal(protoRelCheck.ok, false);
  assert.ok(protoRelCheck.errors.some((e) => e.includes("[forbidden:external URLs]")));
});

test("check-enhance: rejects network request APIs", () => {
  const fetchCheck = checkEnhanceSource("fetch('/endpoint');", "fetch-test.js");
  assert.equal(fetchCheck.ok, false);
  assert.ok(fetchCheck.errors.some((e) => e.includes("[forbidden:network requests (fetch)]")));

  const xhrCheck = checkEnhanceSource("var req = new XMLHttpRequest();", "xhr-test.js");
  assert.equal(xhrCheck.ok, false);
  assert.ok(xhrCheck.errors.some((e) => e.includes("[forbidden:network requests (XMLHttpRequest)]")));

  const wsCheck = checkEnhanceSource("var ws = new WebSocket('ws://localhost');", "ws-test.js");
  assert.equal(wsCheck.ok, false);
  assert.ok(wsCheck.errors.some((e) => e.includes("[forbidden:network requests (WebSocket/EventSource/sendBeacon)]")));

  const esCheck = checkEnhanceSource("var es = new EventSource('/stream');", "es-test.js");
  assert.equal(esCheck.ok, false);
  assert.ok(esCheck.errors.some((e) => e.includes("[forbidden:network requests (WebSocket/EventSource/sendBeacon)]")));

  const beaconCheck = checkEnhanceSource("navigator.sendBeacon('/log', data);", "beacon-test.js");
  assert.equal(beaconCheck.ok, false);
  assert.ok(beaconCheck.errors.some((e) => e.includes("[forbidden:network requests (WebSocket/EventSource/sendBeacon)]")));
});

test("check-enhance: rejects client storage and cookies", () => {
  const localCheck = checkEnhanceSource("localStorage.setItem('k', 'v');", "local-test.js");
  assert.equal(localCheck.ok, false);
  assert.ok(localCheck.errors.some((e) => e.includes("[forbidden:storage (localStorage/sessionStorage)]")));

  const sessionCheck = checkEnhanceSource("sessionStorage.getItem('x');", "session-test.js");
  assert.equal(sessionCheck.ok, false);
  assert.ok(sessionCheck.errors.some((e) => e.includes("[forbidden:storage (localStorage/sessionStorage)]")));

  const cookieCheck = checkEnhanceSource("var c = document.cookie;", "cookie-test.js");
  assert.equal(cookieCheck.ok, false);
  assert.ok(cookieCheck.errors.some((e) => e.includes("[forbidden:storage (cookies)]")));

  const idbCheck = checkEnhanceSource("indexedDB.open('db');", "idb-test.js");
  assert.equal(idbCheck.ok, false);
  assert.ok(idbCheck.errors.some((e) => e.includes("[forbidden:storage (indexedDB)]")));
});

test("check-enhance: all rules in FORBIDDEN_RULES are covered", () => {
  assert.equal(FORBIDDEN_RULES.length, 10);
});

// ============================================================================
// PART 2: Functional DOM execution tests for public/enhance.js
// ============================================================================

interface MockEvent {
  type: string;
  bubbles: boolean;
  cancelable: boolean;
  defaultPrevented: boolean;
  target: MockElementWrapper | null;
  currentTarget: MockElementWrapper | null;
  key?: string;
  preventDefault(): void;
}

interface MockEventOptions {
  bubbles?: boolean;
  cancelable?: boolean;
  key?: string;
}

type MockEventListener = (e: MockEvent) => void;

interface MockElementWrapper {
  tagName: string;
  id: string;
  open?: boolean;
  checked?: boolean;
  value: string;
  classList: {
    contains(c: string): boolean;
    add(c: string): void;
    remove(c: string): void;
  };
  getAttribute(k: string): string | null;
  setAttribute(k: string, v: string): void;
  removeAttribute(k: string): void;
  hasAttribute(k: string): boolean;
  closest(sel: string): MockElementWrapper | null;
  querySelector(sel: string): MockElementWrapper | null;
  querySelectorAll(sel: string): MockElementWrapper[];
  focus(): void;
  showModal(): void;
  close(): void;
  addEventListener(type: string, listener: MockEventListener, useCapture?: boolean): void;
  removeEventListener(type: string, listener: MockEventListener): void;
  dispatchEvent(event: MockEvent): boolean;
  _raw: MockNode;
}

interface MockNode {
  tagName: string;
  id: string;
  classList: Set<string>;
  attributes: Map<string, string>;
  children: MockNode[];
  parent: MockNode | null;
  checked?: boolean;
  value?: string;
  open?: boolean;
  eventListeners: Map<string, Array<{ listener: MockEventListener; useCapture?: boolean }>>;
  focusCount?: number;
  showModalCount?: number;
  closeCount?: number;
}

function createMockElement(
  tagName: string,
  attrs: Record<string, string> = {},
  extra: Partial<MockNode> = {},
): MockNode {
  const attributes = new Map<string, string>();
  for (const [k, v] of Object.entries(attrs)) {
    attributes.set(k, v);
  }
  const classList = new Set<string>();
  if (attrs.class) {
    attrs.class.split(/\s+/).filter(Boolean).forEach((c) => classList.add(c));
  }

  const el: MockNode = {
    tagName: tagName.toUpperCase(),
    id: attrs.id || "",
    classList,
    attributes,
    children: [],
    parent: null,
    eventListeners: new Map(),
    focusCount: 0,
    showModalCount: 0,
    closeCount: 0,
    ...extra,
  };
  return el;
}

function appendChild(parent: MockNode, child: MockNode): void {
  child.parent = parent;
  parent.children.push(child);
}

function matchesSelector(el: MockNode, selector: string): boolean {
  if (selector === "dialog[open]") {
    return el.tagName === "DIALOG" && !!el.open;
  }
  if (selector.startsWith("#")) {
    return el.id === selector.slice(1);
  }
  if (selector.startsWith(".")) {
    return el.classList.has(selector.slice(1));
  }
  if (selector.startsWith("[")) {
    const attrMatch = selector.match(/^\[([a-zA-Z0-9_-]+)(?:="?([^"\]]*)"?)?\]$/);
    if (attrMatch) {
      const attr = attrMatch[1]!;
      const val = attrMatch[2];
      if (!el.attributes.has(attr)) return false;
      if (val !== undefined) return el.attributes.get(attr) === val;
      return true;
    }
  }
  if (selector.includes(".")) {
    const [tag, cls] = selector.split(".");
    return (
      (!tag || el.tagName === tag.toUpperCase()) &&
      (!cls || el.classList.has(cls))
    );
  }
  if (selector.includes("[")) {
    const tag = selector.slice(0, selector.indexOf("["));
    const attrPart = selector.slice(selector.indexOf("["));
    const tagMatch = !tag || el.tagName === tag.toUpperCase();
    return tagMatch && matchesSelector(el, attrPart);
  }
  return el.tagName === selector.toUpperCase();
}

function querySelector(root: MockNode, selector: string): MockNode | null {
  const parts = selector.split(",").map((s) => s.trim());
  for (const part of parts) {
    const found = querySelectorSingle(root, part);
    if (found) return found;
  }
  return null;
}

function querySelectorSingle(root: MockNode, selector: string): MockNode | null {
  for (const child of root.children) {
    if (matchesSelector(child, selector)) return child;
    const found = querySelectorSingle(child, selector);
    if (found) return found;
  }
  return null;
}

function querySelectorAll(root: MockNode, selector: string): MockNode[] {
  const results: MockNode[] = [];
  const parts = selector.split(",").map((s) => s.trim());

  function search(node: MockNode) {
    for (const child of node.children) {
      if (parts.some((p) => matchesSelector(child, p))) {
        results.push(child);
      }
      search(child);
    }
  }
  search(root);
  return results;
}

function createDOMEnvironment(initialUrl = "/?tab=projects") {
  const urlObj = new URL(initialUrl, "https://example.com");

  const docEl = createMockElement("html");
  const bodyEl = createMockElement("body");
  appendChild(docEl, bodyEl);

  const documentListeners = new Map<string, Array<{ listener: MockEventListener; useCapture?: boolean }>>();
  let activeElement: MockElementWrapper | null = null;

  const nodeWrapperMap = new WeakMap<MockNode, MockElementWrapper>();

  function wrapElement(node: MockNode): MockElementWrapper {
    if (nodeWrapperMap.has(node)) {
      return nodeWrapperMap.get(node)!;
    }
    const wrapped: MockElementWrapper = {
      tagName: node.tagName,
      id: node.id,
      get open() {
        return node.open;
      },
      set open(v: boolean | undefined) {
        node.open = v;
      },
      get checked() {
        return node.checked;
      },
      set checked(v: boolean | undefined) {
        node.checked = v;
      },
      get value() {
        return node.value || node.attributes.get("value") || "";
      },
      set value(v: string) {
        node.value = v;
      },
      classList: {
        contains: (c: string) => node.classList.has(c),
        add: (c: string) => node.classList.add(c),
        remove: (c: string) => node.classList.delete(c),
      },
      getAttribute: (k: string) => node.attributes.get(k) || null,
      setAttribute: (k: string, v: string) => {
        node.attributes.set(k, String(v));
        if (k === "id") node.id = String(v);
        if (k === "class") {
          node.classList.clear();
          String(v).split(/\s+/).filter(Boolean).forEach((c) => node.classList.add(c));
        }
      },
      removeAttribute: (k: string) => node.attributes.delete(k),
      hasAttribute: (k: string) => node.attributes.has(k),
      closest: (sel: string) => {
        let cur: MockNode | null = node;
        while (cur) {
          if (matchesSelector(cur, sel)) return wrapElement(cur);
          cur = cur.parent;
        }
        return null;
      },
      querySelector: (sel: string) => {
        const found = querySelector(node, sel);
        return found ? wrapElement(found) : null;
      },
      querySelectorAll: (sel: string) => {
        return querySelectorAll(node, sel).map(wrapElement);
      },
      focus: () => {
        node.focusCount = (node.focusCount || 0) + 1;
        activeElement = wrapped;
      },
      showModal: () => {
        node.showModalCount = (node.showModalCount || 0) + 1;
        node.open = true;
      },
      close: () => {
        node.closeCount = (node.closeCount || 0) + 1;
        node.open = false;
        wrapped.dispatchEvent(new CustomEventMock("close"));
      },
      addEventListener: (type: string, listener: MockEventListener, useCapture?: boolean) => {
        if (!node.eventListeners.has(type)) {
          node.eventListeners.set(type, []);
        }
        node.eventListeners.get(type)!.push({ listener, useCapture });
      },
      removeEventListener: (type: string, listener: MockEventListener) => {
        const list = node.eventListeners.get(type);
        if (list) {
          node.eventListeners.set(type, list.filter((item) => item.listener !== listener));
        }
      },
      dispatchEvent: (event: MockEvent) => {
        Object.defineProperty(event, "target", { value: wrapped, configurable: true, writable: true });
        Object.defineProperty(event, "currentTarget", { value: wrapped, configurable: true, writable: true });

        // Capture phase on document
        const docCaptures = (documentListeners.get(event.type) || []).filter((h) => h.useCapture);
        for (const h of docCaptures) {
          h.listener(event);
        }

        // Target phase
        const listeners = node.eventListeners.get(event.type) || [];
        for (const { listener } of listeners) {
          listener(event);
        }

        // Bubble phase to parent up to body/doc
        if (event.bubbles) {
          let p = node.parent;
          while (p) {
            const pWrapped = wrapElement(p);
            Object.defineProperty(event, "currentTarget", { value: pWrapped, configurable: true, writable: true });
            const pListeners = p.eventListeners.get(event.type) || [];
            for (const { listener, useCapture } of pListeners) {
              if (!useCapture) listener(event);
            }
            p = p.parent;
          }

          // Document bubble
          const docBubbles = (documentListeners.get(event.type) || []).filter((h) => !h.useCapture);
          for (const h of docBubbles) {
            h.listener(event);
          }
        }
        return !event.defaultPrevented;
      },
      _raw: node,
    };
    nodeWrapperMap.set(node, wrapped);
    return wrapped;
  }

  // Build Tabbar DOM
  const tabbar = createMockElement("div", { class: "nd-tabbar", "data-tabbar": "", role: "radiogroup" });
  appendChild(bodyEl, tabbar);

  const tabIds = ["projects", "skills", "education", "language"];
  for (const id of tabIds) {
    const input = createMockElement("input", {
      type: "radio",
      name: "dbview",
      id: `tab-${id}`,
      value: id,
      class: "nd-sr-only",
      "data-tab-input": "",
    }, { checked: id === "projects", value: id });
    appendChild(tabbar, input);
  }

  for (const id of tabIds) {
    const label = createMockElement("label", {
      class: "nd-tab",
      for: `tab-${id}`,
      "data-tab": id,
    });
    appendChild(tabbar, label);
  }

  // Build Panels
  for (const id of tabIds) {
    const panel = createMockElement("div", {
      class: "nd-db__panel",
      id: `panel-${id}`,
      "data-tab-panel": id,
      "aria-labelledby": `tab-${id}`,
      ...(id !== "projects" ? { hidden: "" } : {}),
    });
    appendChild(bodyEl, panel);
  }

  // Build Project Cards and Modals
  const projectIds = ["syariah-display-system", "loan-system-revamp"];
  for (const pid of projectIds) {
    const card = createMockElement("article", {
      class: "nd-card nd-project",
      "data-project-card": "",
      "data-project-id": pid,
    });
    const trigger = createMockElement("a", {
      class: "nd-project__title",
      href: `#modal-${pid}`,
      "data-modal-trigger": pid,
    });
    appendChild(card, trigger);
    appendChild(bodyEl, card);

    const dialog = createMockElement("dialog", {
      class: "nd-modal",
      id: `modal-${pid}`,
      "data-modal": pid,
      "aria-modal": "true",
    });
    const content = createMockElement("div", { class: "nd-modal__content" });
    const closeBtn = createMockElement("a", {
      class: "nd-modal__close",
      href: "#database",
      "data-modal-close": "",
    });
    appendChild(content, closeBtn);
    appendChild(dialog, content);
    appendChild(bodyEl, dialog);
  }

  class CustomEventMock implements MockEvent {
    type: string;
    bubbles: boolean;
    cancelable: boolean;
    defaultPrevented: boolean;
    target: MockElementWrapper | null;
    currentTarget: MockElementWrapper | null;
    key?: string;

    constructor(type: string, opts: MockEventOptions = {}) {
      this.type = type;
      this.bubbles = !!opts.bubbles;
      this.cancelable = !!opts.cancelable;
      this.defaultPrevented = false;
      this.target = null;
      this.currentTarget = null;
      if (opts.key) this.key = opts.key;
    }

    preventDefault() {
      this.defaultPrevented = true;
    }
  }

  const documentStyle: Record<string, string> = {
    overflow: "",
    scrollbarGutter: "",
  };

  const mockLocation = {
    search: urlObj.search,
    pathname: urlObj.pathname,
    hash: urlObj.hash,
  };

  const mockHistory = {
    replaceState: (_data: unknown, _unused: string, newUrl: string) => {
      const u = new URL(newUrl, "https://example.com" + mockLocation.pathname);
      mockLocation.search = u.search;
      mockLocation.pathname = u.pathname;
      mockLocation.hash = u.hash;
    },
  };

  const mockDocument = {
    readyState: "complete",
    get activeElement() {
      return activeElement;
    },
    documentElement: {
      style: documentStyle,
    },
    querySelector: (sel: string) => {
      const found = querySelector(docEl, sel);
      return found ? wrapElement(found) : null;
    },
    querySelectorAll: (sel: string) => {
      return querySelectorAll(docEl, sel).map(wrapElement);
    },
    getElementById: (id: string) => {
      const found = querySelector(docEl, `#${id}`);
      return found ? wrapElement(found) : null;
    },
    addEventListener: (type: string, listener: MockEventListener, useCapture?: boolean) => {
      if (!documentListeners.has(type)) {
        documentListeners.set(type, []);
      }
      documentListeners.get(type)!.push({ listener, useCapture });
    },
    removeEventListener: (type: string, listener: MockEventListener) => {
      const list = documentListeners.get(type);
      if (list) {
        documentListeners.set(type, list.filter((h) => h.listener !== listener));
      }
    },
    dispatchEvent: (ev: MockEvent) => {
      const list = documentListeners.get(ev.type) || [];
      for (const { listener } of list) {
        listener(ev);
      }
    },
  };

  const mockWindow = {
    location: mockLocation,
    history: mockHistory,
  };

  return {
    document: mockDocument,
    window: mockWindow,
    Event: CustomEventMock,
    docEl,
    tabbar: wrapElement(tabbar),
  };
}

function runEnhanceScript(env: ReturnType<typeof createDOMEnvironment>) {
  const code = fs.readFileSync(ENHANCE_PATH, "utf8");
  const context = vm.createContext({
    document: env.document,
    window: env.window,
    Event: env.Event,
    URLSearchParams,
    WeakMap,
    Array,
    Object,
    String,
    parseInt,
  });
  vm.runInContext(code, context);
}

// Tests for Tab Enhancement
test("enhance.js: upgrades tabbar to roving tabindex and keyboard navigation on load", () => {
  const env = createDOMEnvironment("/?tab=projects");
  runEnhanceScript(env);

  const tabbar = env.document.querySelector("[data-tabbar]")!;
  assert.equal(tabbar.getAttribute("role"), "radiogroup");

  const tabs = env.document.querySelectorAll("label[data-tab]");
  assert.equal(tabs.length, 4);

  // Default active tab is projects
  const projectsTab = tabs[0]!;
  assert.equal(projectsTab.getAttribute("aria-controls"), "panel-projects");
  assert.equal(projectsTab.getAttribute("tabindex"), "0");

  // Other tabs inactive
  for (let i = 1; i < tabs.length; i++) {
    const tab = tabs[i]!;
    assert.equal(tab.getAttribute("tabindex"), "-1");
  }

  // Panels
  const panels = env.document.querySelectorAll("[data-tab-panel]");
  assert.equal(panels.length, 4);
  for (const panel of panels) {
    assert.equal(panel.getAttribute("tabindex"), "0");
  }

  const projectsPanel = env.document.getElementById("panel-projects")!;
  assert.equal(projectsPanel.hasAttribute("hidden"), false);

  const skillsPanel = env.document.getElementById("panel-skills")!;
  assert.equal(skillsPanel.hasAttribute("hidden"), true);
});

test("enhance.js: clicking tab activates it, updates radio, panels, and URL ?tab=", () => {
  const env = createDOMEnvironment("/?tab=projects");
  runEnhanceScript(env);

  const skillsTab = env.document.querySelector('label[data-tab="skills"]')!;
  const clickEvent = new env.Event("click", { bubbles: true, cancelable: true });
  skillsTab.dispatchEvent(clickEvent);

  assert.equal(clickEvent.defaultPrevented, true);

  // Tab states
  assert.equal(skillsTab.getAttribute("tabindex"), "0");

  const projectsTab = env.document.querySelector('label[data-tab="projects"]')!;
  assert.equal(projectsTab.getAttribute("tabindex"), "-1");

  // Radio input synced
  const skillsInput = env.document.getElementById("tab-skills")!;
  assert.equal(skillsInput.checked, true);

  const projectsInput = env.document.getElementById("tab-projects")!;
  assert.equal(projectsInput.checked, false);

  // Panels synced
  const skillsPanel = env.document.getElementById("panel-skills")!;
  assert.equal(skillsPanel.hasAttribute("hidden"), false);

  const projectsPanel = env.document.getElementById("panel-projects")!;
  assert.equal(projectsPanel.hasAttribute("hidden"), true);

  // URL query synced
  assert.equal(env.window.location.search, "?tab=skills");
});

test("enhance.js: keyboard navigation roving tabindex (ArrowRight, ArrowLeft, Home, End)", () => {
  const env = createDOMEnvironment("/?tab=projects");
  runEnhanceScript(env);

  const projectsTab = env.document.querySelector('label[data-tab="projects"]')!;
  projectsTab.focus();

  // ArrowRight -> skills
  const rightEv1 = new env.Event("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" });
  env.tabbar.dispatchEvent(rightEv1);
  assert.equal(rightEv1.defaultPrevented, true);
  assert.equal(env.window.location.search, "?tab=skills");

  // ArrowRight -> education
  const rightEv2 = new env.Event("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" });
  env.tabbar.dispatchEvent(rightEv2);
  assert.equal(env.window.location.search, "?tab=education");

  // ArrowRight -> language
  const rightEv3 = new env.Event("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" });
  env.tabbar.dispatchEvent(rightEv3);
  assert.equal(env.window.location.search, "?tab=language");

  // ArrowRight wraps to projects
  const rightEvWrap = new env.Event("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" });
  env.tabbar.dispatchEvent(rightEvWrap);
  assert.equal(env.window.location.search, "?tab=projects");

  // ArrowLeft wraps to language
  const leftEvWrap = new env.Event("keydown", { bubbles: true, cancelable: true, key: "ArrowLeft" });
  env.tabbar.dispatchEvent(leftEvWrap);
  assert.equal(env.window.location.search, "?tab=language");

  // Home key -> projects (first)
  const homeEv = new env.Event("keydown", { bubbles: true, cancelable: true, key: "Home" });
  env.tabbar.dispatchEvent(homeEv);
  assert.equal(env.window.location.search, "?tab=projects");

  // End key -> language (last)
  const endEv = new env.Event("keydown", { bubbles: true, cancelable: true, key: "End" });
  env.tabbar.dispatchEvent(endEv);
  assert.equal(env.window.location.search, "?tab=language");
});

test("enhance.js: deep-link load time ?tab=education activates education tab", () => {
  const env = createDOMEnvironment("/?tab=education");
  runEnhanceScript(env);

  const eduTab = env.document.querySelector('label[data-tab="education"]')!;
  assert.equal(eduTab.getAttribute("tabindex"), "0");

  const eduPanel = env.document.getElementById("panel-education")!;
  assert.equal(eduPanel.hasAttribute("hidden"), false);

  const projectsPanel = env.document.getElementById("panel-projects")!;
  assert.equal(projectsPanel.hasAttribute("hidden"), true);
});

test("enhance.js: invalid ?tab=unknown parameter falls back to projects and cleans URL parameter", () => {
  const env = createDOMEnvironment("/?tab=invalid123");
  runEnhanceScript(env);

  const projectsTab = env.document.querySelector('label[data-tab="projects"]')!;
  assert.equal(projectsTab.getAttribute("tabindex"), "0");

  const projectsPanel = env.document.getElementById("panel-projects")!;
  assert.equal(projectsPanel.hasAttribute("hidden"), false);

  // URL search cleaned
  assert.equal(env.window.location.search, "");
});

// Tests for Modal Enhancement
test("enhance.js: click [data-modal-trigger] opens modal, locks scroll, and stores trigger for focus return", () => {
  const env = createDOMEnvironment();
  runEnhanceScript(env);

  const trigger = env.document.querySelector('[data-modal-trigger="syariah-display-system"]')!;
  const dialog = env.document.getElementById("modal-syariah-display-system")!;

  const clickEvent = new env.Event("click", { bubbles: true, cancelable: true });
  trigger.dispatchEvent(clickEvent);

  assert.equal(clickEvent.defaultPrevented, true);
  assert.equal(dialog.open, true);
  assert.equal(dialog._raw.showModalCount, 1);

  // Scroll locked with scrollbar-gutter stable
  assert.equal(env.document.documentElement.style.overflow, "hidden");
  assert.equal(env.document.documentElement.style.scrollbarGutter, "stable");

  // Close dialog -> restores scroll and restores focus to trigger
  dialog.close();
  assert.equal(dialog.open, false);
  assert.equal(env.document.documentElement.style.overflow, "");
  assert.equal(env.document.documentElement.style.scrollbarGutter, "");
  assert.equal(trigger._raw.focusCount, 1);
});

test("enhance.js: clicking card [data-project-card] also opens corresponding modal", () => {
  const env = createDOMEnvironment();
  runEnhanceScript(env);

  const card = env.document.querySelector('[data-project-id="loan-system-revamp"]')!;
  const dialog = env.document.getElementById("modal-loan-system-revamp")!;

  const clickEvent = new env.Event("click", { bubbles: true, cancelable: true });
  card.dispatchEvent(clickEvent);

  assert.equal(clickEvent.defaultPrevented, true);
  assert.equal(dialog.open, true);
  assert.equal(dialog._raw.showModalCount, 1);

  dialog.close();
});

test("enhance.js: clicking backdrop (event.target === dialog) closes the modal", () => {
  const env = createDOMEnvironment();
  runEnhanceScript(env);

  const dialog = env.document.getElementById("modal-syariah-display-system")!;
  dialog.showModal();
  assert.equal(dialog.open, true);

  // Backdrop click targets dialog itself
  const backdropClick = new env.Event("click", { bubbles: true, cancelable: true });
  dialog.dispatchEvent(backdropClick);

  assert.equal(dialog.open, false);
  assert.equal(dialog._raw.closeCount, 1);
});

test("enhance.js: clicking [data-modal-close] inside modal prevents default and closes dialog", () => {
  const env = createDOMEnvironment();
  runEnhanceScript(env);

  const dialog = env.document.getElementById("modal-syariah-display-system")!;
  dialog.showModal();
  assert.equal(dialog.open, true);

  const closeBtn = dialog.querySelector("[data-modal-close]")!;
  const closeClick = new env.Event("click", { bubbles: true, cancelable: true });
  closeBtn.dispatchEvent(closeClick);

  assert.equal(closeClick.defaultPrevented, true);
  assert.equal(dialog.open, false);
});

test("enhance.js: touchmove on backdrop is prevented for iOS touch scroll lock", () => {
  const env = createDOMEnvironment();
  runEnhanceScript(env);

  const dialog = env.document.getElementById("modal-syariah-display-system")!;
  dialog.showModal();

  // Touch on backdrop (dialog itself)
  const touchBackdrop = new env.Event("touchmove", { bubbles: true, cancelable: true });
  dialog.dispatchEvent(touchBackdrop);
  assert.equal(touchBackdrop.defaultPrevented, true);

  // Touch inside modal content is NOT prevented
  const content = dialog.querySelector(".nd-modal__content")!;
  const touchContent = new env.Event("touchmove", { bubbles: true, cancelable: true });
  content.dispatchEvent(touchContent);
  assert.equal(touchContent.defaultPrevented, false);
});

test("layout.tsx: includes whitelisted <script defer src='/enhance.js' />", () => {
  const layoutPath = path.join(ROOT, "src", "app", "layout.tsx");
  const layout = fs.readFileSync(layoutPath, "utf8");
  assert.match(
    layout,
    /<script\b[^>]*\bsrc=["']\/enhance\.js["'][^>]*\bdefer[^>]*\/?>|<script\b[^>]*\bdefer[^>]*\bsrc=["']\/enhance\.js["'][^>]*\/?>/,
    "layout.tsx must include <script defer src='/enhance.js' />",
  );
});

test("enhance.js: static code analysis (IIFE, strict mode, 0 dependencies)", () => {
  const content = fs.readFileSync(ENHANCE_PATH, "utf8");
  assert.ok(
    content.includes("'use strict'") || content.includes('"use strict"'),
    "must enforce strict mode",
  );
  assert.match(
    content,
    /^\s*(\/\*[\s\S]*?\*\/\s*)*\(function\s*\(/,
    "must be wrapped in an IIFE",
  );
  assert.ok(!/\bimport\s+/.test(content), "must not use import");
  assert.ok(!/\brequire\s*\(/.test(content), "must not use require");
});
