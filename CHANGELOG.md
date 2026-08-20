# Changelog

## [0.1.11] - 2026-08-20

### Fixed
- peerDependencies 的 DSH 包版本约束从 `^0.1.0-rc.8` 改为
  `>=0.1.0-rc.8`。`^` 只覆盖到 `<0.2.0`，DSH 升到 0.2.0/1.0.0 等次版本
  跨位时 peerDep 仍会不满足、装不上插件；`>=` 是纯下限无上限，rc.8 及
  以后所有版本都满足，以后 DSH 升级不再因 peerDep 锁版本而失败。

## [0.1.10] - 2026-08-18

### Added
- 动态壁纸：自定义皮肤支持选 MP4 / WebM 视频作为循环播放的动态背景。
  - 取色：`processVideo` 把视频 seek 到首帧 → canvas 截帧 → 复用图片壁纸
    的像素采样逻辑生成调色板，整套配色跟随视频画面。
  - 播放：固定定位 `<video>`（`z-index:-2`，loop + muted + autoplay），
    上叠 veil 遮罩保证文字可读。
  - 持久化：调色板存 localStorage，视频 Blob 存 IndexedDB（不受
    localStorage 5MB 限制）。
  - 恢复：启动时从 IndexedDB 异步读 Blob → createObjectURL → 播放。
  - 清理：切到其它皮肤时停视频、revokeObjectURL、删 IndexedDB 记录。
  - 视频模式（`data-dsh-skin-bg=video`）镜像了图片模式全部的对比度补救
    CSS 规则，选中行 / toast / 文件行 / 警告条等文字均保持可读。

## [0.1.9] - 2026-08-16

### Fixed
- Toast 弹窗（及卡片上的移除按钮）文字在深色自定义皮肤下重新可读：
  `--dsw-alias-button-contrast-fill` 原本派生自强调色（`readableOn(accent)`），
  而它配对的文字 token `--dsw-alias-label-primary-inverted` 派生自文字色
  （`readableOn(text)`，深色模式下恒为深色）。当用户用偏亮强调色的照片
  （黄/青/绿，照片里很常见）做自定义皮肤时，两者同时落在深色极——文字被
  背景吞掉，对比度 1.00，完全看不见。现在 contrast-fill 派生为
  `label-primary-inverted` 的可读背景（相反极性），与 DSH 内置深/浅主题的
  语义一致，全肤色/外观组合对比度 ≥ 15（AA 级）。

## [0.1.8] - 2026-08-15

### Fixed
- Skin picker highlight now follows the clicked skin immediately (publish the
  selection to the settings-row store after applying, instead of only on
  theme/change).

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
