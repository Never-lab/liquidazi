# Shock senza stock (#6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stockout premium on supply-touching shocks when `supplyMonths === 0`.

**Architecture:** Export `stockoutExtra` + internal `applySupplyShock` in `eventCatalog.ts`; wire five supply shocks; extend `phase-shocks.test.ts`.

**Tech Stack:** TypeScript, Vitest, existing `resolveEventOption` / `shockCash`.

## Global Constraints

- Formula: `extra = max(800 × lost, round(cashBefore × 0.06 × lost))` only if `before === 0`
- Supplier bust stockout uses `lost = 2`; with stock only wipe + −700
- Events: fire, flood, van_theft, truck, supplier_bust only

---

### Task 1: Helper + fire/truck/supplier tests + wire

**Files:**
- Modify: `src/sim/eventCatalog.ts`
- Modify: `src/sim/phase-shocks.test.ts`
- Modify: `ROADMAP.md`

- [ ] Write failing tests for stockout fire/supplier and stock fire unchanged
- [ ] Implement `stockoutExtra` + `applySupplyShock`; wire five shocks
- [ ] Update treasury-cover fire test for new total
- [ ] ROADMAP Done + Next
- [ ] `npm run lint && npm test && npm run build`
- [ ] Commit
