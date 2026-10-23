# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-10-22

### Architecture & Design
- **Notion Document Style Redesign**: Redesigned single-page portfolio layout inspired by Notion documents (880px desktop, 358px mobile) per Desain v10.0 and PRD v1.2.
- **HTML-First Zero-Framework Client Runtime (Opsi C)**: Completely eliminated Next.js framework runtime client chunks via post-build pruner (`scripts/prune-runtime.js`).
- **Progressive Enhancement**: Added first-party vanilla progressive enhancement script (`public/enhance.js`, 2.3 KB gzip ≤ 5 KB) providing roving tabindex keyboard navigation, URL tab synchronization (`?tab=`), accessible `<dialog>` modal interaction with focus trap and scroll lock, and zero third-party dependencies.
- **Hardened Content Security Policy**: Enforced strict CSP (`script-src 'self'`) without `'unsafe-inline'` or `'unsafe-eval'` in both container and production Nginx reverse proxy configurations.

### Features & Components
- **Page Layout & Header Block**: Header with verified full name, 4px left-bordered quote callout block, and centralized typography tokens (`nd-page`, `nd-header`, `nd-callout`).
- **About Two-Column & Monochrome Vector Avatar**: Two-column responsive about section featuring black-and-white borderless vector avatar with light/dark SVGs, bio summary, and verified contact links (email + LinkedIn).
- **Work Experience Section**: Reverse-chronological work history covering Bank Sinarmas (2 sub-roles) and PT CDC Global Informatika with verified bullet points.
- **Database View & CSS-Only TabBar**: 4-tab gallery database view utilizing pure CSS `:has(:checked)` for JS-off tab toggling and roving tabindex keyboard navigation (`ArrowRight`/`ArrowLeft`/`Home`/`End`) under JS-on.
- **Gallery Panels**:
  - *Projects*: 5 verified projects with whitelist tags and desktop featured 2-column span for orphan card resolution.
  - *Skills*: 4 category groups (Backend, Database, Architecture, Professional) partitioning 14 hard skills and 6 soft skills.
  - *Education*: 3 structured cards (degree, academic award, innovation award).
  - *Languages*: 2 language cards (Indonesian Native, English Professional Working).
- **Static Project Modal**: 5 native `<dialog>` modals with CSS `:target` baseline fallback and `<dialog>.showModal()` progressive enhancement.
- **Print Stylesheet v2**: Clean `@media print` stylesheet with `@page { size: A4 portrait; margin: 8mm; }`, 2-column gallery grid, interactive control suppression, verified A4 PDF output ≤ 3 pages.

### Testing & Quality Assurance
- **Full Test Suite**: 174 automated unit/component tests passing.
- **Dual-Mode Playwright E2E Suite**: 14 end-to-end tests covering interactive JS-on behavior and complete JS-off fallback.
- **Axe-core Accessibility Audit**: 0 critical, 0 serious, 0 total violations across all 4 tabs and 2 themes (WCAG 2.2 AA compliant).
- **Visual Evidence**: 16 full-page screenshots captured across 4 tabs × 2 themes × 2 viewports.
- **Post-Deploy Live Probe**: Automated 40-point verification script (`scripts/probe-deployed.js`) validating HTTP status, CSP headers, zero-framework runtime payload, and live Chromium CDP interactions.
- **Atomic Deployment & Rollback Drill**: Zero-downtime atomic symlink swap deployment pipeline with tested < 5 minute rollback recovery (measured RTO 0.05s).
