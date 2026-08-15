# dsh-client-ui-skins

A skin plugin for the DeepSeek Harness (DSH) Web UI: 4 built-in skins plus custom image skins — use any photo as the whole-interface background and let the palette follow its dominant colour.

Pure client plugin; no DSH source is touched. Uninstalling fully restores the native look.

## Features

- **4 built-in skins**: Ocean Deep / Sakura Pink / Mint Clean / Amber Glow (light & dark variants each)
- **Custom image skins**: upload PNG / JPG / WebP — the image becomes the full Web UI background (translucent mask) and the palette is extracted from it
- **Appearance-aware**: follows dark / light / system switching
- **Accent-linked accents**: session selection (pure accent), functional borders, code highlights and input wells all follow the image's dominant hue
- **Readability guaranteed**: bright accents auto-switch to dark text, dark accents to light text
- **Persistent**: skin choice and custom image stay in localStorage across reloads
- **Default option**: one click back to the native appearance

## Install

Requires a DSH web profile (`~/.dsh/profiles/web`) and pnpm.

### A. One-shot script

```bash
bash install-dsh-skins.sh
```

### B. Manual

```bash
# 1. install the package
cd ~/.dsh/profiles/web && pnpm add -w <path-to>/dsh-client-ui-skins-0.1.7.tgz

# 2. register (append to ~/.dsh/profiles/web/cordis.patch.yml):
#    - insert:
#        - id: ui-skins
#          name: 'dsh-client-ui-skins'

# 3. restart web
launchctl kickstart -k gui/$(id -u)/com.deepseek.dsh.web
```

Then refresh `http://127.0.0.1:3080` → **Settings → General → Skins**.

## Uninstall

```bash
bash uninstall-dsh-skins.sh
```

## Usage

1. Open **Settings → General → Skins**
2. Click any built-in skin card — applies instantly
3. Click **Custom (image)** and pick a photo — the whole palette follows it
4. Click **Default** to restore the native look

> Custom skin images stay on your machine (compressed WebP in localStorage); nothing is uploaded anywhere.

## Development

```
dsh-client-ui-skins/
├── package.json          # dsh.client dual-face declaration
├── lib/
│   ├── index.js          # Host side: registers the ui-skins settings namespace
│   └── client.js         # Client side: derivation, background layer, settings UI
└── scripts/              # install/uninstall scripts
```

How it works:

- Registers skin tokens (`--dsw-*` variables) via DSH's native `theme.register()`
- Acts as an **orthogonal overlay** writing tokens straight to `body.style`, never fighting ui-theme's appearance preference
- Four seed colours (accent / secondary / surface / text) → HSL derivation → 78 semantic tokens
- Custom images: browser-side sampling (text / near-grey pixels ignored), re-encoded to WebP in localStorage

## License

MIT © [your-name]
