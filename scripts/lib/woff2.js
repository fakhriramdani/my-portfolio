#!/usr/bin/env node
/**
 * scripts/lib/woff2.js — pembaca metadata woff2/sfnt tanpa dependensi.
 *
 * Dipakai `scripts/check-tokens.js` dan `tests/token-contrast.test.ts` untuk
 * membuktikan berkas font benar-benar Inter dengan bobot yang dijanjikan
 * (guard NFR-03/C-D02), bukan sekadar berkas yang namanya cocok.
 *
 * Yang dibaca: direktori tabel, `OS/2` (usWeightClass), `name` (family,
 * subfamily, versi) dan `cmap` (cakupan codepoint, format 4 & 12).
 * Dekode woff2 memakai Brotli dari modul `zlib` bawaan Node.
 */
"use strict";

const fs = require("fs");
const zlib = require("zlib");

/** Daftar tag tabel woff2 (spesifikasi WOFF2 §4.1) untuk indeks flag 0–62. */
const KNOWN_TAGS = (
  "cmap head hhea hmtx maxp name OS/2 post cvt_ fpgm glyf loca prep CFF_ VORG " +
  "EBDT EBLC gasp hdmx kern LTSH PCLT VDMX vhea vmtx BASE GDEF GPOS GSUB EBSC " +
  "JSTF MATH CBDT CBLC COLR CPAL SVG_ sbix acnt avar bdat bloc bsln cvar fdsc " +
  "feat fmtx fvar gvar hsty just lcar mort morx opbd prop trak Zapf Silf Glat " +
  "Gloc Feat Sill"
)
  .split(" ")
  .map((tag) => tag.replace(/_$/, " "));

function decompressWoff2(buf) {
  const numTables = buf.readUInt16BE(12);
  let p = 48;
  const readBase128 = () => {
    let value = 0;
    for (let i = 0; i < 5; i++) {
      const byte = buf[p++];
      value = (value << 7) | (byte & 0x7f);
      if (!(byte & 0x80)) break;
    }
    return value;
  };
  const entries = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[p++];
    const tagIndex = flags & 0x3f;
    const transform = flags >> 6;
    let tag;
    if (tagIndex === 0x3f) {
      tag = buf.toString("ascii", p, p + 4);
      p += 4;
    } else {
      tag = KNOWN_TAGS[tagIndex];
    }
    const origLength = readBase128();
    let transformLength;
    if (tag === "glyf" || tag === "loca") {
      if (transform === 0) transformLength = readBase128();
    } else if (transform !== 0) {
      transformLength = readBase128();
    }
    entries.push({ tag, origLength, transformLength });
  }
  const sfnt = zlib.brotliDecompressSync(buf.subarray(p));
  const offsets = {};
  let cursor = 0;
  for (const entry of entries) {
    offsets[entry.tag] = cursor;
    cursor += entry.transformLength ?? entry.origLength;
  }
  return { sfnt, offsets };
}

function readNameTable(sfnt, offset) {
  const count = sfnt.readUInt16BE(offset + 2);
  const stringOffset = offset + sfnt.readUInt16BE(offset + 4);
  const names = {};
  for (let i = 0; i < count; i++) {
    const record = offset + 6 + i * 12;
    const platform = sfnt.readUInt16BE(record);
    const nameId = sfnt.readUInt16BE(record + 6);
    const length = sfnt.readUInt16BE(record + 8);
    const start = sfnt.readUInt16BE(record + 10);
    const raw = sfnt.subarray(
      stringOffset + start,
      stringOffset + start + length,
    );
    const value =
      platform === 3 || platform === 0
        ? Buffer.from(raw).swap16().toString("utf16le")
        : raw.toString("latin1");
    if (!(nameId in names)) names[nameId] = value;
  }
  return names;
}

function readCmap(sfnt, offset) {
  const numTables = sfnt.readUInt16BE(offset + 2);
  const codepoints = new Set();
  for (let i = 0; i < numTables; i++) {
    const sub = offset + 4 + i * 8;
    const subOffset = offset + sfnt.readUInt32BE(sub + 4);
    const format = sfnt.readUInt16BE(subOffset);
    if (format === 4) {
      const segCount = sfnt.readUInt16BE(subOffset + 6) / 2;
      const endCodes = subOffset + 14;
      const startCodes = endCodes + segCount * 2 + 2;
      for (let s = 0; s < segCount; s++) {
        const end = sfnt.readUInt16BE(endCodes + s * 2);
        const start = sfnt.readUInt16BE(startCodes + s * 2);
        if (end === 0xffff && start === 0xffff) continue;
        for (let cp = start; cp <= end && cp !== 0x10000; cp++)
          codepoints.add(cp);
      }
    } else if (format === 12) {
      const groups = sfnt.readUInt32BE(subOffset + 12);
      for (let g = 0; g < groups; g++) {
        const rec = subOffset + 16 + g * 12;
        const start = sfnt.readUInt32BE(rec);
        const end = sfnt.readUInt32BE(rec + 4);
        for (let cp = start; cp <= end; cp++) codepoints.add(cp);
      }
    }
  }
  return codepoints;
}

/** Metadata satu berkas font (woff2 atau sfnt biasa). */
function readFontMeta(file) {
  const raw = fs.readFileSync(file);
  const signature = raw.toString("ascii", 0, 4);
  if (signature !== "wOF2") {
    throw new Error(`not a woff2 file (signature "${signature}")`);
  }
  const { sfnt, offsets } = decompressWoff2(raw);
  const numTables = sfnt.readUInt16BE(4);
  const tables = {};
  for (let i = 0; i < numTables; i++) {
    const record = 12 + i * 16;
    tables[sfnt.toString("ascii", record, record + 4)] = {
      offset: sfnt.readUInt32BE(record + 8),
      length: sfnt.readUInt32BE(record + 12),
    };
  }
  const nameOffset = offsets["name"];
  const os2Offset = offsets["OS/2"];
  const cmapOffset = offsets["cmap"];
  const name = nameOffset === undefined ? {} : readNameTable(sfnt, nameOffset);
  return {
    file,
    size: raw.length,
    tables: Object.keys(tables).sort(),
    version: name[5] ?? null,
    family: name[1] ?? null,
    subfamily: name[2] ?? null,
    weight: os2Offset === undefined ? null : sfnt.readUInt16BE(os2Offset + 4),
    codepoints:
      cmapOffset === undefined ? new Set() : readCmap(sfnt, cmapOffset),
  };
}

module.exports = { readFontMeta, decompressWoff2 };
