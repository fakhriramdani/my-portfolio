#!/usr/bin/env python3
"""Traceability gate for the PRD set. No deps. Exit 1 on any FINDING."""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
if not (ROOT / "docs/product/PRD.md").exists():
    print("OK: docs/product not present, skipping PRD traceability check.")
    sys.exit(0)

FILES = {n: (ROOT / "docs/product" / n).read_text(encoding="utf-8")
         for n in ("PRD.md", "stories.md", "rules.md", "analytics.md", "glossary.md")}
P, S, R, A = FILES["PRD.md"], FILES["stories.md"], FILES["rules.md"], FILES["analytics.md"]

findings = []
def need(cond, msg):
    if not cond:
        findings.append(msg)

# --- definitions -------------------------------------------------------------
fr_def = set(re.findall(r"^\|\s*(FR-\d{3})\s*\|", P, re.M))
nfr_def = set(re.findall(r"^\|\s*(NFR-\d{2})\s*\|", P, re.M))
g_def = set(re.findall(r"^\|\s*(G-\d)\s*\|", P, re.M))
m_def = set(re.findall(r"^\|\s*(M-\d+)\s*\|", P, re.M))
ng_def = set(re.findall(r"^\|\s*(NG-\d+)\s*\|", P, re.M))
oq_def = set(re.findall(r"^\|\s*(OQ-\d{3})\s*\|", P, re.M))
us_def = set(re.findall(r"^###\s*(US-\d{3})", S, re.M))
br_def = set(re.findall(r"^\|\s*(BR-\d{3})\s*\|", R, re.M))
ev_def = set(re.findall(r"^\|\s*(EV-\d{3})\s*\|", A, re.M))
ac_def = re.findall(r"\*\*(AC-\d{3}\.\d)", S)

# --- references --------------------------------------------------------------
def refs(prefix, text):
    return set(re.findall(r"(?<![A-Z])" + prefix + r"-\d+(?:\.\d+)?", text))

ALL = P + S + R + A
for prefix, defined in (("FR", fr_def), ("NFR", nfr_def), ("BR", br_def),
                        ("US", us_def), ("EV", ev_def), ("OQ", oq_def),
                        ("G", g_def), ("M", m_def)):
    used = refs(prefix, ALL)
    for u in sorted(used - defined):
        findings.append(f"{u} referenced but not defined")
    for d in sorted(defined - used):
        findings.append(f"{d} defined but never referenced")

# --- guard that no tel: literal remains in docs/product (CR-2 / D-067) --------
for name, text in FILES.items():
    tel_matches = re.findall(r"tel:[^\s`\"|<)]+", text)
    need(len(tel_matches) == 0, f"{name}: tel: literal remains in docs/product: {tel_matches}")

# --- every FR traces to a US (PRD §20 + stories coverage) ---------------------
trace = P.split("## 20. Traceability")[1]
fr_to_us = {}
for row in re.findall(r"^\|.*\|$", trace, re.M):
    cells = [c.strip() for c in row.strip("|").split("|")]
    if len(cells) < 3:
        continue
    for f in re.findall(r"FR-\d{3}", cells[1]):
        fr_to_us.setdefault(f, set()).update(re.findall(r"US-\d{3}", cells[2]))
coverage = S.split("## Coverage check")[1]
cov_pairs = set()
for row in re.findall(r"^\|.*\|$", coverage, re.M):
    cells = [c.strip() for c in row.strip("|").split("|")]
    if len(cells) >= 2:
        for f in re.findall(r"FR-\d{3}", cells[0]):
            cov_pairs.update((f, u) for u in re.findall(r"US-\d{3}", cells[1]))
for f in sorted(fr_def):
    need(fr_to_us.get(f), f"{f} has no US in PRD §20")
    need(any(p[0] == f for p in cov_pairs), f"{f} missing from stories.md coverage table")

# --- every US has ACs, AC prefix matches its story ---------------------------
us_to_ac = {}
for m in re.finditer(r"^###\s*(US-\d{3}).*?(?=^###\s*US-|^---)", S, re.M | re.S):
    us_to_ac[m.group(1)] = set(re.findall(r"\*\*(AC-\d{3}\.\d)", m.group(0)))
for u, acs in sorted(us_to_ac.items()):
    need(acs, f"{u} has no AC")
    for a in acs:
        need(a.split(".")[0].endswith(u[-3:]), f"{a} does not belong to {u}")
flat = [a for acs in us_to_ac.values() for a in acs]
need(len(flat) == len(set(flat)), "duplicate AC IDs")
for a in ac_def:
    need(any(a in v for v in us_to_ac.values()), f"{a} defined outside any US block")

# --- every G has a metric ----------------------------------------------------
metric_goals = set(re.findall(r"^\|\s*M-\d\s*\|[^|]*\|\s*(G-\d)\s*\|", P, re.M))
for g in sorted(g_def):
    need(g in metric_goals, f"{g} has no metric in §4")

# --- OQ hygiene --------------------------------------------------------------
sec19 = P.split("## 19. Open questions")[1].split("## 20.")[0]
oq_rows = [r for r in re.findall(r"^\|\s*OQ-\d{3}\s*\|.*\|$", sec19, re.M)]
need(len(oq_rows) == len(oq_def), "OQ count mismatch between definition set and §19 table")
for row in oq_rows:
    cells = [c.strip() for c in row.strip("|").split("|")]
    need(len(cells) == 5, f"OQ row malformed: {row[:40]}")
    if len(cells) == 5:
        need(cells[2], f"{cells[0]} has no proposed default")
        need(cells[3], f"{cells[0]} has no owner")
        need(re.fullmatch(r"\d{4}-\d{2}-\d{2}", cells[4]), f"{cells[0]} due date not YYYY-MM-DD")
need(not re.search(r"\bTBD\b", ALL), "TBD present without OQ")

# --- banned vague words ------------------------------------------------------
banned = r"\b(fast|easy|intuitive|user-friendly|robust|seamless|modern|various|appropriate|etc\.|and so on)\b"
for name, text in FILES.items():
    for kw in {m.group(0).lower() for m in re.finditer(banned, text, re.I)}:
        ctx = text[max(0, text.lower().find(kw) - 40): text.lower().find(kw) + 40].replace("\n", " ")
        findings.append(f"{name}: banned word '{kw}' near: ...{ctx}...")

# --- sequential numbering ----------------------------------------------------
for label, ids in (("FR", fr_def), ("US", us_def), ("BR", br_def), ("EV", ev_def)):
    nums = sorted(int(re.sub(r"\D", "", i)) for i in ids)
    need(nums == list(range(1, len(nums) + 1)), f"{label} numbering has gaps: {nums}")

print(f"defs: FR={len(fr_def)} NFR={len(nfr_def)} US={len(us_def)} AC={len(flat)} "
      f"BR={len(br_def)} EV={len(ev_def)} G={len(g_def)} M={len(m_def)} OQ={len(oq_def)}")
if findings:
    print(f"FINDINGS ({len(findings)}):")
    for f in findings:
        print(" -", f)
    sys.exit(1)
print("OK: all IDs trace, no banned words, no orphan TBD")
