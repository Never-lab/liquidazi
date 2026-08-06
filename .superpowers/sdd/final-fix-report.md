# Whole-branch review fixes

Implemented the Critical and Important review findings:

- Limited register, login, and run JSON bodies to 64 KB; saves retain their 1 MB limit.
- Made JSON persistence atomic (`.tmp` + rename) and tolerate corrupt user, run, and per-user save files.
- Prevented unknown `/api` routes from falling through to the SPA; tightened static path containment.
- Registration now uploads guest slots and preferences; persisted sessions refresh saves on rehydrate and log out on a 401.
- Updated Railway build/docs, ignored per-user saves, and aligned the menu account copy.

## Verification

```text
> npm test -- server/app.test.ts
Test Files  1 passed (1)
Tests       6 passed (6)

> npm test -- src/api/cloudSaves.test.ts
Test Files  1 passed (1)
Tests       2 passed (2)

> npm test
Test Files  22 passed (22)
Tests       125 passed (125)

> npm run build
tsc -b && vite build
✓ built in 160ms
```

`npm run build` emits Vite's existing chunk-size warning for the main bundle; it exits successfully.
