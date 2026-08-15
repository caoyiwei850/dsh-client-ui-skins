/**
 * dsh-client-ui-skins — client bundle.
 *
 * A pure client plugin: registers skins through the host theme service
 * (`theme.register`), exposes a skin picker in General settings, and builds a
 * custom skin from a user-supplied image (browser-side colour sampling; the
 * image never leaves the machine).
 *
 * Bundle format: `window.__ModuleLoader__.load({ id, factory })` — the exact
 * shape the client-modules host half serves at `/plugins/<id>/client.js`.
 */
window.__ModuleLoader__.load({
  id: "dsh-client-ui-skins",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    // ---- imports available in the boot seed graph ----
    var jsxRuntime = require("react/jsx-runtime");
    var clientRuntime = require("@deepseek-ai/dsh-client-runtime/client");

    // =====================================================================
    // colour utilities
    // =====================================================================
    function hexToRgb(hex) {
      var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!m) return { r: 0, g: 0, b: 0 };
      return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
    }
    function rgbToHex(r, g, b) {
      var c = function (v) {
        v = Math.max(0, Math.min(255, Math.round(v)));
        return v.toString(16).padStart(2, "0");
      };
      return "#" + c(r) + c(g) + c(b);
    }
    function rgbToHsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return { h: h * 360, s: s * 100, l: l * 100 };
    }
    function hslToRgb(h, s, l) {
      h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100;
      var r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        var hue2rgb = function (p, q, t) {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }
      return { r: r * 255, g: g * 255, b: b * 255 };
    }
    function hexToHsl(hex) {
      var c = hexToRgb(hex);
      return rgbToHsl(c.r, c.g, c.b);
    }
    function hslToHex(h, s, l) {
      var c = hslToRgb(h, s, l);
      return rgbToHex(c.r, c.g, c.b);
    }
    /** Adjust lightness by delta (±100), preserving hue/saturation. */
    function adjustLightness(hex, delta) {
      var hsl = hexToHsl(hex);
      return hslToHex(hsl.h, hsl.s, Math.max(0, Math.min(100, hsl.l + delta)));
    }
    /** Mix two hex colours; t=1 → b. */
    function mixHex(a, b, t) {
      var ca = hexToRgb(a), cb = hexToRgb(b);
      return rgbToHex(ca.r + (cb.r - ca.r) * t, ca.g + (cb.g - ca.g) * t, ca.b + (cb.b - ca.b) * t);
    }
    /** Alpha composite a colour over a background. */
    function alphaOver(hex, alpha, bg) {
      var c = hexToRgb(hex), b = hexToRgb(bg);
      return rgbToHex(c.r * alpha + b.r * (1 - alpha), c.g * alpha + b.g * (1 - alpha), c.b * alpha + b.b * (1 - alpha));
    }
    /** Hex colour as an rgba() string with the given alpha (0..1). */
    function rgba(hex, alpha) {
      var c = hexToRgb(hex);
      return "rgba(" + c.r + ", " + c.g + ", " + c.b + ", " + alpha + ")";
    }
    /** Relative luminance (WCAG). */
    function luminance(hex) {
      var c = hexToRgb(hex);
      var f = function (v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    }
    /** WCAG contrast ratio between two colours. */
    function contrast(a, b) {
      var la = luminance(a), lb = luminance(b);
      var hi = Math.max(la, lb), lo = Math.min(la, lb);
      return (hi + 0.05) / (lo + 0.05);
    }
    /** Pick a readable on-surface colour: near-white on dark, near-black on light. */
    function readableOn(surface) {
      return luminance(surface) > 0.4 ? "#1a1a1a" : "#f5f5f5";
    }
    /**
     * Nudge a colour until it clears `minRatio` contrast against `bg`,
     * walking lightness toward the opposite end. Used for caret / focus
     * colours that must stay visible against the skin's surface.
     */
    function ensureContrast(color, bg, minRatio) {
      var ratio = contrast(color, bg);
      if (ratio >= minRatio) return color;
      var hsl = hexToHsl(color);
      var bgLum = luminance(bg);
      var step = bgLum > 0.5 ? -4 : 4; // walk away from the background
      var cur = hsl.l;
      for (var i = 0; i < 30; i++) {
        cur = Math.max(0, Math.min(100, cur + step));
        var candidate = hslToHex(hsl.h, Math.min(100, Math.max(0, hsl.s)), cur);
        if (contrast(candidate, bg) >= minRatio) return candidate;
      }
      return readableOn(bg);
    }

    // =====================================================================
    // skin derivation: 4 seed colours -> the alias tokens the UI reads
    // =====================================================================
    /**
     * Derive a full alias-token palette from four seeds. Keeps WCAG contrast
     * against the skin's own surface by construction: text seeds are picked
     * for contrast, borders/edges are alpha composites over the surface, and
     * accents get a readable foreground companion.
     *
     * @param seeds - { accent, secondary, surface, text }
     * @returns map of `--dsw-*` token name → { light, dark } (both modes get
     *          the skin's own values; the skin pins its own appearance).
     */
    function deriveTokens(seeds, translucent, appearance) {
      var surface = seeds.surface;
      var text = seeds.text;
      var accent = seeds.accent;
      var secondary = seeds.secondary;
      // The skin's own base scheme, overridden by the appearance when given:
      // built-in skins carry light+dark variants and follow the UI appearance;
      // custom-image skins keep the photo but re-wash it per appearance.
      var dark = appearance ? appearance === "dark" : luminance(surface) < 0.35;
      // For a translucent (photo) skin the text MUST track the appearance:
      // the photo's own sampled text colour (often near-white for dark photos)
      // becomes illegible against the pale light-appearance wash. Force it to
      // the readable pole per appearance — dark wash -> light text, pale wash
      // -> dark text. Built-in skins carry explicit text per appearance, so
      // only translucent skins are overridden here.
      if (translucent && appearance) {
        text = dark ? "#eef1f6" : "#1a1d24";
        surface = dark ? "#0f1116" : "#f4f5f9";
      }
      var onAccent = readableOn(accent);
      var onSurface = readableOn(surface);
      // solid stand-in for the wash, used as the blend base for translucent
      // accent washes (alphaOver needs a plain hex base, not an rgba wash)
      var washBase = translucent ? (dark ? "#0f1116" : "#f4f5f9") : surface;
      // With a background image the alias surfaces become translucent washes
      // so the image shows through panels; the veil layer keeps text legible.
      // The wash follows the appearance: light -> pale translucent, dark ->
      // deep translucent.
      var wash = translucent ? (dark ? "rgba(14, 16, 22, " + (0.3) + ")" : "rgba(250, 250, 252, " + (0.4) + ")") : null;
      var surfaceRef = wash || surface;
      var layer1Ref = translucent ? surfaceRef : (dark ? adjustLightness(surface, 3) : adjustLightness(surface, -2));
      var layer2Ref = translucent ? surfaceRef : (dark ? adjustLightness(surface, 6) : adjustLightness(surface, -4));
      var layer3Ref = translucent ? surfaceRef : (dark ? adjustLightness(surface, 9) : adjustLightness(surface, -6));
      var overlayRef = translucent ? surfaceRef : (dark ? adjustLightness(surface, 14) : adjustLightness(surface, -8));

      // layered surfaces: step away from `surface` by a fixed lightness delta
      var layer1 = dark ? adjustLightness(surface, 3) : adjustLightness(surface, -2);
      var layer2 = dark ? adjustLightness(surface, 6) : adjustLightness(surface, -4);
      var layer3 = dark ? adjustLightness(surface, 9) : adjustLightness(surface, -6);
      var overlay = dark ? adjustLightness(surface, 14) : adjustLightness(surface, -8);

      // borders: text at low alpha over the surface it sits on. In translucent
      // mode they take the photo's accent so the functional frames tint with
      // the skin instead of staying grey.
      var border1 = translucent ? alphaOver(accent, dark ? 0.22 : 0.12, washBase) : alphaOver(text, dark ? 0.18 : 0.08, surface);
      var border2 = translucent ? alphaOver(accent, dark ? 0.32 : 0.18, washBase) : alphaOver(text, dark ? 0.28 : 0.14, surface);
      var border3 = translucent ? alphaOver(accent, dark ? 0.42 : 0.26, washBase) : alphaOver(text, dark ? 0.36 : 0.2, surface);
      var border4 = translucent ? alphaOver(accent, dark ? 0.52 : 0.34, washBase) : alphaOver(text, dark ? 0.44 : 0.26, surface);

      // labels: text with alpha over surface
      var labelSecondary = alphaOver(text, dark ? 0.78 : 0.72, surface);
      var labelTertiary = alphaOver(text, dark ? 0.58 : 0.55, surface);
      var labelCaption = alphaOver(text, dark ? 0.48 : 0.42, surface);
      var labelDimmed = alphaOver(text, dark ? 0.38 : 0.32, surface);

      // interactions
      var hoverBg = alphaOver(text, dark ? 0.1 : 0.05, surface);
      var activeBg = alphaOver(text, dark ? 0.16 : 0.09, surface);
      var hoverAccent = alphaOver(accent, dark ? 0.22 : 0.14, surface);

      // marks / code
      var codeBg = dark ? adjustLightness(surface, 6) : adjustLightness(surface, -3);
      var codeBg2 = dark ? adjustLightness(surface, 4) : adjustLightness(surface, -1);
      // markdown code/inline-code highlights keep the photo's hue in
      // translucent mode — plain codeBg would render them grey/black/white.
      // On a dark appearance the accent needs a higher share or it reads as
      // black; on light it needs enough to stay visible against the pale wash.
      var mdCodeBg = translucent ? alphaOver(accent, dark ? 0.32 : 0.16, washBase) : codeBg;
      var mdCodeBg2 = translucent ? alphaOver(accent, dark ? 0.24 : 0.11, washBase) : codeBg2;

      var tokens = {
        // -- surfaces -----------------------------------------------------
        // translucent mode: the page base stays a translucent wash so the
        // photo shows through the conversation area, but raised layers
        // (panels, settings, menus) must be near-opaque or their text
        // overlaps/unreadable against the image behind them.
        "--dsw-alias-bg-base": translucent ? wash : surface,
        "--dsw-alias-bg-layer-1": translucent ? (dark ? "rgba(20, 22, 28, 0.94)" : "rgba(249, 250, 251, 0.95)") : layer1,
        "--dsw-alias-bg-layer-2": translucent ? (dark ? "rgba(24, 26, 32, 0.95)" : "rgba(250, 251, 252, 0.96)") : layer2,
        "--dsw-alias-bg-layer-3": translucent ? (dark ? "rgba(27, 29, 36, 0.96)" : "rgba(251, 252, 253, 0.97)") : layer3,
        // overlay / popovers must stay near-opaque or their text becomes
        // unreadable against the photo showing through — even in translucent
        // mode use a solid version of the surface, not the 0.4 wash
        "--dsw-alias-bg-overlay": translucent ? (dark ? "rgba(22, 24, 30, 0.92)" : "rgba(248, 249, 251, 0.94)") : overlay,
        "--dsw-alias-bg-module-platform": translucent ? (dark ? "rgba(24, 26, 32, 0.95)" : "rgba(250, 251, 252, 0.96)") : layer2,
        "--dsw-alias-bg-multi-select": translucent ? (dark ? "rgba(24, 26, 32, 0.95)" : "rgba(250, 251, 252, 0.96)") : layer2,
        "--dsw-alias-bg-skeleton": alphaOver(text, dark ? 0.12 : 0.05, surface),

        // -- borders ------------------------------------------------------
        "--dsw-alias-border-l1": border1,
        "--dsw-alias-border-l2": border2,
        "--dsw-alias-border-l2-darkmode-thin": border2,
        "--dsw-alias-border-l3": border3,
        "--dsw-alias-border-l4": border4,
        "--dsw-alias-border-inverted": onSurface,
        "--dsw-alias-border-inverted2": onSurface,

        // -- brand --------------------------------------------------------
        "--dsw-alias-brand-primary": accent,
        "--dsw-alias-brand-primary-new-colorprimary-new-color": accent,
        "--dsw-alias-brand-text": text,
        "--dsw-alias-brand-primary-invert": onAccent,

        // -- buttons ------------------------------------------------------
        "--dsw-alias-button-primary-fill": accent,
        "--dsw-alias-button-primary-hover": adjustLightness(accent, dark ? 6 : -6),
        "--dsw-alias-button-primary-dimmed": alphaOver(accent, 0.55, surface),
        "--dsw-alias-button-contrast-fill": onAccent,
        "--dsw-alias-button-elevated-fill": translucent ? wash : layer1,
        "--dsw-alias-button-floating-fill": translucent ? wash : layer1,
        "--dsw-alias-button-floating-hover": translucent ? wash : layer2,
        "--dsw-alias-button-ghost-active-border": border3,
        "--dsw-alias-button-ghost-active-fill": translucent ? wash : layer2,
        "--dsw-alias-button-ghost-active-hover": translucent ? wash : layer2,
        "--dsw-alias-button-info-fill": accent,
        "--dsw-alias-button-info-hover": adjustLightness(accent, dark ? 6 : -6),
        "--dsw-alias-button-tool-bar-fill": alphaOver(secondary, 0.5, surface),
        "--dsw-alias-button-tool-bar-fill-invisible": alphaOver(secondary, 0.3, surface),
        "--dsw-alias-button-tool-bar-hover": alphaOver(secondary, 0.6, surface),

        // -- interactions --------------------------------------------------
        // in translucent mode hover/active rows use the photo's accent UNMIXED
        // (selection must match the image's main hue exactly)
        "--dsw-alias-interactive-bg-hover": translucent ? accent : hoverBg,
        "--dsw-alias-interactive-bg-active": translucent ? accent : activeBg,
        "--dsw-alias-interactive-bg-hover-solid": translucent ? accent : layer2,
        "--dsw-alias-interactive-bg-hover-accent": translucent ? accent : hoverAccent,
        "--dsw-alias-interactive-bg-hover-danger": alphaOver("#d92d20", dark ? 0.2 : 0.08, surface),

        // -- labels -------------------------------------------------------
        "--dsw-alias-label-primary": text,
        "--dsw-alias-label-primary-bluish": text,
        "--dsw-alias-label-primary-dimmed": labelTertiary,
        "--dsw-alias-label-primary-foreground": onSurface,
        // inverted = readable on the primary label colour, NOT the accent:
        // DSH's HARNESS wordmark draws its letters with this token over a
        // currentColor block that matches label-primary, so it must contrast
        // with the text colour (dark text -> light mark, light text -> dark
        // mark) or the wordmark vanishes into its own block.
        "--dsw-alias-label-primary-inverted": readableOn(text),
        "--dsw-alias-label-secondary": labelSecondary,
        "--dsw-alias-label-tertiary": labelTertiary,
        "--dsw-alias-label-caption": labelCaption,
        "--dsw-alias-label-dimmed": labelDimmed,

        // -- markdown / code ----------------------------------------------
        "--dsw-alias-markdown-citation": translucent ? alphaOver(accent, dark ? 0.18 : 0.08, washBase) : layer2,
        "--dsw-alias-markdown-code-block": mdCodeBg,
        "--dsw-alias-markdown-code-block-banner": mdCodeBg2,
        "--dsw-alias-markdown-code-segment-selected": translucent ? alphaOver(accent, dark ? 0.18 : 0.13, washBase) : layer2,
        "--dsw-alias-markdown-code-segment-unselected": mdCodeBg2,
        "--dsw-alias-markdown-inline-code": mdCodeBg,
        "--dsw-alias-markdown-placeholder": mdCodeBg2,
        "--dsw-alias-markdown-tag": mdCodeBg2,

        // -- scrollbar ----------------------------------------------------
        "--dsw-alias-scrollbar-bg-l1": alphaOver(text, dark ? 0.2 : 0.1, surface),
        "--dsw-alias-scrollbar-bg-l2": alphaOver(text, dark ? 0.28 : 0.16, surface),
        "--dsw-alias-scrollbar-hover-l1": alphaOver(text, dark ? 0.34 : 0.22, surface),
        "--dsw-alias-scrollbar-hover-l2": alphaOver(text, dark ? 0.42 : 0.3, surface),

        // -- states -------------------------------------------------------
        // business-primary doubles as the input caret colour in some DSH
        // surfaces, so it must stay visible against `surface`, not merely be
        // the accent: lighten it on dark skins, darken on light skins. In
        // translucent (photo) mode the accent IS the point — workspace /
        // sidebar highlights follow the photo's hue, so use it verbatim.
        "--dsw-alias-state-business-primary": translucent ? accent : ensureContrast(accent, surface, 3.0),
        // tertiary doubles as the "预览版 / preview" badge fill — use the
        // pure accent in translucent mode so the badge's fill matches its
        // theme-coloured border
        "--dsw-alias-state-business-tertiary": translucent ? accent : alphaOver(accent, 0.2, surface),
        "--dsw-alias-state-error-primary": "#d92d20",
        "--dsw-alias-state-error-secondary": "#f04438",
        "--dsw-alias-state-success-primary": "#12b76a",
        "--dsw-alias-state-success-secondary": "#32d583",
        "--dsw-alias-state-success-tertiary": alphaOver("#12b76a", 0.18, surface),
        "--dsw-alias-state-warn-primary": "#f79009",
        "--dsw-alias-state-warn-secondary": "#fdb022",
        "--dsw-alias-state-warn-tertiary": alphaOver("#f79009", 0.18, surface),
        "--dsw-alias-state-warn-label": dark ? "#fdb022" : "#b54708",

        // -- chrome -------------------------------------------------------
        "--dsw-alias-toast-bg": translucent ? (dark ? "rgba(22, 24, 30, 0.94)" : "rgba(248, 249, 251, 0.95)") : (dark ? adjustLightness(surface, 12) : overlay),
        "--dsw-alias-tooltip-bg": translucent ? (dark ? "rgba(22, 24, 30, 0.94)" : "rgba(248, 249, 251, 0.95)") : (dark ? adjustLightness(surface, 12) : overlay),
        "--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.24)",
        "--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.12)",
        "--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
        "--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
        "--dsw-alias-bg-mask-drop": dark ? "rgba(30, 30, 36, 0.7)" : "rgba(255, 255, 255, 0.7)",

        // -- specific (component-level seats: sidebar, bubbles, inputs) ----
        "--dsw-specific-bubble": translucent ? alphaOver(accent, dark ? 0.22 : 0.09, washBase) : (dark ? layer2 : layer1),
        "--dsw-specific-bubble-highlight": translucent ? alphaOver(accent, dark ? 0.55 : 0.28, washBase) : alphaOver(accent, dark ? 0.28 : 0.16, surface),
        // input wells are translucent so the photo shows through; the alpha
        // tint keeps the composer / answer box reading as part of the skin
        "--dsw-specific-input-major": translucent ? rgba(accent, 0.18) : (dark ? layer1 : layer1),
        "--dsw-specific-login-input": translucent ? rgba(accent, 0.18) : (dark ? layer2 : layer2),
        "--dsw-specific-menu": translucent ? (dark ? "rgba(22, 24, 30, 0.92)" : "rgba(248, 249, 251, 0.94)") : (dark ? layer3 : layer2),
        "--dsw-specific-selector": translucent ? (dark ? "rgba(22, 24, 30, 0.92)" : "rgba(248, 249, 251, 0.94)") : (dark ? layer2 : layer2),
        // sidebar stays translucent (the photo shows through the nav); only
        // settings/menus/overlays go near-opaque for text legibility
        "--dsw-specific-sidebar-fill": translucent ? wash : (dark ? adjustLightness(surface, 3) : layer1),
        // the active sidebar item keeps the skin's accent even in translucent
        // mode: wash-only would wipe the photo's hue off the navigation
        "--dsw-specific-sidebar-nav-item-active": translucent ? accent : layer2,
        "--dsw-specific-sidebar-nav-item-active-accent": translucent ? accent : alphaOver(accent, dark ? 0.24 : 0.14, surface),
        "--dsw-specific-sidebar-nav-item-hover": translucent ? accent : layer2,
        "--dsw-specific-tip": translucent ? alphaOver(accent, dark ? 0.18 : 0.08, washBase) : (dark ? layer2 : layer1)
      };

      // register() takes a FLAT token map: the presenter writes each entry
      // straight to body.style.setProperty(name, value). ({ light, dark }
      // pairs belong to overrideTokens layers only — wrapping here made every
      // value "[object Object]" and the UI went transparent.)
      return tokens;
    }

    // =====================================================================
    // built-in skins
    // =====================================================================
    var BUILTIN_SKINS = [
      {
        id: "ocean-deep",
        name: { zh: "深海蓝", en: "Ocean Deep" },
        glyph: "🌊",
        // accent/secondary keep the hue; surface/text follow the appearance
        seeds: { accent: "#4d6bfe", secondary: "#6e8bff", surface: "#0e1420", text: "#e8edf7" },
        lightSeeds: { accent: "#4d6bfe", secondary: "#6e8bff", surface: "#f2f5ff", text: "#1c2440" },
        darkSeeds: { accent: "#6e8bff", secondary: "#8fa6ff", surface: "#0e1420", text: "#e8edf7" }
      },
      {
        id: "sakura-pink",
        name: { zh: "樱粉", en: "Sakura Pink" },
        glyph: "🌸",
        seeds: { accent: "#c8447e", secondary: "#d98bb0", surface: "#fdf3f7", text: "#3a1420" },
        lightSeeds: { accent: "#c8447e", secondary: "#d98bb0", surface: "#fdf3f7", text: "#3a1420" },
        darkSeeds: { accent: "#e06b9f", secondary: "#e896ba", surface: "#241019", text: "#fbe3ef" }
      },
      {
        id: "mint-clean",
        name: { zh: "薄荷", en: "Mint Clean" },
        glyph: "🍃",
        seeds: { accent: "#0e9f6e", secondary: "#34d399", surface: "#f2faf6", text: "#0f2e22" },
        lightSeeds: { accent: "#0e9f6e", secondary: "#34d399", surface: "#f2faf6", text: "#0f2e22" },
        darkSeeds: { accent: "#34d399", secondary: "#6ee7b7", surface: "#0d1f18", text: "#e2f7ee" }
      },
      {
        id: "amber-glow",
        name: { zh: "琥珀", en: "Amber Glow" },
        glyph: "🌇",
        seeds: { accent: "#f79009", secondary: "#fdb022", surface: "#1c1610", text: "#fdf1dd" },
        lightSeeds: { accent: "#d97706", secondary: "#f59e0b", surface: "#fdf6ea", text: "#3a2a10" },
        darkSeeds: { accent: "#fbbf24", secondary: "#fcd34d", surface: "#1c1610", text: "#fdf1dd" }
      }
    ];

    /** Resolve the seeds a skin uses for a given appearance. */
    function seedsForAppearance(skin, appearance) {
      if (appearance === "dark" && skin.darkSeeds) return skin.darkSeeds;
      if (appearance === "light" && skin.lightSeeds) return skin.lightSeeds;
      return skin.seeds;
    }

    /** Register a skin (by seeds) with the host theme service. */
    function registerSkin(theme, skin) {
      var tokens = deriveTokens(skin.seeds);
      theme.register({
        id: "skin-" + skin.id,
        colorScheme: luminance(skin.seeds.surface) < 0.35 ? "dark" : "light",
        tokens: tokens
      });
    }

    // =====================================================================
    // image -> custom skin (browser-side; the image never leaves the machine)
    // =====================================================================
    var CUSTOM_LS_IMAGE = "dsh-skins.custom.image";
    var CUSTOM_LS_SEEDS = "dsh-skins.custom.seeds";

    /**
     * Decode an image file (PNG / JPG / WebP), re-encode it to a compact WebP
     * data URL for the background layer, and derive the four seeds from a
     * downsampled sample. Text strokes and near-grey pixels are excluded from
     * the surface estimate so captions don't repaint the whole UI.
     *
     * @param file - user-selected image file.
     * @returns Promise<{ seeds, image, veil }>.
     */
    function processImage(file) {
      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          try {
            var naturalW = img.naturalWidth, naturalH = img.naturalHeight;
            if (!naturalW || !naturalH) { reject(new Error("bad image")); return; }

            // 1) compact background: fit long edge to 1920px, WebP q0.82
            var scale = Math.min(1, 1920 / Math.max(naturalW, naturalH));
            var bw = Math.max(1, Math.round(naturalW * scale));
            var bh = Math.max(1, Math.round(naturalH * scale));
            var bgCanvas = document.createElement("canvas");
            bgCanvas.width = bw; bgCanvas.height = bh;
            var bgCtx = bgCanvas.getContext("2d");
            bgCtx.imageSmoothingQuality = "high";
            bgCtx.drawImage(img, 0, 0, bw, bh);
            var image = bgCanvas.toDataURL("image/webp", 0.82);
            if (image.length > 2 * 1024 * 1024) {
              // still too big: drop quality
              image = bgCanvas.toDataURL("image/webp", 0.6);
            }

            // 2) colour sampling: 64px grid, ignoring near-grey and text ink
            var size = 64;
            var sample = document.createElement("canvas");
            sample.width = size; sample.height = size;
            var sctx = sample.getContext("2d", { willReadFrequently: true });
            sctx.drawImage(img, 0, 0, size, size);
            var data = sctx.getImageData(0, 0, size, size).data;
            URL.revokeObjectURL(url);

            var pixels = [];
            var saturated = [];
            for (var i = 0; i < data.length; i += 4) {
              var a = data[i + 3] / 255;
              if (a < 0.5) continue;
              var r = data[i], g = data[i + 1], b = data[i + 2];
              var hsl = rgbToHsl(r, g, b);
              // text ink / shadows are near-grey and dark; photo sky/whites are
              // near-grey and bright — exclude both so captions can't dominate
              if (hsl.s < 14) continue;
              if (hsl.l < 12 || hsl.l > 88) continue;
              var hex = rgbToHex(r, g, b);
              pixels.push({ r: r, g: g, b: b, h: hsl.h, s: hsl.s, l: hsl.l, hex: hex });
              if (hsl.s >= 30) saturated.push({ r: r, g: g, b: b, h: hsl.h, s: hsl.s, l: hsl.l, hex: hex });
            }
            if (pixels.length === 0) {
              // degenerate image (flat colour): fall back to the plain average
              var fr = 0, fg = 0, fb = 0, n = 0;
              for (var k = 0; k < data.length; k += 4) {
                if (data[k + 3] / 255 < 0.5) continue;
                fr += data[k]; fg += data[k + 1]; fb += data[k + 2]; n++;
              }
              resolve({
                seeds: {
                  accent: rgbToHex(fr / n, fg / n, fb / n),
                  secondary: rgbToHex(fr / n, fg / n, fb / n),
                  surface: rgbToHex(fr / n, fg / n, fb / n),
                  text: luminance(rgbToHex(fr / n, fg / n, fb / n)) < 0.4 ? "#f2f4f8" : "#16181d"
                },
                image: image,
                veil: 0.55
              });
              return;
            }

            // surface: average of the colour-bearing pixels
            var sumR = 0, sumG = 0, sumB = 0;
            for (var j = 0; j < pixels.length; j++) {
              sumR += pixels[j].r; sumG += pixels[j].g; sumB += pixels[j].b;
            }
            var surface = rgbToHex(sumR / pixels.length, sumG / pixels.length, sumB / pixels.length);

            // accent: dominant saturated hue bucket, averaged
            var buckets = {};
            var pool = saturated.length >= pixels.length * 0.05 ? saturated : pixels;
            for (var m = 0; m < pool.length; m++) {
              var p = pool[m];
              var key = Math.round(p.h / 24);
              (buckets[key] = buckets[key] || []).push(p);
            }
            var best = null;
            for (var bk in buckets) {
              if (!best || buckets[bk].length > best.pixels.length) best = { key: bk, pixels: buckets[bk] };
            }
            var accent = surface;
            if (best && best.pixels.length >= pool.length * 0.04) {
              var ar = 0, ag = 0, ab = 0;
              for (var q = 0; q < best.pixels.length; q++) {
                ar += best.pixels[q].r; ag += best.pixels[q].g; ab += best.pixels[q].b;
              }
              accent = rgbToHex(ar / best.pixels.length, ag / best.pixels.length, ab / best.pixels.length);
            }

            var dark = luminance(surface) < 0.4;
            var text = dark ? "#f2f4f8" : "#16181d";
            var aHsl = hexToHsl(accent);
            var secondary = hslToHex(aHsl.h + 30, Math.min(85, aHsl.s + 10), Math.max(30, Math.min(80, aHsl.l + 12)));

            // veil: darker photos need a heavier wash to keep text legible,
            // but keep it light enough that the background image stays visible
            var baseLum = luminance(surface);
            var veil = baseLum > 0.55 ? 0.16 : baseLum > 0.35 ? 0.22 : 0.32;

            resolve({
              seeds: { accent: accent, secondary: secondary, surface: surface, text: text },
              image: image,
              veil: veil
            });
          } catch (err) {
            URL.revokeObjectURL(url);
            reject(err);
          }
        };
        img.onerror = function () {
          URL.revokeObjectURL(url);
          reject(new Error("decode failed"));
        };
        img.src = url;
      });
    }

    /** Set or clear the fixed background image layer (body::before). */
    function applyBackground(image, veil, appearance) {
      var host = document.documentElement;
      if (image) {
        host.style.setProperty("--dsh-skin-bg-image", "url(" + image + ")");
        host.style.setProperty("--dsh-skin-bg-veil", String(veil));
        // light appearance -> pale wash brightens the photo; dark -> deep wash
        host.style.setProperty("--dsh-skin-bg-mask", appearance === "light" ? "rgba(245, 246, 250, var(--dsh-skin-bg-veil, 0.25))" : "rgba(5, 6, 9, var(--dsh-skin-bg-veil, 0.25))");
        host.setAttribute("data-dsh-skin-bg", "image");
      } else {
        host.style.removeProperty("--dsh-skin-bg-image");
        host.style.removeProperty("--dsh-skin-bg-veil");
        host.style.removeProperty("--dsh-skin-bg-mask");
        host.removeAttribute("data-dsh-skin-bg");
      }
    }

    // =====================================================================
    // settings row
    // =====================================================================
    var SKINS_NS = "settings.skins";

    var zh = {
      "skins.title": "皮肤",
      "skins.default": "默认",
      "skins.custom": "自定义（选图）",
      "skins.customHint": "选一张 PNG / JPG / WebP，整套配色跟着图走",
      "skins.customActive": "自定义",
      "skins.builtin": "内置皮肤"
    };
    var en = {
      "skins.title": "Skins",
      "skins.default": "Default",
      "skins.custom": "Custom (image)",
      "skins.customHint": "Pick a PNG / JPG / WebP — the whole palette follows the image",
      "skins.customActive": "Custom",
      "skins.builtin": "Built-in skins"
    };

    var cssText =
      ".dsh-skins-row{display:flex;flex-direction:column;gap:10px;padding:16px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}" +
      ".dsh-skins-title{color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px;font-weight:400}" +
      ".dsh-skins-grid{display:flex;flex-wrap:wrap;gap:8px}" +
      ".dsh-skins-card{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;padding:8px 10px;display:flex;align-items:center;gap:8px;font-size:13px;line-height:20px;flex:0 0 auto}" +
      ".dsh-skins-card:hover:not(.dsh-skins-card-selected){background:var(--dsw-alias-interactive-bg-hover)}" +
      ".dsh-skins-card-selected{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 1px var(--dsw-alias-brand-primary) inset}" +
      ".dsh-skins-swatch{width:14px;height:14px;border-radius:4px;border:1px solid var(--dsw-alias-border-l3);flex:0 0 auto}" +
      ".dsh-skins-hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}" +
      // When a custom-image skin is active the selected row's background is
      // the pure photo accent; its text must flip to the readable pole so
      // bright accents (yellow, cyan) don't wash the label out. Applies to
      // any element the skin selects (aria-selected rows, nav items).
      "html[data-dsh-skin-bg=image] [aria-selected=\"true\"],html[data-dsh-skin-bg=image] [class*=\"selected\"]{color:var(--dsh-skin-on-accent,#fff)!important}" +
      // fixed background layer for custom-image skins: the image sits behind
      // everything at the viewport, never scaling with the conversation panel.
      // The attribute lives on <html> (applyBackground sets it there), so the
      // selectors target html, not body.
      "html[data-dsh-skin-bg=image]::before{content:'';position:fixed;inset:0;z-index:-1;background-image:var(--dsh-skin-bg-image);background-size:cover;background-position:center;background-repeat:no-repeat}" +
      "html[data-dsh-skin-bg=image]::after{content:'';position:fixed;inset:0;z-index:-1;background:var(--dsh-skin-bg-mask, rgba(5,6,9,0.3))}";

    var styleTag = null;
    function ensureStyle() {
      if (styleTag || typeof document === "undefined") return;
      styleTag = document.createElement("style");
      styleTag.dataset.plugin = "dsh-client-ui-skins";
      styleTag.textContent = cssText;
      document.head.appendChild(styleTag);
    }

    /**
     * Skin picker row. Props from the slot framework: `t`, `useStore`
     * (store seat), plus the injected `applySkin` action.
     */
    function SkinsRow(props) {
      var t = props.t;
      var useStore = props.useStore;
      var applySkin = props.applySkin;
      var activeId = useStore(function (s) { return s.active; });
      var customSeeds = useStore(function (s) { return s.customSeeds; });
      ensureStyle();

      var cards = BUILTIN_SKINS.map(function (skin) {
        var id = "skin-" + skin.id;
        var selected = activeId === id;
        return jsxRuntime.jsx(
          "button",
          {
            type: "button",
            className: "dsh-skins-card" + (selected ? " dsh-skins-card-selected" : ""),
            "aria-pressed": selected,
            onClick: function () { applySkin(id); },
            children: [
              jsxRuntime.jsx("span", {
                className: "dsh-skins-swatch",
                style: { background: "linear-gradient(135deg, " + skin.seeds.accent + ", " + skin.seeds.surface + ")" }
              }),
              skin.glyph,
              " ",
              skin.name.zh
            ]
          },
          id
        );
      });

      var customActive = activeId === "skin-custom";
      var customCard = jsxRuntime.jsx(
        "button",
        {
          type: "button",
          className: "dsh-skins-card" + (customActive ? " dsh-skins-card-selected" : ""),
          "aria-pressed": customActive,
          onClick: function () {
            var input = document.createElement("input");
            input.type = "file";
            input.accept = "image/png,image/jpeg,image/webp";
            input.onchange = function () {
              var f = input.files && input.files[0];
              if (!f) return;
              processImage(f).then(function (result) {
                applySkin("skin-custom", result.seeds, result.image, result.veil);
              }).catch(function () { /* silently ignore decode failures */ });
            };
            input.click();
          },
          children: [
            jsxRuntime.jsx("span", { className: "dsh-skins-swatch", style: customSeeds ? { background: "linear-gradient(135deg, " + customSeeds.accent + ", " + customSeeds.surface + ")" } : undefined }),
            "🖼️ ",
            t("skins.custom")
          ]
        },
        "custom"
      );

      // native appearance: clears every skin token and the photo layer
      var defaultActive = activeId === "system";
      var defaultCard = jsxRuntime.jsx(
        "button",
        {
          type: "button",
          className: "dsh-skins-card" + (defaultActive ? " dsh-skins-card-selected" : ""),
          "aria-pressed": defaultActive,
          onClick: function () { applySkin("system"); },
          children: [
            jsxRuntime.jsx("span", { className: "dsh-skins-swatch", style: { background: "linear-gradient(135deg, var(--dsw-alias-brand-primary), var(--dsw-alias-bg-base))" } }),
            "🎨 ",
            t("skins.default")
          ]
        },
        "default"
      );

      return jsxRuntime.jsxs("div", {
        className: "dsh-skins-row",
        children: [
          jsxRuntime.jsx("div", { className: "dsh-skins-title", children: t("skins.title") }),
          jsxRuntime.jsxs("div", { className: "dsh-skins-grid", children: [defaultCard, customCard].concat(cards) }),
          jsxRuntime.jsx("div", { className: "dsh-skins-hint", children: t("skins.customHint") })
        ]
      });
    }

    function createSkinsRowStore() {
      return clientRuntime.defineStore({
        init: function () {
          return { active: "system", revision: -1, customSeeds: null };
        },
        actions: {
          sync: function (d, active, revision, customSeeds) {
            if (revision <= d.revision) return;
            d.active = active;
            d.revision = revision;
            if (customSeeds !== undefined) d.customSeeds = customSeeds;
          }
        }
      });
    }

    // =====================================================================
    // plugin body
    // =====================================================================
    var inject = ["slots", "locale", "theme"];

    // The Host settings document only exposes a hard-coded allowlist of
    // namespaces to the browser (dsh-host-apiproxy WEB_SETTINGS_NAMESPACES);
    // a plugin cannot expose its own namespace without editing that package.
    // A skin choice is a pure front-end visual preference, so it persists in
    // localStorage — nothing about the skin ever needs the settings seam.
    var LS_ACTIVE = "dsh-skins.active";

    function loadLS(key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw === null ? fallback : raw;
      } catch (err) { return fallback; }
    }
    function saveLS(key, value) {
      try { localStorage.setItem(key, value); } catch (err) { /* quota / privacy mode */ }
    }

    function apply(ctx) {
      var theme = ctx.get("theme");
      var store = createSkinsRowStore();

      // inject the stylesheet at activation, not lazily from the settings row:
      // the fixed background layer must exist even before the user ever opens
      // General settings (e.g. restoring a custom skin on reload)
      ensureStyle();

      var bound = null;
      var revision = 0;
      var customSeeds = null;
      var customDispose = null;
      var currentSkin = "system"; // "system" = native appearance

      // register built-in skins (idempotent per session: duplicate register throws)
      BUILTIN_SKINS.forEach(function (skin) {
        try {
          registerSkin(theme, skin);
        } catch (err) {
          // already registered (e.g. HMR re-activation) — ignore
        }
      });

      ctx.effect(function () {
        return ctx.locale.register(SKINS_NS, { zh: zh, en: en });
      }, "dsh-client-ui-skins: settings row dictionaries");

      /**
       * Resolved appearance (light|dark) from the theme service's active
       * snapshot. The skin palette follows it so light/dark switching keeps
       * working: light -> pale wash + dark text, dark -> deep wash + light
       * text.
       */
      function currentAppearance() {
        try {
          var snap = theme.getTheme();
          return snap.active && snap.active.colorScheme === "dark" ? "dark" : "light";
        } catch (err) {
          return "light";
        }
      }
      /** Resolve the token map for a skin id given the current appearance. */
      function resolveSkinTokens(id, appearance) {
        var app = appearance || currentAppearance();
        if (id === "skin-custom") {
          if (!customSeeds) return null;
          return deriveTokens(customSeeds, true, app);
        }
        for (var i = 0; i < BUILTIN_SKINS.length; i++) {
          if ("skin-" + BUILTIN_SKINS[i].id === id) {
            return deriveTokens(seedsForAppearance(BUILTIN_SKINS[i], app), false, app);
          }
        }
        return null;
      }
      /** Whether a skin id is ours (built-in or custom). */
      function isOurSkin(id) {
        return id === "skin-custom" || BUILTIN_SKINS.some(function (s) { return "skin-" + s.id === id; });
      }
      /** Write a token map onto body.style. */
      function writeTokensToBody(tokens) {
        if (!tokens || typeof document === "undefined") return;
        for (var name in tokens) {
          document.body.style.setProperty(name, tokens[name]);
        }
      }
      /** Remove every token variable we own from body.style. */
      function clearSkinTokens() {
        if (typeof document === "undefined") return;
        var names = [
          "--dsw-alias-bg-base", "--dsw-alias-bg-layer-1", "--dsw-alias-bg-layer-2",
          "--dsw-alias-bg-layer-3", "--dsw-alias-bg-overlay", "--dsw-alias-bg-module-platform",
          "--dsw-alias-bg-multi-select", "--dsw-alias-bg-skeleton", "--dsw-alias-border-l1",
          "--dsw-alias-border-l2", "--dsw-alias-border-l2-darkmode-thin", "--dsw-alias-border-l3",
          "--dsw-alias-border-l4", "--dsw-alias-border-inverted", "--dsw-alias-border-inverted2",
          "--dsw-alias-brand-primary", "--dsw-alias-brand-primary-new-colorprimary-new-color",
          "--dsw-alias-brand-text", "--dsw-alias-brand-primary-invert", "--dsw-alias-button-primary-fill",
          "--dsw-alias-button-primary-hover", "--dsw-alias-button-primary-dimmed",
          "--dsw-alias-button-contrast-fill", "--dsw-alias-button-elevated-fill",
          "--dsw-alias-button-floating-fill", "--dsw-alias-button-floating-hover",
          "--dsw-alias-button-ghost-active-border", "--dsw-alias-button-ghost-active-fill",
          "--dsw-alias-button-ghost-active-hover", "--dsw-alias-button-info-fill",
          "--dsw-alias-button-info-hover", "--dsw-alias-button-tool-bar-fill",
          "--dsw-alias-button-tool-bar-fill-invisible", "--dsw-alias-button-tool-bar-hover",
          "--dsw-alias-interactive-bg-hover", "--dsw-alias-interactive-bg-active",
          "--dsw-alias-interactive-bg-hover-solid", "--dsw-alias-interactive-bg-hover-accent",
          "--dsw-alias-interactive-bg-hover-danger", "--dsw-alias-label-primary",
          "--dsw-alias-label-primary-bluish", "--dsw-alias-label-primary-dimmed",
          "--dsw-alias-label-primary-foreground", "--dsw-alias-label-primary-inverted",
          "--dsw-alias-label-secondary", "--dsw-alias-label-tertiary", "--dsw-alias-label-caption",
          "--dsw-alias-label-dimmed", "--dsw-alias-markdown-citation", "--dsw-alias-markdown-code-block",
          "--dsw-alias-markdown-code-block-banner", "--dsw-alias-markdown-code-segment-selected",
          "--dsw-alias-markdown-code-segment-unselected", "--dsw-alias-markdown-inline-code",
          "--dsw-alias-markdown-placeholder", "--dsw-alias-markdown-tag", "--dsw-alias-scrollbar-bg-l1",
          "--dsw-alias-scrollbar-bg-l2", "--dsw-alias-scrollbar-hover-l1", "--dsw-alias-scrollbar-hover-l2",
          "--dsw-alias-state-business-primary", "--dsw-alias-state-business-tertiary",
          "--dsw-alias-state-error-primary", "--dsw-alias-state-error-secondary",
          "--dsw-alias-state-success-primary", "--dsw-alias-state-success-secondary",
          "--dsw-alias-state-success-tertiary", "--dsw-alias-state-warn-primary",
          "--dsw-alias-state-warn-secondary", "--dsw-alias-state-warn-tertiary",
          "--dsw-alias-state-warn-label", "--dsw-alias-toast-bg", "--dsw-alias-tooltip-bg",
          "--dsw-alias-bg-mask-1", "--dsw-alias-bg-mask-2", "--dsw-alias-bg-mask-3",
          "--dsw-alias-bg-mask-photo", "--dsw-alias-bg-mask-drop", "--dsw-specific-bubble",
          "--dsw-specific-bubble-highlight", "--dsw-specific-input-major", "--dsw-specific-login-input",
          "--dsw-specific-menu", "--dsw-specific-selector", "--dsw-specific-sidebar-fill",
          "--dsw-specific-sidebar-nav-item-active", "--dsw-specific-sidebar-nav-item-active-accent",
          "--dsw-specific-sidebar-nav-item-hover", "--dsw-specific-tip"
        ];
        for (var i = 0; i < names.length; i++) {
          document.body.style.removeProperty(names[i]);
        }
      }
      /** Reflect the current skin into the settings-row store. */
      function publish() {
        revision += 1;
        bound && bound.sync(isOurSkin(currentSkin) ? currentSkin : "system", revision, customSeeds);
      }

      // Apply (or clear) the active skin by writing its tokens straight to the
      // body. We deliberately do NOT drive this through theme.setTheme: ui-theme
      // owns the appearance preference (light/dark/system) and re-adopts it from
      // the Host document whenever its settings scope refreshes, which would
      // clobber a skin preference. Instead the skin is an orthogonal overlay:
      // the appearance preference keeps controlling colour-scheme + the base
      // palette, and our token map repaints every alias on top of it. The
      // presenter's theme/change repaint of an empty built-in theme also
      // retracts tokens, so we re-apply after every change.
      function applySkinState() {
        if (typeof document === "undefined") return;
        var appearance = currentAppearance();
        clearSkinTokens();
        if (currentSkin === "system") return;
        var tokens = resolveSkinTokens(currentSkin, appearance);
        if (tokens) {
          writeTokensToBody(tokens);
          // selected rows use the pure photo accent as their background; set
          // the on-accent text colour (bright accent -> dark text, dark
          // accent -> light text) so the label stays readable
          var accentSeed = null;
          if (currentSkin === "skin-custom") accentSeed = customSeeds && customSeeds.accent;
          else {
            for (var i = 0; i < BUILTIN_SKINS.length; i++) {
              if ("skin-" + BUILTIN_SKINS[i].id === currentSkin) accentSeed = BUILTIN_SKINS[i].seeds.accent;
            }
          }
          if (accentSeed) {
            document.documentElement.style.setProperty("--dsh-skin-on-accent", readableOn(accentSeed));
          }
          // The HARNESS wordmark draws its background block AND letters with
          // the same currentColor, so it must contrast with the sidebar
          // background, not match the label colour. Derive it from the wash
          // base of the current appearance (dark wash -> light mark, pale
          // wash -> dark mark).
          document.documentElement.style.setProperty("--dsh-skin-brand-mark", appearance === "dark" ? "#f5f5f5" : "#1a1a1a");
          // The appearance preference rules the base colour-scheme and the
          // body's dark attribute — ui-layout's presenter already sets both on
          // every theme/change, so we must NOT touch them here or we would
          // freeze the appearance and break light/dark switching.
        }
        // custom photo: re-tint the mask with the appearance (photo unchanged)
        if (currentSkin === "skin-custom" && customSeeds) {
          var img = loadLS(CUSTOM_LS_IMAGE, "");
          if (img) applyBackground(img, customSeeds.veil || 0.25, appearance);
        }
      }

      // Repaint the skin after every theme/change (presenter may have just
      // applied the built-in theme and retracted our tokens).
      var off = ctx.on("theme/change", function () {
        publish();
        if (isOurSkin(currentSkin)) {
          applySkinState();
        }
      });

      // restore the persisted skin (and a persisted custom skin's seeds+image)
      var saved = loadLS(LS_ACTIVE, "system");
      if (saved !== "system" && saved !== "light" && saved !== "dark") {
        if (saved === "skin-custom") {
          try {
            var savedCustom = JSON.parse(loadLS(CUSTOM_LS_SEEDS, "null"));
            if (savedCustom && savedCustom.accent) {
              customSeeds = savedCustom;
              customDispose = theme.register({
                id: "skin-custom",
                colorScheme: luminance(savedCustom.surface) < 0.35 ? "dark" : "light",
                tokens: deriveTokens(savedCustom, true)
              });
              var savedImage = loadLS(CUSTOM_LS_IMAGE, "");
              if (savedImage) applyBackground(savedImage, savedCustom.veil || 0.25, currentAppearance());
            }
          } catch (err) { /* malformed persisted seeds */ }
        }
        var snapshot = theme.getTheme();
        var exists = snapshot.themes.some(function (th) { return th.id === saved; });
        if (exists) {
          currentSkin = saved;
          // defer past the adopt / layout-activation window
          setTimeout(function () { applySkinState(); }, 300);
        }
      }

      var injected = function (actions) {
        bound = actions;
        publish();
        return {
          applySkin: function (id, seeds, image, veil) {
            if (id === "skin-custom") {
              if (!seeds) return;
              // rebuild the custom skin: dispose the old registration first
              if (customDispose) {
                customDispose();
                customDispose = null;
              }
              customSeeds = seeds;
              customSeeds.veil = veil || 0.4;
              customDispose = theme.register({
                id: "skin-custom",
                colorScheme: luminance(seeds.surface) < 0.35 ? "dark" : "light",
                tokens: deriveTokens(seeds, true)
              });
              saveLS(CUSTOM_LS_SEEDS, JSON.stringify(customSeeds));
              if (image) {
                saveLS(CUSTOM_LS_IMAGE, image);
                applyBackground(image, customSeeds.veil, currentAppearance());
              } else {
                saveLS(CUSTOM_LS_IMAGE, "");
                applyBackground(null);
              }
              currentSkin = "skin-custom";
            } else {
              // switching to a built-in skin or native: drop the background layer
              applyBackground(null);
              currentSkin = id;
            }
            applySkinState();
            saveLS(LS_ACTIVE, currentSkin);
          }
        };
      };

      ctx.slots.inject("settings.general.item", function () {
        return ctx.slots.register({
          name: "settings.general.item",
          id: "skins",
          order: 20,
          store: store,
          locale: SKINS_NS,
          inject: injected
        }, SkinsRow);
      });

      return function () {
        off();
        customDispose && customDispose();
        clearSkinTokens();
        applyBackground(null);
      };
    }

    exports.SKINS_NS = SKINS_NS;
    exports.BUILTIN_SKINS = BUILTIN_SKINS;
    exports.deriveTokens = deriveTokens;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});

//# sourceMappingURL=client.js.map
