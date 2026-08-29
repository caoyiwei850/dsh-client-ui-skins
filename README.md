# DSH 皮肤插件 · dsh-client-ui-skins v0.1.16

给 DeepSeek Harness (DSH) Web 界面换肤：4 套内置皮肤 + 自定义图片/视频皮肤。
自定义皮肤把整张图片（PNG / JPG / WebP）或视频（MP4 / WebM）作为界面背景，
整套配色（背景、强调色、交互高亮）自动跟随画面主色调。

主要特性：
- **4 套内置皮肤**：深海蓝 / 樱粉 / 薄荷 / 琥珀，深色浅色外观都适配。
- **自定义图片壁纸**：任意 PNG / JPG / WebP，配色自动取自主图。
- **视频动态壁纸**：MP4 / WebM 循环播放，首帧取色生成配色。
- **背景遮罩滑块**：独立调节壁纸明暗，避免文字被背景图吃掉。
- **输入框不透明度滑块**：独立调节输入框背景，保证打字清晰。
- **正文加强开关**：给助手正文加一层轻磨砂底，照片高光区也不影响阅读。

## 效果预览

自定义图片皮肤支持任意 PNG / JPG / WebP：导入自己的图片后，背景、强调色与交互高亮会自动跟随图片主色调。以下仅为界面效果示例。

![DSH 自定义皮肤效果示例 1](assets/screenshots/mint-forest-dsh.jpg)

![DSH 自定义皮肤效果示例 2](assets/screenshots/ocean-guardian-dsh.jpg)

![DSH 自定义皮肤效果示例 3](assets/screenshots/crimson-moon-dsh.jpg)

## 文件

| 文件 | 作用 |
| --- | --- |
| `dsh-client-ui-skins-0.1.13.tgz` | 插件安装包（npm tarball） |
| `install-dsh-skins.sh` | 一键安装脚本 |
| `uninstall-dsh-skins.sh` | 一键卸载脚本 |

## 安装（二选一）

### 方式 A：一键脚本（推荐）
```bash
bash install-dsh-skins.sh
```
脚本会自动：装包 → 注册 → 重启。完成后刷新 `http://127.0.0.1:3080`，
左下角 **设置 → 通用设置 → 皮肤** 即可换肤。

### 方式 B：手动
```bash
# 1. 装包
cd ~/.dsh/profiles/web && pnpm add -w ./dsh-client-ui-skins-0.1.13.tgz

# 2. 注册（编辑 ~/.dsh/profiles/web/cordis.patch.yml，追加：）
#    - insert:
#        - id: ui-skins
#          name: 'dsh-client-ui-skins'

# 3. 重启 web
launchctl kickstart -k gui/$(id -u)/com.deepseek.dsh.web
```
其实你也可以直接扔给DeepSeek harness自己安装。
## 卸载
```bash
bash uninstall-dsh-skins.sh
```

## 使用

设置 → 通用设置 → 皮肤：
- 点内置皮肤卡片直接切换；点「自定义（选图/视频）」选图片或视频。
- 自定义皮肤激活后出现「背景遮罩」「输入框不透明度」两个滑块，
  以及「正文加强」开关，均可实时预览并记住偏好。

## 备注
- 插件是纯 client 插件，不改任何 DSH 源码；卸载后完全恢复原生外观。
- 自定义皮肤图片/视频只在本机流转（图片存 localStorage、视频存
  IndexedDB），不会上传到任何服务器。
- 需要 DSH web profile（`~/.dsh/profiles/web`），依赖 pnpm。
