# Changelog

## [0.1.14] - 2026-08-28

### Fixed
- 插件加载顺序修复（不限于 Windows）：在 `dsh.client.external` 声明
  `@deepseek-ai/dsh-client-runtime/client`，让运行时工厂先到达，再执行皮肤包的
  同步 `require()`，避免在运行时就绪前加载导致报错。

## [0.1.13] - 2026-08-27

### Added
- 「正文加强」开关：给助手正文加一层轻磨砂底（backdrop-filter blur + 半透明
  背景），照片高光区不再吃掉正文；默认关闭，仅自定义图片/视频皮肤显示。
- 设置面板皮肤区删除「选一张 PNG / JPG / WebP 或 MP4 / WebM 视频…」提示文案
  （界面更简洁）；README 更新产品介绍。

## [0.1.12] - 2026-08-27

### Added
- 自定义图片/视频皮肤下，设置→通用→皮肤面板新增两个透明度滑块：
  - 背景遮罩（控制整个 page wash + 壁纸 veil 的不透明度，0-100）
  - 输入框不透明度（控制 composer/登录框背景 alpha，0-100）
  - 滑块实时生效，存 localStorage，刷新恢复；仅自定义皮肤激活时显示。
- 助手正文磨砂底：浅色模式下正文深色文字压在照片高光区会被吃掉发灰，
  给 `[data-chat-flow-kind=assistant-step]` 的 markdown 容器加一层轻薄
  `backdrop-filter: blur` + 半透明背景，只覆盖正文不碰整体背景透明度；
  深色模式用深色半透明底。

### Changed
- translucent 模式下辅助标签色（label-secondary/tertiary/caption/dimmed）
  从半透明预合成改为固定不透明分级色，避免照片亮部让半透明标签糊掉。
- 输入框背景从 `alphaOver(accent, 0.22, washBase)` 改为
  `rgba(中性深色, ia)`，亮 accent（黄/青）下不再偏亮，文字对比度稳定。
- Host 侧 `lib/index.js` 清空（皮肤是纯 localStorage 偏好，原 ui-skins
  settings namespace 是死代码）；顺带去掉 `@deepseek-ai/dsh-settings` 和
  `@deepseek-ai/schemastery` 两个 peerDep 和 lib/types 引用。
- selected 行 on-accent 规则收窄到 `[role="treeitem"][aria-selected]`。

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
