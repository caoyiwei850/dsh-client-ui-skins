# dsh-client-ui-skins

DeepSeek Harness (DSH) Web 界面换肤插件：4 套内置皮肤 + 自定义图片皮肤，图片作为整个界面背景，配色自动跟随图片主色调。

纯 client 插件，不改任何 DSH 源码；卸载后完全恢复原生外观。

## 功能

- **4 套内置皮肤**：深海蓝 / 樱粉 / 薄荷 / 琥珀（深浅色外观各一套配色）
- **自定义图片皮肤**：上传 PNG / JPG / WebP，图片作为整个 Web 界面的背景（半透明蒙版），配色自动从图片提取并跟随主色调
- **外观跟随**：深色 / 浅色 / 跟随系统切换时，皮肤配色同步切换
- **主色联动**：会话选中态（纯主色）、功能区边框、代码高亮、输入框底色全部跟随图片主色调
- **可读性保证**：亮主色自动切换深色文字，暗主色自动切换浅色文字
- **持久化**：皮肤选择与自定义图片保存在本地（localStorage），刷新后恢复
- **默认选项**：随时一键恢复原生外观

## 安装

前置：DSH web profile（`~/.dsh/profiles/web`）、pnpm。

### 方式 A：一键脚本

```bash
bash install-dsh-skins.sh
```

### 方式 B：手动

```bash
# 1. 安装包
cd ~/.dsh/profiles/web && pnpm add -w <path-to>/dsh-client-ui-skins-0.1.5.tgz

# 2. 注册（编辑 ~/.dsh/profiles/web/cordis.patch.yml，追加：）
#    - insert:
#        - id: ui-skins
#          name: 'dsh-client-ui-skins'

# 3. 重启 web
launchctl kickstart -k gui/$(id -u)/com.deepseek.dsh.web
```

### 方式 C：源码安装（开发）

```bash
git clone https://github.com/<your-name>/dsh-client-ui-skins.git
cd ~/.dsh/profiles/web
pnpm add -w file:/path/to/dsh-client-ui-skins
# 然后按方式 B 的第 2、3 步
```

安装后刷新 `http://127.0.0.1:3080`，左下角 **设置 → 通用设置 → 皮肤** 即可换肤。

## 卸载

```bash
bash uninstall-dsh-skins.sh
```

## 使用

1. 打开 **设置 → 通用设置 → 皮肤**
2. 点任意内置皮肤卡片，立即生效
3. 点「自定义（选图）」上传一张图片，整套配色跟着图走
4. 点「默认」恢复原生外观

> 自定义皮肤图片只在本机流转（localStorage 存储压缩后的 WebP），不会上传到任何服务器。

## 开发

插件结构：

```
dsh-client-ui-skins/
├── package.json          # dsh.client 双面包声明
├── lib/
│   ├── index.js          # Host 侧：注册 ui-skins 设置 namespace
│   └── client.js         # Client 侧：皮肤推导、背景层、设置面板 UI
└── scripts/              # 一键安装/卸载脚本
```

核心机制：

- 通过 DSH 原生 `theme.register()` 注册皮肤 token（`--dsw-*` 变量）
- 皮肤作为**正交覆盖层**直接写 body style，不抢占 ui-theme 的外观 preference
- 4 色种（accent / secondary / surface / text）→ OKLab 思路的 HSL 推导 → 78 个语义 token
- 自定义图片：浏览器本地 96px 采样取色（忽略文字/黑白像素），压缩为 WebP 存 localStorage

## 许可证

MIT © [your-name]
