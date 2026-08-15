# Changelog

## [0.1.7] - 2026-08-15

### Fixed
- Appearance selector cubes (浅色/深色/跟随系统): selected label now follows
  the appearance (dark -> white on the dark cube, light -> dark on the pale
  cube) instead of the photo accent.
- Produced-files rows (产物) flip their label to the accent-readable pole so
  file names stay legible on the pure-accent background.

## [0.1.6] - 2026-08-15

### Fixed
- HARNESS wordmark now stays readable in both appearances: its letters use
  `label-primary-inverted` derived from the text colour (dark text -> light
  mark, light text -> dark mark), matching DSH's native behaviour.
- The "预览版 / preview" badge fills with the pure accent in translucent mode
  so its fill matches its theme-coloured border.

All notable changes to this project are documented in this file.

## [0.1.5] - 2026-08-15

### Fixed
- Selected row text now flips to the readable pole on pure-accent backgrounds
  (bright accents like yellow use dark text, dark accents use light text).
- Functional borders (`--dsw-alias-border-l*`) tint with the skin's accent in
  translucent mode instead of staying grey.
- Input wells (composer / answer box) are translucent (accent at 0.18 alpha)
  so the background photo shows through.

### Changed
- Session selection background uses the pure photo accent, unmixed.

## [0.1.4] - 2026-08-15

### Added
- **Default** option in the skin picker to restore the native appearance.
- Code / inline-code highlights, session selection and input wells now follow
  the photo's accent hue.

### Fixed
- Light/dark appearance switching now works again (skins follow the resolved
  appearance; the plugin no longer pins colour-scheme itself).
- Settings panel, menus and popovers use near-opaque surfaces so their text
  stays readable against the background photo (sidebar stays translucent).

## [0.1.0] - 2026-08-14

### Added
- Initial release: 4 built-in skins, custom image skins (photo as full-UI
  background), accent-aware palette derivation, localStorage persistence.
