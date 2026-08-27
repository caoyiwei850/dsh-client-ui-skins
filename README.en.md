# dsh-client-ui-skins

A skin plugin for the DeepSeek Harness (DSH) Web UI: 4 built-in skins plus custom image/video skins — use any photo (or looping video) as the whole-interface background and let the palette follow its dominant colour.

Pure client plugin; no DSH source is touched. Uninstalling fully restores the native look.

## Features

- **4 built-in skins**: Ocean Deep / Sakura Pink / Mint Clean / Amber Glow (light & dark variants each)
- **Custom image skins**: upload PNG / JPG / WebP — the image becomes the full Web UI background (translucent mask) and the palette is extracted from it
- **Video wallpaper**: upload MP4 / WebM — loops as an animated background; palette is sampled from the first frame
- **Appearance-aware**: follows dark / light / system switching
- **Background veil slider**: independently tune how much the wallpaper shows through, so text stays legible
- **Input opacity slider**: independently tune input-well opacity for comfortable typing over photos
- **Body-text emphasis toggle**: adds a light frosted scrim under assistant prose so photo highlights don't wash out the text (off by default)
- **Readability guaranteed**: bright accents auto-switch to dark text, dark accents to light text; translucent-mode labels use opaque stepped colours
- **Persistent**: skin choice, custom image/video, opacity controls and toggles stay in localStorage/IndexedDB across reloads
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
cd ~/.dsh/profiles/web && pnpm add -w <path-to>/dsh-client-ui-skins-0.1.13.tgz

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
3. Click **Custom (image/video)** and pick a photo or video — the whole palette follows it
4. With a custom skin active, tune the **Background veil** / **Input opacity** sliders and toggle **Emphasize body text** live
5. Click **Default** to restore the native look

> Custom media stay on your machine (images compressed WebP in localStorage, videos in IndexedDB); nothing is uploaded anywhere.

## Development

```
dsh-client-ui-skins/
├── package.json          # dsh.client dual-face declaration
├── lib/
│   ├── index.js          # Host side: intentionally empty (skins are browser-local)
│   └── client.js         # Client side: derivation, background layer, settings UI
└── scripts/              # install/uninstall scripts
```

How it works:

- Registers skin tokens (`--dsw-*` variables) via DSH's native `theme.register()`
- Acts as an **orthogonal overlay** writing tokens straight to `body.style`, never fighting ui-theme's appearance preference
- Four seed colours (accent / secondary / surface / text) → HSL derivation → semantic tokens
- Custom images: browser-side sampling (text / near-grey pixels ignored), re-encoded to WebP in localStorage
- Custom videos: first-frame sampling, Blob stored in IndexedDB, played by a fixed `<video>` layer

## License

MIT © [your-name]
