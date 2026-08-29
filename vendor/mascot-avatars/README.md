# Mascot Avatars (generator)

Procedural SVG mascot avatars that follow the [IP as Logo](../SKILL.md) design rules: rounded shapes, two colors on a solid background, lower-corner crop, subtle internal shading. Deterministic from a seed. Zero dependencies. Node + browser.

This is an **optional companion** for game assets, avatars, and other deterministic marks. It is **not** a fallback when AI image models are unavailable — the agent skill still requires a top-tier image model and never falls back to SVG.

Based on [otatechie/mascot-avatars](https://github.com/otatechie/mascot-avatars) (see [s1dashu/ip-as-logo-skill#1](https://github.com/s1dashu/ip-as-logo-skill/issues/1)). Credit: Ato Augustine. MIT — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Usage

### Node

```js
const { renderAvatar } = require("./avatar.js");
// or: import { renderAvatar } from "./avatar.mjs";

const svg = renderAvatar({ seed: "ada@example.com" });
require("fs").writeFileSync("avatar.svg", svg);
```

### Browser

```html
<script src="avatar.js"></script>
<script>
  const svg = MascotAvatar.renderAvatar({ seed: "ada" });
  document.getElementById("avatar").innerHTML = svg;
</script>
```

## API

### `renderAvatar(opts)` → SVG string (512×512 viewBox)

| Option    | Default    | Values |
|-----------|------------|--------|
| `seed`    | `"avatar"` | any string; same seed → same avatar |
| `species` | `"auto"`   | `ghost`, `cat`, `bear`, `bunny`, `robot`, `blob`, `bird`, `dog`, `frog`, `penguin`, `alien`, `mouse`, or `"auto"` |
| `palette` | `"auto"`   | a name from `PALETTES`, or `"auto"` |
| `mode`    | `"two"`    | `"two"` or `"mono"` |
| `corner`  | `"auto"`   | `"left"`, `"right"`, or `"auto"` |

Also exported: `PALETTES`, `SPECIES_NAMES`, `SIZE`.

## Test

```bash
npm test
```
