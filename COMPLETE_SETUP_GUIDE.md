# Note Revive 完整环境安装和启动指南

## 所需环境

Note Revive 项目需要以下环境：

1. **Node.js 环境**（必须）
   - Node.js 14 或更高版本
   - npm、yarn 或 pnpm 包管理器

2. **Rust 环境**（可选，用于桌面应用开发）
   - Rust 工具链

## 安装步骤

### 1. 安装 Node.js

#### Windows 系统：

1. 访问 [Node.js 官网](https://nodejs.org/zh-cn/download/)
2. 下载 Windows 安装包 (LTS 版本推荐)
3. 运行安装包并按照提示完成安装
4. 安装完成后重启命令行工具

#### 验证安装：

```bash
node --version
npm --version
```

您应该能看到版本号输出。

### 2. 安装 Rust 工具链（可选）

如果您想构建桌面应用，需要安装 Rust：

#### Windows 系统：

使用 winget 安装（推荐）：
```bash
winget install Rustlang.Rust.MSVC
```

或者使用官方安装脚本：
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### 验证安装：

```bash
rustc --version
cargo --version
```

### 3. 克隆项目（如果尚未克隆）

```bash
git clone https://github.com/hhhh124hhhh/note-revive.git
cd note-revive
```

### 4. 安装项目依赖

```bash
npm install
```

### 5. 启动开发服务器

#### 启动 Web 应用：

```bash
npm run dev
```

服务器将运行在 `http://localhost:3000`

#### 启动桌面应用（需要 Rust 环境）：

```bash
npm run tauri:dev
```

## 使用 Chrome DevTools 进行测试

### 1. 启动开发服务器后，打开 Chrome 浏览器
### 2. 访问 `http://localhost:3000`
### 3. 按 F12 打开开发者工具
### 4. 使用以下面板进行测试：

- **Console 面板**：查看应用日志和错误信息
- **Network 面板**：监控网络请求
- **Application 面板**：查看 IndexedDB 数据存储
- **Elements 面板**：检查和调试页面元素
- **Sources 面板**：调试 JavaScript 代码

## 项目结构说明

```
note-revive/
├── src/                 # 源代码目录
│   ├── components/      # UI 组件
│   ├── hooks/           # 自定义 Hook
│   ├── utils/           # 工具函数
│   ├── constants/       # 静态常量
│   ├── types/           # TypeScript 类型定义
│   ├── App.tsx          # 主应用组件
│   ├── db.ts            # 数据库配置
│   └── main.tsx         # 应用入口
├── src-tauri/           # Tauri 桌面应用配置
├── package.json         # 项目配置和依赖
├── vite.config.ts       # Vite 构建配置
└── README.md            # 项目说明文档
```

## 常见问题解决

### 1. 端口被占用

如果端口 3000 被占用，可以在 `vite.config.ts` 中修改端口配置：

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001  // 修改为其他端口
  }
})
```

### 2. 权限问题

如果遇到权限问题，尝试以管理员身份运行命令行。

### 3. 依赖安装失败

如果依赖安装失败，可以尝试：

```bash
# 删除依赖文件
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 4. Rust 编译错误

如果在构建桌面应用时遇到 Rust 编译错误：

```bash
# 更新 Rust 工具链
rustup update

# 清理构建缓存
cargo clean

# 重新构建
npm run tauri:dev
```

## 构建和发布

### 构建 Web 应用：

```bash
npm run build
```

构建产物将位于 `dist/` 目录。

### 构建桌面应用：

```bash
npm run tauri:build
```

构建产物将位于 `src-tauri/target/release/bundle/` 目录。

## 项目功能特性

- **Markdown 编辑**：支持 GitHub Flavored Markdown (GFM)
- **数据持久化**：使用 IndexedDB 存储数据（通过 Dexie.js）
- **数据加密**：敏感数据使用 crypto-js 加密
- **响应式设计**：使用 Tailwind CSS 实现
- **快捷键支持**：提供常用操作的快捷键
- **离线可用**：数据存储在本地浏览器中