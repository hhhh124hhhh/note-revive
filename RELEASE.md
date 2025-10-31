# 版本发布指南

## 自动化构建与发布

本项目使用 GitHub Actions 进行自动化构建和发布。当您推送代码到 `release` 分支或创建版本标签时，GitHub Actions 会自动构建应用并创建 GitHub Release。

## 触发自动化构建的方法

### 方法一：推送代码到 release 分支

1. 确保您的更改已经提交到 git
2. 切换到 release 分支：
   ```bash
   git checkout release
   ```
3. 合并您的更改：
   ```bash
   git merge main  # 或者合并您的功能分支
   ```
4. 推送更改：
   ```bash
   git push origin release
   ```

### 方法二：创建版本标签

1. 确保您的更改已经提交到 git
2. 创建并推送标签：
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

### 方法三：手动触发工作流

1. 在 GitHub 仓库页面，点击 "Actions" 标签
2. 选择 "Publish" 工作流
3. 点击 "Run workflow" 按钮

## 构建产物

构建完成后，GitHub Actions 会自动创建一个 Release，并上传以下平台的构建物：
- Windows (.exe)
- macOS (.app)
- Linux (.AppImage, .deb)

您可以在 GitHub Releases 页面找到并下载这些构建物。

## 本地构建测试

在推送代码之前，建议先在本地测试构建：

```bash
# Windows
build.bat

# macOS/Linux
./build.sh
```

或者直接运行：
```bash
npm run release
```