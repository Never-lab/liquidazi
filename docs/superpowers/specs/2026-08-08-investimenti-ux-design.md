# Investimenti UX + light balance — Design

**Date:** 2026-08-08  
**Status:** Approved  
**Goal:** Clarify Crescita/Investimenti (treasury, growth, annual project) and slightly improve treasury/growth attractiveness without changing the four annual projects.

## Locked

| Area | Change |
|------|--------|
| UX InvestmentsPanel | Three blocks: Tesoreria · Reinvestimento · Progetto annuale (active status or “offerta a gennaio”) |
| Banner progetto | Clearer didactic copy |
| Guida finanza | Short section on the three tools |
| Treasury yield | `0.55 × Euribor` (was 0.4) |
| Growth | `GROWTH_PER_SLOT = 3500` (was 4000); cap 3 unchanged |
| Projects | No mechanic/catalog change |

## Out of scope

New projects, treasury settlement delay, Holding merge into tab.

## Done when

- Panel shows active project / next offer hint
- Tests updated for new constants; lint/test/build green
