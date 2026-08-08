# Graph Report - .  (2026-08-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 644 nodes · 2042 edges · 24 communities (21 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2936fd0c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22

## God Nodes (most connected - your core abstractions)
1. `round2()` - 74 edges
2. `advanceMonth()` - 65 edges
3. `toMonthIndex()` - 59 edges
4. `useGameStore` - 57 edges
5. `createInitialGameState()` - 39 edges
6. `formatCash()` - 36 edges
7. `GameState` - 24 edges
8. `react` - 22 edges
9. `monthlyCapacity()` - 21 edges
10. `maxDealNet()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `PayrollPanel()` --indirect_call--> `base()`  [INFERRED]
  src/components/PayrollPanel.tsx → src/sim/phase-loop-pressure.test.ts
- `shockCash()` --calls--> `round2()`  [EXTRACTED]
  src/sim/eventCatalog.ts → src/sim/types.ts
- `startIn()` --calls--> `createInitialGameState()`  [EXTRACTED]
  src/sim/phase-market.test.ts → src/sim/types.ts
- `App()` --calls--> `useGameStore`  [EXTRACTED]
  src/App.tsx → src/store/gameStore.ts
- `CoachBanner()` --calls--> `useGameStore`  [EXTRACTED]
  src/components/CoachBanner.tsx → src/store/gameStore.ts

## Import Cycles
- None detected.

## Communities (24 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (89): OpportunitiesPanel(), FiscalYearSnapshot, ANNUAL_STAFF_ONERI_FLOOR, annualOneriForEmployee(), baseGrossFor(), CAPACITY_POINTS, CCNL_BASE_GROSS, grossWithSeniority() (+81 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (48): AuthSession, CloudSaves, CloudSaveStatus, createCloudSaveQueue(), Deps, CoachBanner(), UpgradesPanel(), DifficultyId (+40 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (40): HoldingPanel(), RISK_LABEL, lostThreshold(), acceptSaleOffer(), advanceHoldingSales(), applySubsidiaryMonth(), buyAcquisition(), DRIFT (+32 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (42): areaPath(), CashSparkline(), ChartsPanel(), fmtEur(), poly(), seriesPoints(), NotificationInbox(), formatCloseToast() (+34 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (38): DIFFICULTY_LIST, CITIES, citiesInRegion(), cityById(), CityDef, CityId, cityIndex, densityIndexFor() (+30 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (39): oxlint, dependencies, react, react-dom, zustand, devDependencies, oxlint, @types/node (+31 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (25): formatCash(), InvestmentsPanel(), ProjectOfferBanner(), delta(), ReportPanel(), Props, SchedulePanel(), ScheduleRowItem() (+17 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (19): createHandler(), emptySaves(), emptySlots(), FEEDBACK_KINDS, MIME, safeJoin(), sendFile(), computeBalance() (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (25): AdminStats, api(), BalanceStats, CloudSaveSlot, deleteAdminRun(), FeedbackEntry, FeedbackKind, fetchAdminStats() (+17 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (24): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+16 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (15): App(), CloudSavePill(), LABEL, DisclaimerFooter(), ToastHost(), GuidePage, guidePages, GuideScreen() (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (12): react, ApiError, EventChoiceBanner(), Button(), Props, Variant, ConfirmDialog(), Props (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.27
Nodes (16): formatPct(), GUARANTEE_LABEL, LoanPanel(), acceptLoanOffer(), buildLoanOffers(), buildLoanSchedule(), canRequestLoan(), complianceSpreadPenaltyBps() (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.25
Nodes (16): applyAuto(), applyCalendar(), CHOICE_POOL, ChoiceDef, comfortLevel(), coverNegativeCashFromTreasury(), findChoiceDef(), forcedShockCount() (+8 more)

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (9): submitFeedback(), submitRun(), bugReportUrl(), enhancementUrl(), issueNew(), EndScreen(), SECOND_RUN_LABEL, SecondRun (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 17 - "Community 17"
Cohesion: 0.50
Nodes (6): PayrollPanel(), staffMoraleBand(), staffMoraleEffectCopy(), sectorById(), capacityPointsFor(), employerCostMonthly()

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (6): helpDir, ORDER, outFile, pages, root, serialized

### Community 19 - "Community 19"
Cohesion: 0.50
Nodes (3): DIFFICULTIES, DifficultyProfile, SavesScreen()

## Knowledge Gaps
- **161 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+156 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Community 11` to `Community 3`, `Community 4`, `Community 6`, `Community 8`, `Community 10`, `Community 13`, `Community 15`, `Community 16`, `Community 19`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `round2()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 6`, `Community 13`, `Community 14`, `Community 17`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `useGameStore` connect `Community 10` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 8`, `Community 11`, `Community 13`, `Community 15`, `Community 17`, `Community 19`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _161 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06678255830798203 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06584723441615452 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08597285067873303 - nodes in this community are weakly interconnected._