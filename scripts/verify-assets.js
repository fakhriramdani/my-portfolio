#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OG_PATH = path.join(ROOT, 'public', 'og.png');
const AVATAR_LIGHT = path.join(ROOT, 'public', 'assets', 'avatar-light.png');
const AVATAR_DARK = path.join(ROOT, 'public', 'assets', 'avatar-dark.png');

let errors = [];

if (!fs.existsSync(OG_PATH)) {
  errors.push(`E_ASSET: missing og.png at ${OG_PATH}`);
} else {
  try {
    const buf = fs.readFileSync(OG_PATH);
    if (buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG') {
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      if (w !== 1200 || h !== 630) {
        errors.push(`E_META: og.png dimensions must be 1200x630 (got ${w}x{h})`);
      }
    } else {
      errors.push("E_META: og.png is not a valid PNG file");
    }
  } catch (e) {
    errors.push(`E_META: failed to read og.png: ${e.message}`);
  }
}

function verifyAvatar(p, label) {
  if (!fs.existsSync(p)) {
    errors.push(`E_ASSET: missing ${label} at ${p}`);
    return;
  }
  const buf = fs.readFileSync(p);
  if (p.endsWith('.png')) {
    if (buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG') {
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      if (w !== h) {
        errors.push(`E_ASSET: ${label} must be square (got ${w}x${h})`);
      }
    } else {
      errors.push(`E_ASSET: ${label} is not a valid PNG file`);
    }
    return;
  }
  if (buf.length > 20000) {
    errors.push(`E_ASSET: ${label} size ${buf.length} B exceeds 20 KB per file`);
  }
  const text = buf.toString('utf8');
  if (!/viewBox\s*=\s*["']0\s+0\s+160\s+160["']/.test(text) &&
      !(/\bwidth\s*=\s*["']160["']/.test(text) && /\bheight\s*=\s*["']160["']/.test(text))) {
    errors.push(`E_ASSET: ${label} missing viewBox or width/height 160`);
  }
  if (text.includes('<rect')) {
    errors.push(`E_ASSET: ${label} must be borderless (no <rect>)`);
  }
}

verifyAvatar(AVATAR_LIGHT, 'avatar-light.png');
verifyAvatar(AVATAR_DARK, 'avatar-dark.png');

const totalAvatar = (fs.existsSync(AVATAR_LIGHT) ? fs.statSync(AVATAR_LIGHT).size : 0) +
                    (fs.existsSync(AVATAR_DARK) ? fs.statSync(AVATAR_DARK).size : 0);
if ((AVATAR_LIGHT.endsWith('.svg') || AVATAR_DARK.endsWith('.svg')) && totalAvatar > 40000) {
  errors.push(`E_ASSET: combined avatar size ${totalAvatar} B exceeds 40 KB`);
}

if (errors.length > 0) {
  console.error("Asset verification failed:");
  errors.forEach(err => console.error(" -", err));
  process.exit(1);
} else {
  console.log("OK: PDF hash, og.png dimensions, and avatars verified successfully.");
}
