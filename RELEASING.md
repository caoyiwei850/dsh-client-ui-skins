# 发版指南 · Releasing

本仓库发布到 **npm**（`dsh-client-ui-skins`）的完整流程。发版前请确保改动已在 `main` 分支并推送到 GitHub。

## 前置条件

- 本机已登录 npm：`npm whoami` 应输出你的用户名（`caoyiwei`）。
- `~/.npmrc` 的 registry 为官方源：`https://registry.npmjs.org/`（不要用镜像源发布）。
- 发布需要 2FA：账号开启了双因素认证时，要么交互式输入验证码，要么用带 **Bypass 2FA** 的 granular token（本机已配置）。

## 发版步骤

### 1. 确认版本号

检查 `package.json` 的 `version` 是否为将要发布的版本（语义化版本，如 `0.1.6`）。

```bash
grep '"version"' package.json
```

### 2. 更新 CHANGELOG

在 [CHANGELOG.md](CHANGELOG.md) 顶部新增一条记录，按 `[x.y.z] - YYYY-MM-DD` 格式，列出新增/修复/变更。

### 3. 本地打包验证

```bash
npm pack --dry-run
```

确认 tarball 包含的文件正确（应含 `lib/client.js`、`lib/index.js`、`package.json`、`cordis.patch.yml`）。如果改了 `files` 数组或新增文件，检查是否遗漏。

### 4. 提交并推送

```bash
git add -A
git commit -m "release: v0.1.x"
git push origin main
```

### 5. 发布到 npm

```bash
# 确认登录
npm whoami

# 发布
npm publish
```

若提示 2FA 验证码：`npm publish` 会要求输入 OTP，按提示输入即可。
若提示 `403 ... bypass 2fa`：需要交互式输入验证码，或使用带 Bypass 2FA 的 token。

### 6. 验证发布

```bash
npm view dsh-client-ui-skins
```

应看到新版本号、`maintainers` 里有你、`dist-tags.latest` 指向新版本。

### 7.（可选）打 GitHub tag

```bash
git tag v0.1.x
git push origin v0.1.x
```

## 安装方式（供用户使用）

```bash
# 方式 1：dsh 插件命令（推荐，免构建授权）
dsh plugin --profile web add dsh-client-ui-skins

# 方式 2：pnpm 直接装
cd ~/.dsh/profiles/web
pnpm add -w dsh-client-ui-skins
```

> 包内已声明 `dsh.bundle` manifest（`cordis.patch.yml`），`dsh plugin add` 可识别；同时提供 `dsh.client` 双面包，前端 UI 自动加载。

## 注意事项

- **不要用镜像源发布**：`registry.npmmirror.com` 不认官方登录凭证。若改过 registry，发版时切回官方源。
- **token 安全**：`~/.npmrc` 里的 `_authToken` 有发布权限，不要提交到仓库、不要公开分享；泄露后立即到 npm 后台撤销。
- **版本号唯一**：npm 不允许覆盖已发布版本，发错了需升版本号重新发布（或 `npm unpublish` 仅限 72 小时内）。
