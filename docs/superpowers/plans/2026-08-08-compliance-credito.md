# Compliance + Credito Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** +3 compliance/month when in regola; higher credit caps; up to 2 loans with refinance.

**Architecture:** Extend `GameState` with `loans[]` + migrate from `loan`; tick all loans in `advanceMonth`; recovery after collection tick; caps in snapshot + `fidoMaxFor`; LoanPanel UX.

**Tech Stack:** TypeScript, Vitest, React LoanPanel/TaxPanel.

## Global Constraints

- Compliance +3 iff not in cartella|enforcement|terminal AND monthsTaxOverdue === 0
- Max 2 loans; refinance: cash += principal − residual
- Caps: base 35k / fondo 75k; fido raw then × compliance; offers 10/30/60k

---

### Task 1: Compliance recovery + caps

**Files:** `advanceMonth.ts`, `fiscalYearSnapshot.ts`, `actions.ts` (fidoMaxFor, templates), tests

### Task 2: loans[] migrate + month tick + request/refinance

**Files:** `types.ts`, `migrateGameState.ts`, `actions.ts`, `advanceMonth.ts`, `LoanPanel`, store, tests, wiki help

### Task 3: Verify + ROADMAP

`npm run lint && npm test && npm run build`
