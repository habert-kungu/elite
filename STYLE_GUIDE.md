# Elite UI — Deriv Design System migration guide

Project: `/home/master/elite` (Next.js 16, Tailwind v4, React 19). Brand colour is **pale yellow** (#fde68a) on Deriv structure. The app is being
restyled to the **Deriv Design System** (zeroheight.com/36313d3c8). The foundation is
done; this guide tells you how to migrate a page so it matches.

## Already built — USE these, do not re-create or modify them

- `packages/ui/src/styles/globals.css` — all tokens + CSS recipes (`.btn*`, `.field*`,
  `.tabs/.tab`, `.segment`, `.tag*`, `.d-card`, `.t-*` type scale, `.elevation-*`).
- `apps/web/components/ui.tsx` — React primitives:
  `Card`, `CardHeader`, `Button`, `ButtonLink`, `buttonClass`, `Badge` (`StatusPill` alias),
  `statusTone`, `TextField`, `TextArea`, `Select`, `Tabs`, `Segmented`, `Modal`, `Notice`,
  `Stat`, `EmptyState`, `Skeleton`, `Spinner`.
- `apps/web/app/components/page-header.tsx` — `PageHeader` (title / description / actions).
- `apps/web/app/components/brand-logo.tsx` — `BrandLogo`, `BrandLockup` (logo + "elite." wordmark).
- `apps/web/app/app/(dashboard)/layout.tsx` — the shell: standard left sidebar (persistent from `lg`, drawer below), slim header with balance/deposit/bell, bottom tab bar on phones. Admin layout mirrors it.
- `apps/web/app/app/(dashboard)/page.tsx` — the finished Overview page. **Read it first**; it
  is the reference for how a migrated page should look and be written.

## Tokens (from the Deriv "System colors" page)

| Role | Tailwind class | CSS var |
|---|---|---|
| Page background (8 primary) | `bg-background` | `--background` (#fff / #0e0e0e) |
| Card / secondary surface (7) | `bg-surface` or `<Card>` | `--background-secondary` (#f2f3f4 / #151717) |
| Hover surface (6) | `bg-hover` | `--background-hover` (#e6e9e9 / #242828) |
| Active surface (5) | `bg-active` | `--background-active` (#d6dadb / #323738) |
| Prominent text (1) | `text-foreground` | `--foreground` (#333 / #fff) |
| General text (2) | `text-general` | `--foreground-general` (#333 / #c2c2c2) |
| Less prominent text (3) | `text-less` | `--foreground-tertiary` (#999 / #6e6e6e) |
| Disabled text (4) | `text-disabled` | `--foreground-disabled` |
| Brand fill (pale yellow, dark text) | `bg-primary text-primary-foreground` | `--primary` #fde68a |
| Brand text/indicator (deeper yellow on light, pale on dark) | `text-brand`, `bg-[var(--brand-accent)]` | `--brand-text` / `--brand-accent` |
| Success | `text-success` `bg-success` `bg-success-soft` | `--success` (#4bb4b3 / #00a79e) |
| Danger | `text-destructive` `bg-destructive` `bg-danger-soft` | `--destructive` (#ec3f3f / #cc2e3d) |
| Warning | `text-warning` `bg-warning-soft` | `--warning` #ffad3a |
| Info | `text-info` `bg-info-soft` | `--info` #377cfc |
| Brand tint | `bg-brand-soft` | `--bg-brand` |
| Dividers | `border-border` or `divide-[var(--background-hover)]` | |

Legacy aliases still work (`text-muted-foreground`, `bg-secondary`, `bg-card`, `bg-muted`,
`border-border`) and resolve to the right tokens, so existing semantic classes are fine to
leave. What you MUST remove:

- Any hard-coded colour: `#fcd535`, `#FDE68A`, `#9a7200`, `#181A20`, `#0b0e11`, `#1e2329`,
  `#4c6fff`, `#8ea2ff`, `oklch(...)`, and Tailwind palette colours (`emerald-*`, `amber-*`,
  `yellow-*`, `rose-*`, `red-*`, `green-*`, `blue-*`, `indigo-*`, `gray-*`, `zinc-*`, `slate-*`).
  Replace with the semantic tokens above.
- Gradients used as decoration on cards/headers (`bg-gradient-to-*` tints). Deriv surfaces are flat.
- `rounded-full` pills for status → use `<Badge>` (2px radius).
- `rounded-lg/xl/2xl` on cards → `<Card>` (16px). Buttons are 4px (`rounded-[4px]`), inputs and
  modals 8px (`rounded-[8px]`).
- `font-semibold` → `font-bold`. Note `font-bold` is remapped to weight 600 globally (Plex 700 is too heavy); use `font-medium` (500) for labels/badges.
- `uppercase tracking-wider` eyebrow labels → Deriv never uses all caps. Use `text-[12px] font-bold text-less`.
- `shadow-*` Tailwind shadows → `elevation-sm|md|lg|xl|xxl`.
- `border border-border` around cards → drop it; cards are borderless on the secondary surface.
  (Inputs keep their 1px border via `.field`.)

## Typography (IBM Plex Sans, already loaded)

Use explicit sizes from the Deriv scale (mobile → desktop):
- Page title (H3): `text-[24px] leading-[30px] md:text-[32px] md:leading-10 font-bold` — or just use `<PageHeader>`.
- Section/card title (Sub 2 bold): `text-[16px] leading-6 font-bold`.
- Big number: `text-[20px] leading-[30px] md:text-[24px] md:leading-9 font-bold tabular-nums`.
- Body (P2): `text-[12px] leading-[18px] md:text-[14px] md:leading-5` (body default is 14/20).
- Small/helper (S): `text-[12px] leading-[18px] text-less`.
- Badge label (XS): handled by `<Badge>`.

## Components

- **Buttons**: `<Button variant="primary|secondary|tertiary|danger|success|brand-soft" size="xs|sm|md|hero" block loading>` or `<ButtonLink href>`.
  Primary = brand fill (one per view, the main action). Secondary = 2px inner border. Tertiary = text-only.
  Primary buttons are pale yellow with dark text — never put `text-white` on `bg-primary`. Heights: xs 24 · sm 32 · md 40 · hero 64.
  NOTE: the `.btn*` recipes live in `@layer components`, so Tailwind cannot generate responsive variants of them (`md:btn-hero` emits nothing). To scale a button by breakpoint, add plain utilities instead: `md:h-16 md:px-6 md:text-[20px] md:leading-[30px]`.
- **Inputs**: `<TextField label="Email" name="email" type="email" required error={msg} help="…" leading={<Icon/>} trailing={…}/>`,
  `<TextArea>`, `<Select>`. Every field has a visible label (Deriv "labelled text field").
  For raw `<input>` use `className="field"` + `<label className="field-label">`.
- **Badges**: `<Badge tone="success|danger|warning|info|neutral|brand" dot>Label</Badge>`; `statusTone(status)` maps domain statuses. Labels are Sentence case, one line.
- **Tabs**: `<Tabs items value onChange fill>` (bordered tabs, 2px brand indicator) for page sections; `<Segmented>` for small filters/timeframes.
- **Modal**: `<Modal open onClose title size footer={<><Button variant="secondary">Cancel</Button><Button>Confirm</Button></>}>`. Don't hand-roll overlays.
- **Notice**: `<Notice tone="info|success|warning|danger" icon={<IconX/>}>…</Notice>` for inline messages/errors.
- **Empty state**: `<EmptyState icon title description action/>`.
- **Tables**: `<table className="table-linear">` inside a `<Card className="overflow-hidden">`; on mobile (< sm) render the same rows as stacked list items inside the Card (`divide-y divide-[var(--background-hover)]`).
- **Card internals**: padding `p-5` (sm) or `p-6`. Card header = `<CardHeader title description action/>`.
- **Icons**: `@tabler/icons-react`, `stroke={1.8}`, size `h-4 w-4` inline / `h-5 w-5` in nav. Replace inline `<svg>` icon soup with Tabler icons.
- **Lists of key/value**: `<Stat label value hint tone/>`.
- **Page skeleton**: `<div className="space-y-6"><PageHeader …/>…</div>`. Content max width is set by the layout.

## Process for each file

1. Read `apps/web/app/app/(dashboard)/page.tsx` and `apps/web/components/ui.tsx` once.
2. Keep ALL data fetching, state, handlers and API calls exactly as they are. This is a restyle — behaviour, routes, form field names and request payloads must not change.
3. Rewrite the JSX using the primitives above. Rebuild layout where the current one is generic "sidebar dashboard" boilerplate — favour Deriv patterns: a summary strip, one dominant card, bordered tabs to switch sections, right-aligned actions.
4. Remove dead helper components/inline SVG icon maps you replaced.
5. Run `cd /home/master/elite/apps/web && npx tsc --noEmit -p .` and fix every error in the files you own. Do not edit files outside your assignment; if a shared primitive is missing something, compose locally in your file.
6. Final grep in your files must return nothing:
   `grep -nE "#fcd535|#FDE68A|#fde68a|#9a7200|#181A20|#0b0e11|#1e2329|#4c6fff|#8ea2ff|oklch|(emerald|amber|yellow|rose|red|green|blue|indigo|gray|zinc|slate)-[0-9]+|bg-gradient|font-semibold|uppercase" <files>`
   (a `bg-gradient` is acceptable only for an actual image overlay such as a photo fade, not as decoration on a card.)
