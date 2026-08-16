# PC Kinba — Design Tokens

Semantic design tokens for the PC Kinba client. Tokens are defined as CSS custom
properties in [client/src/index.css](client/src/index.css) and exposed to Tailwind
v4 via the `@theme` block, so utilities such as `bg-bg-primary`, `text-accent`,
`border-border`, and `text-text-muted` respond automatically to the active theme.

## How theming works

- The active theme is set with a `data-theme` attribute on `<html>`
  (`light` | `dark`).
- `@theme` maps each Tailwind color (`--color-*`) to a **runtime** variable
  (`var(--accent)`, `var(--bg-primary)`, …). Because the utilities reference the
  runtime variable, changing `data-theme` re-themes the whole app with no rebuild.
- The `:root` default (no `data-theme`) equals the **dark** theme, so the very
  first paint — before the `ThemeProvider` hydrates — matches the original design.

## Semantic tokens

| Token             | Tailwind utility base | Meaning                                   |
| ----------------- | --------------------- | ----------------------------------------- |
| `--bg-primary`    | `bg-bg-primary`       | App background                            |
| `--bg-secondary`  | `bg-bg-secondary`     | Secondary background / gradients          |
| `--bg-surface`    | `bg-bg-surface`       | Raised surfaces (modals, cards, popovers) |
| `--text-primary`  | `text-text-primary`   | Primary text                              |
| `--text-muted`    | `text-text-muted`     | Muted / secondary text                    |
| `--accent`        | `text-accent`         | Primary brand accent (interactive)        |
| `--purple`        | `text-purple`         | Secondary brand hue (gradients)           |
| `--green`         | `text-green`          | Tertiary brand hue                        |
| `--success`       | `text-success`        | Positive status                           |
| `--warning`       | `text-warning`        | Caution status                            |
| `--danger`        | `text-danger`         | Error / destructive status                |
| `--border`        | `border-border`       | Hairline borders / dividers               |
| `--glass`         | `bg-glass`            | Glassmorphism surface fill                |

Legacy aliases kept for the existing component CSS: `--text-secondary`
(= `--text-muted`), `--glass-bg` (= `--glass`), `--glass-border`, `--glass-glow`.

## Theme palettes

### Dark (default — visual parity baseline)

| Token            | Value                    |
| ---------------- | ------------------------ |
| `--bg-primary`   | `#050816`                |
| `--bg-secondary` | `#0d1117`                |
| `--bg-surface`   | `#0d1117`                |
| `--text-primary` | `#ffffff`                |
| `--text-muted`   | `#a1a1aa`                |
| `--accent`       | `#00e5ff`                |
| `--purple`       | `#7c3aed`                |
| `--green`        | `#00ffb2`                |
| `--success`      | `#00ffb2`                |
| `--warning`      | `#f5a623`                |
| `--danger`       | `#ff4d5e`                |
| `--border`       | `rgba(255,255,255,0.08)` |

### Light

| Token            | Value                  |
| ---------------- | ---------------------- |
| `--bg-primary`   | `#f6f8fc`              |
| `--bg-secondary` | `#ffffff`              |
| `--bg-surface`   | `#ffffff`              |
| `--text-primary` | `#0b1120`              |
| `--text-muted`   | `#64748b`              |
| `--accent`       | `#0891b2`              |
| `--purple`       | `#7c3aed`              |
| `--green`        | `#059669`              |
| `--success`      | `#059669`              |
| `--warning`      | `#b45309`              |
| `--danger`       | `#dc2626`              |
| `--border`       | `rgba(15,23,42,0.1)`   |

## Typography scale

Defined in `@theme` and consumable as `text-hero`, `text-title`, `text-subtitle`,
`text-card-title`, `text-body`, `text-caption`.

| Token               | Size   | Usage                    |
| ------------------- | ------ | ------------------------ |
| `--text-hero`       | `64px` | Hero headline            |
| `--text-title`      | `40px` | Section titles (`h2`)    |
| `--text-card-title` | `24px` | Card titles (`h3`)       |
| `--text-subtitle`   | `22px` | Subtitles (`h4`)         |
| `--text-body`       | `18px` | Body copy                |
| `--text-caption`    | `13px` | Captions / helper text   |

## Fonts

- Latin: `Inter` (`--font-sans`).
- Bengali: `Noto Sans Bengali` / `Hind Siliguri` fallback stack (`--font-bengali`),
  applied automatically when `<html lang="bn">`. Line-height is relaxed to `1.75`
  for `bn` so Bengali glyphs do not clip.

## Spacing / layout conventions (extracted from existing components)

- Container: `max-width: 1440px`, horizontal padding `32px`.
- Section vertical padding: `120px` desktop / `80px` tablet / `60px` mobile.
- Card radius: `20px`; buttons are fully rounded pills (`9999px`).
- Motion easing: `cubic-bezier(0.22, 1, 0.36, 1)` (entrances) and
  `cubic-bezier(0.4, 0, 0.2, 1)` (surfaces/hover).
