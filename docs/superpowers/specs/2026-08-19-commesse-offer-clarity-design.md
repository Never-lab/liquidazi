# Commesse / appalti / contratti — Offer clarity

**Date:** 2026-08-19  
**Branch:** `feat/supply-quality` (or new `feat/commesse-offer-clarity`)  
**Status:** Approved  
**Goal:** Make commessa vs appalto PA vs contratto multi-mese understandable at a glance — badge, inline accept preview, active-contract panel — without changing sim formulas.

**Follow-up (deferred — approach B):** mechanical simplification (no random contract morph, merge types, etc.).

## Context

Beta feedback: the board mixes three different mechanics under “Commesse del mese” with identical Accetta/Lascia actions. Pain points:

1. **“X mesi” ambiguity** — `termMonths` (when cash arrives) vs `contractMonths` (recurring work duration) use similar wording.
2. **Active contracts invisible** — only a count chip when > 0; no title, €/mese, months left, or FL locked.
3. **Cards don’t explain consequences** of accepting.
4. **Coach/guide gap** — `commesse-legend` covers FL/tetto/scorte but not offer types.

Prior slice [2026-08-07-commesse-stats-clarity](../specs/2026-08-07-commesse-stats-clarity-design.md) improved stat chips; this slice targets **offer taxonomy and accept preview**.

## Requirements

### 1. Offer classification (pure helper)

New `src/ui/opportunityCopy.ts` (Vitest):

| UI kind | Rule |
|---------|------|
| `single` — Commessa singola | `sale`, no `contractMonths ≥ 2`, `marketLayer` local or absent |
| `tender` — Appalto PA | `sale`, `marketLayer` municipal or national |
| `contract` — Contratto | `sale`, `contractMonths ≥ 2` |

Exports:

- `classifyOffer(op: Opportunity): OfferKind`
- `OFFER_KIND_LABEL`, `OFFER_KIND_BADGE` (short badge text: Singola / Appalto PA / Contratto)
- `formatOfferMoneyLine(op, game)` — net + IVA, FL, quality/supply hints
- `formatOfferTimingLine(op)` — distinct vocabulary (see UI below)
- `formatAcceptPreview(op, game)` — full Italian sentence for row 3
- `previewContractTerms(state, op)` — mirrors `acceptAsContract` netPerMonth + workforceLock for display (import shared constants from `contracts.ts` where needed; do not duplicate business logic beyond what accept already does)

### 2. Board cards — OpportunitiesPanel

Each sale card shows:

1. **Title row:** existing title + badge (reuse/extend `panels.module.css` `.badge` → `.dealBadge` with kind variants).
2. **Money line:** `{net} € netti + IVA` · `{FL}` FL · premium/quality as today.
3. **Timing line (distinct words):**
   - Single / tender: `Incasso tra ~{termMonths} mesi` (+ `(PA, pagamenti lunghi)` for PA)
   - Contract: `Durata {contractMonths} mesi · fattura ogni mese`
4. **Accept preview** (`dealOutcome`, muted): e.g.
   - Single: `Se accetti: 1 fattura · incasso tra ~2 mesi · −25 FL questo mese`
   - Tender: `Se accetti: 1 fattura · incasso tra ~12 mesi (PA, pagamenti lunghi) · −45 FL questo mese`
   - Contract: `Se accetti: 3 fatture da ~1.050 €/mese · −18 FL bloccate fino a chiusura · max 2 contratti attivi`

Supply cards unchanged except filter behaviour (below).

Accetta / Lascia unchanged — **no modal**.

### 3. Active contracts panel

Always visible block under stat chips:

- Heading: `Contratti in corso (n/2)`
- Empty: `Nessun contratto attivo. I contratti bloccano FL finché non scadono.`
- Each `ActiveContract`: `{title} · {netPerMonth}/mese · {monthsLeft} mesi rimasti · −{workforceLock} FL bloccate`

Stat chip: **`Contratti n/2` always shown** (not only when n > 0). Tooltip points to this section.

### 4. Offer-type filter

Third cycle button on board head (alongside entrate/forniture and mercato):

`Tutte → Singole → Contratti → Appalti → Tutte`

- Filters sale offers by `classifyOffer`.
- When board filter is “Solo forniture”, offer-type filter ignored (supplies only).
- Extend `boardView.ts`: `OfferKindFilter`, labels, `nextOfferKindFilter`, `visibleOpportunities(..., offerKind)`.

### 5. Coach + Guida

- New coach tip `offer-types` (months 2–4, or when board contains a contract offer): 3-bullet explanation of single / tender / contract.
- Update `commesse-legend` to mention badges + “Contratti in corso”.
- `guidePages.ts`: add “Tipi di offerta” to Come si gioca + FAQ entry.

## Non-goals

- Changes to `maybeMakeContract` probabilities or generation (`contracts.ts`, `events.ts` logic)
- Accept confirmation modal
- Sticky header changes
- Approach B mechanical simplification (tracked as follow-up)
- Redesign of deal Accetta/Lascia layout beyond new text rows

## UI / CSS

`panels.module.css`:

- `.dealBadge`, `.dealBadgeSingle`, `.dealBadgeTender`, `.dealBadgeContract` (subtle color differentiation)
- `.dealOutcome` — 13px muted, not mono
- `.contractList`, `.contractRow` — compact list under chips

Follow hybrid Hint pattern only if a control needs why+what; badges use `title` on desktop.

## Testing

Vitest (`environment: node`):

- `opportunityCopy.test.ts`: classify each kind; timing lines; accept preview strings for fixtures (single, municipal tender, contract with/without warehouse quality)
- `boardView.test.ts` (if absent, add minimal): offer-kind filter hides/shows correct ops
- Update `coach.test.ts` for `offer-types` priority vs `commesse-legend`

Lint + test + build before PR.

## Success criteria

A new player can answer without asking:

1. What kind of offer they’re viewing (badge).
2. What happens on Accetta (preview line).
3. What contracts are active and how much FL is locked (panel + n/2 chip).
4. Why “Incasso tra 12 mesi” on an appalto ≠ “Durata 3 mesi” on a contratto.

## Follow-up B (not this slice)

- Remove or surface random `maybeMakeContract` transformation
- Optional accept confirmation for contracts only
- Further merge of appalti/commesse naming in generation
