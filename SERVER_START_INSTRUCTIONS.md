# Note Revive 开发服务器启动说明

## 环境安装步骤

### 1. 安装 Node.js

访问 [Node.js 官网](https://nodejs.org/zh-cn/download/) 下载并安装适用于 Windows 的 LTS 版本。

安装完成后，重启您的命令行工具。

### 2. 验证安装

打开新的命令行窗口，执行以下命令验证安装：

```bash
node --version
npm --version
```

您应该能看到版本号输出。

### 3. 安装项目依赖

在项目根目录 (`f:\person\3-数字化集锦\note-revive`) 中执行：

```bash
npm install
```

### 4. 启动开发服务器

安装依赖完成后，执行以下命令启动开发服务器：

```bash
npm run dev
```

根据项目配置，服务器将运行在 `http://localhost:3000`

### 5. 访问应用

打开浏览器访问 `http://localhost:3000` 即可使用 Note Revive 应用。

## 故障排除

如果遇到问题，请尝试以下解决方案：

1. 如果端口 3000 被占用，可以在 `vite.config.ts` 中修改端口配置
2. 如果遇到权限问题，尝试以管理员身份运行命令行
3. 如果依赖安装失败，可以尝试删除 `node_modules` 文件夹和 `package-lock.json` 文件后重新安装
4. 确保当前工作目录是项目根目录（包含 package.json 的目录）

## 使用 Chrome DevTools 测试

服务器启动成功后，您可以使用 Chrome DevTools 进行测试：

1. 打开 Chrome 浏览器
2. 访问 `http://localhost:3000`
3. 按 F12 打开开发者工具
4. 在 Console 面板中可以查看应用日志
5. 在 Network 面板中可以查看网络请求
6. 在 Application 面板中可以查看 IndexedDB 数据存储