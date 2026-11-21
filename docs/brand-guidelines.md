# Colleris — Brand Guidelines v1.0

> Last updated: 2026-09-21
> Status: Active — source of truth for `assets/design-tokens.json` → `assets/design-tokens.css`

## Quick Reference

| Element | Value |
|---------|-------|
| Primary Color (default preset) | #edc025 (yellow) |
| Secondary Roles | cyan #4fb8cc / pink #e08a9e / purple #a58fd6 / mint #5fbf97 |
| Warning | #e8933c (amber) |
| Destructive | #d85a50 (coral) |
| Background Dark | #0b0b0a · Light #f7f6f2 |
| Primary Font Display/Body | Inter |
| Accent Display (cotton-candy) | Fredoka + Inter |
| Monospace | JetBrains Mono |
| Voice | Warm, editorial, precise — modern productivity SaaS |

---

## 1. Color Palette

### Core Neutrals (theme-dependent)

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| --bg | #0b0b0a | #f7f6f2 | Page canvas |
| --sidebar | #0f0f0d | #faf9f6 | Sidebar / nav chrome |
| --surface | #131311 | #ffffff | Cards, panels |
| --surface-2 | #1a1a17 | #f1efe9 | Secondary surfaces, button default |
| --surface-hover | #22221d | #e9e6dd | Hover surface |
| --border | #2b2a24 | #e0ddd2 | Dividers, card borders |
| --text | #f4f2ea | #16150f | Primary text |
| --text-muted | #a8a49a | #55524a | Secondary text |
| --text-faint | #6f6b60 | #9a968a | Tertiary / muted |
| --scrim | rgba(6,5,4,0.6) | rgba(6,5,4,0.6) | Modal overlay (constant) |
| --on-accent | #161207 | #161207 | Text on accent fill (near-black) |
| --on-danger | #fff7f4 | #fff7f4 | Text on danger fill |

### Primary & Semantic Hues (preset-dependent)

Preset IDs (must match `ThemeContext.jsx` + `AuthController.php` validation): `default` / `blue` / `cyan` / `pink` / `lavender` / `mint` / `cotton-candy`.

#### default — Colleris Default (yellow primary, warm editorial)

| Role | Hex | Soft | Dim | Usage |
|------|-----|------|-----|-------|
| accent | #edc025 | #f2d267 | #8a6a12 | Primary / active / progress / selected |
| cyan | #4fb8cc | #7ccccb | #2a788a | Info |
| pink | #e08a9e | #eaaabe | #934f62 | Personality / collaboration |
| purple | #a58fd6 | #beaee4 | #6d55a8 | AI / special |
| mint | #5fbf97 | #84d3b3 | #357a5d | Success / completed |
| warn | #e8933c | #f0ad6b | #9c5c1a | Attention / urgent |
| danger | #d85a50 | #e5867e | #9a3a34 | Destructive only |

#### blue — Blueprint

| Role | Hex | Soft | Dim |
|------|-----|------|-----|
| accent | #5b8def | #87a9f2 | #3a5fb0 |
| cyan | #3fb9c9 | #6cd3de | #2b7b88 |
| pink | #dd7aa6 | #e89fc0 | #944d72 |
| purple | #8f6fe0 | #a68de8 | #5b479c |
| mint | #3fae8a | #6bc4a6 | #24725a |
| warn | #e8963e | #f0b16f | #9c5c1a |
| danger | #d95a64 | #e5868f | #963a44 |

#### cyan — Tide

| Role | Hex | Soft | Dim |
|------|-----|------|-----|
| accent | #2fb2c2 | #63cbda | #1e7886 |
| cyan | #55c7e8 | #7fd6ef | #2c7d98 |
| pink | #e08bb0 | #ecacc9 | #944d70 |
| purple | #9f8cf0 | #b9abf6 | #6a55b8 |
| mint | #55c99b | #7dd8b4 | #2f8a66 |
| warn | #e8a03c | #f0bb6e | #9c651a |
| danger | #d96a74 | #e58e96 | #97404a |

#### pink — Rose

| Role | Hex | Soft | Dim |
|------|-----|------|-----|
| accent | #e07aa6 | #eea3c0 | #a0527c |
| cyan | #5fbcc8 | #8bcfd8 | #337d88 |
| pink | #f28cb8 | #f6accc | #a4557d |
| purple | #b48bf0 | #cbacf6 | #7c58b8 |
| mint | #6bc9a3 | #94dcbf | #3f8a6a |
| warn | #e89a48 | #f0b777 | #9c6124 |
| danger | #d85a6e | #e58593 | #9a3a4e |

#### lavender — Lilac

| Role | Hex | Soft | Dim |
|------|-----|------|-----|
| accent | #9a8cf2 | #b7acf7 | #6a5ac0 |
| cyan | #69c0cf | #93d5e1 | #3a7d8a |
| pink | #e28bb4 | #edabca | #94507a |
| purple | #a78bfa | #bda6fb | #6d55b8 |
| mint | #6ac6a4 | #94dbbf | #3d8368 |
| warn | #e39a42 | #ebb873 | #965e1b |
| danger | #db6a7a | #e794a0 | #9a4250 |

#### mint — Mint

| Role | Hex | Soft | Dim |
|------|-----|------|-----|
| accent | #3fae8a | #6fc4a6 | #24725a |
| cyan | #55c7bc | #80d8d0 | #2f8780 |
| pink | #e392ac | #eeb4c5 | #965068 |
| purple | #9f90e0 | #bab0ec | #6858ac |
| mint | #55c99b | #7dd8b4 | #2f8a66 |
| warn | #e0a03c | #e9bc6d | #976919 |
| danger | #d96a74 | #e58e96 | #97404a |

#### cotton-candy — Cotton Candy (dual-tone only)

| Role | Hex | Soft | Dim | Notes |
|------|-----|------|-----|-------|
| accent | #7ec8e3 | #a7dcee | #4c89a8 | Dual-tone gradient `--accent-bg: linear-gradient(135deg, #7ec8e3 0%, #f2a7c6 100%)` |
| accent-soft-bg | linear 135deg #a7dcee→#f6c4da | — | — | Soft gradient |
| cyan | #4fc3d6 | #7ed9e6 | #2c7f8f |
| pink | #f2a7c6 | #f6c4da | #b06a8e |
| purple | #b59ce0 | #cebcec | #7558ac |
| mint | #6cc9a4 | #96dcbf | #3d8168 |
| warn | #e8a03c | #f0bb6e | #9c651a |
| danger | #d96a74 | #e58e96 | #97404a |

**Rules:** Guests locked to `default` (see `ThemeContext.jsx:52`). Preview swatches in picker never derive from `danger`.

### Semantic Mapping (status layer)

| State | Token | Value | Usage |
|-------|-------|-------|-------|
| wait | --status-wait | var(--text-faint) | Neutral muted |
| progress | --status-progress | var(--accent) | Active / progress |
| urgent | --status-urgent | var(--warn) | Attention |
| completed | --status-completed | var(--mint) | Success |
| destructive | --danger | var(--danger) | Error / delete |

### Accessibility

- Body text on --bg meets 7:1 (AAA) in both themes.
- Accent on --bg 4.6:1 minimum (AA). All presets mid-tone so --on-accent (#161207 near-black) passes.
- Status never conveyed by color alone — accompanied by icons/labels (StatusBadge/StatusIcon).
- Focus ring: `color-mix(in srgb, var(--accent) 30%, transparent)` visible on both themes.

---

## 2. Typography

### Font Stack

```css
--font-display: 'Inter', sans-serif;            /* default 6 presets */
--font-body:    'Inter', sans-serif;
--font-mono:    'JetBrains Mono', monospace;    /* technical labels, indices */
--font-display: 'Fredoka', 'Inter', sans-serif; /* cotton-candy only */
```

Import: `@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400..700&family=Inter:wght@400..700&family=JetBrains+Mono:wght@400..700&display=swap');`

### Type Scale (colleris-specific, matches Tailwind defaults but tokenized)

| Token | Value | Usage |
|-------|-------|-------|
| --font-size-xs | 0.75rem | Indices, meta |
| --font-size-sm | 0.875rem | Captions, table meta |
| --font-size-base | 1rem | Body |
| --font-size-lg | 1.125rem | Card titles |
| --font-size-xl | 1.25rem | Section headings |
| --font-size-2xl | 1.5rem | Page titles |
| --font-size-3xl | 1.875rem | Hero / workspace title |
| --font-size-4xl | 2.25rem | Marketing hero (if used) |
| --font-weight-regular | 400 | Body |
| --font-weight-medium | 500 | Labels |
| --font-weight-semibold | 600 | Headings |
| --font-weight-bold | 700 | Display |

Line heights: body 1.5, headings 1.25, mono 1.4.

---

## 3. Logo Usage

### Variants

| Variant | File | Use Case |
|---------|------|----------|
| Wordmark (text) | `colleris` in `font-display` with `text-accent-gradient` | Header, Sidebar |
| Mark (icon) | Stroked line `M2 12h4l2 7 4-14 2 7h6` on `--accent-bg` | Favicon, Avatar fallback |
| Monochrome | White on --bg or black on --surface | Limited color contexts |

### Clear Space & Minimum Size

- Clear space = height of mark (7px mark → 7px padding).
- Minimum digital mark: 20px; wordmark: `text-[15px]`.

### Don'ts

- Don't recolor accent outside preset palette.
- Don't place gradient text on busy backgrounds without scrim.
- Don't rotate/skew the line mark.
- Don't change strokeWidth outside 2–2.4.
- Don't hardcode hex — always `var(--accent)` / `var(--accent-bg)`.

---

## 4. Voice & Tone

### Brand Personality

| Trait | Description |
|-------|-------------|
| Editorial | Warm near-black/off-white canvas, restrained, productivity-forward |
| Precise | Small mono indices (02, 01 / MAIN), tracking, tight hierarchy |
| Human | Collaboration-first: connections, groups, invitations, reminders — not tool-first |

### Voice Chart

| Trait | We Are | We Are Not |
|-------|--------|------------|
| Warm | Inviting, near-black/off-white, soft borders | Cold, stark, pure black/white |
| Precise | Mono indices, 4/8dp rhythm, status+icon | Vague, color-only, cluttered |
| Collaborative | Directory, groups, join codes, assignment permissions | Solitary, opaque, permission-hidden |

### Tone by Context

| Context | Tone | Example |
|---------|------|---------|
| App chrome | Quiet, editorial | `01 / MAIN` · `Workspace` |
| Empty states | Encouraging, brief | "No projects yet — Add your first project" |
| Errors | Calm, recoverable | Toast with `failure()` + `statusLabel` |
| Admin | Factual, live | `source: live` checks |

---

## 5. Imagery Guidelines

- No heavy imagery in app shell; texture only `.texture-dots` on editorial headers (`radial-gradient(...22%...) 16px`).
- Illustrations (if added) use brand palette only, 1.5px stroke, 6–14px radius.

---

## 6. Design Components (overview → tokens)

| Component | Key Tokens |
|-----------|------------|
| Button primary | `--button-primary-bg: var(--accent-bg)` · `--button-primary-fg: var(--on-accent)` |
| Button default | `--button-default-bg: var(--surface-2)` · `--border` |
| Card | `--card-bg: var(--surface)` · `--card-border: var(--border)` · `--card-radius: var(--radius-lg)` · `--shadow-panel` |
| Input/Field | `--input-bg: var(--surface)` · `--input-border: var(--border)` · `--focus-ring` |
| Sidebar | `--sidebar` · `--border` · active mark `--accent-bg` |
| Slider | `--slider-fill: var(--accent)` · track `linear-gradient(to right, var(--slider-fill) var(--progress), var(--surface-2))` |

### Spacing Scale (4px base)

| Token | Value | Usage |
|-------|-------|-------|
| --space-0 | 0 | — |
| --space-1 | 0.25rem (4px) | Tight |
| --space-2 | 0.5rem (8px) | Compact / gaps |
| --space-3 | 0.75rem (12px) | Card padding |
| --space-4 | 1rem (16px) | Standard section |
| --space-5 | 1.25rem (20px) | — |
| --space-6 | 1.5rem (24px) | Section |
| --space-8 | 2rem (32px) | Large |
| --space-10 | 2.5rem (40px) | Page |
| --space-12 | 3rem (48px) | Dividers |
| --space-16 | 4rem (64px) | Hero |

### Radius & Shadow

| Token | Value |
|-------|-------|
| --radius-sm | 6px |
| --radius-md | 10px |
| --radius-lg | 14px |
| --radius-full | 9999px |
| --shadow-panel | 0 8px 24px rgba(0,0,0,.28) |
| --shadow-sm | 0 1px 2px rgb(0 0 0 / 0.05) |

### Duration

| Token | Value |
|-------|-------|
| --duration-fast | 150ms |
| --duration-normal | 200ms |
| --duration-slow | 300ms |

---

## AI Image Generation (if brand assets needed)

Base prompt template (prepend):
```
warm productivity SaaS, editorial near-black #0b0b0a + off-white #f7f6f2, accent yellow #edc025, mid-tone hues, soft borders, Inter + JetBrains Mono, precise mono indices, collaborative workspace mood, natural soft light
```

---

## Sync Contract

```
docs/brand-guidelines.md  →  assets/design-tokens.json  →  assets/design-tokens.css
                               (W3C DTCG $value/$type)       (CSS variables, 3 layers)
                               ↓
                               frontend/src/tokens/tokens.css (imported in main.jsx)
                               frontend/tailwind.config.js (extends → var(--*))
```

Generate:
```bash
node .opencode/skills/design-system/scripts/generate-tokens.cjs --config assets/design-tokens.json -o assets/design-tokens.css
# then copy to frontend/src/tokens/tokens.css if needed
```

Validate:
```bash
node .opencode/skills/design-system/scripts/validate-tokens.cjs --dir frontend/src
node .opencode/skills/brand/scripts/validate-asset.cjs <asset>
node .opencode/skills/brand/scripts/extract-colors.cjs --palette
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-09-21 | Initial — extracted from `frontend/src/index.css` + `ThemeContext.jsx` 7 presets |
