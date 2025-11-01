# AI功能设置指南

本指南将帮助您配置和使用Note Revive的AI功能。

## 🚀 快速开始

### 1. 环境配置

首先复制环境配置文件：
```bash
cp .env.example .env
```

### 2. 配置API密钥

编辑 `.env` 文件，添加您的AI服务商API密钥：

#### DeepSeek AI（推荐中文用户）
```bash
VITE_DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here
VITE_DEEPSEEK_BASE_URL=https://api.deepseek.com
VITE_DEEPSEEK_MODEL=deepseek-chat
```

#### 智谱AI GLM
```bash
VITE_ZHIPU_API_KEY=your-zhipu-api-key-here
VITE_ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
VITE_ZHIPU_MODEL=glm-4
```

#### Kimi Moonshot
```bash
VITE_KIMI_API_KEY=sk-your-kimi-api-key-here
VITE_KIMI_BASE_URL=https://api.moonshot.cn/v1
VITE_KIMI_MODEL=moonshot-v1-8k
```

### 3. 启动应用

```bash
npm run dev
```

### 4. 应用内配置

1. 打开应用后，点击设置图标
2. 切换到 **AI** 标签页
3. 您会看到从环境变量自动加载的AI提供商
4. 测试连接并选择合适的模型
5. 启用所需的AI功能

## 🔧 详细配置

### 环境变量说明

| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| `VITE_AI_ENABLED` | 是否启用AI功能 | 否 | `true` |
| `VITE_AI_DEFAULT_PROVIDER` | 默认AI服务商 | 否 | `deepseek` |
| `VITE_AI_SEARCH_ENABLED` | 启用智能搜索 | 否 | `true` |
| `VITE_AI_RELATION_ENABLED` | 启用便签关联 | 否 | `true` |
| `VITE_AI_REMINDER_ENABLED` | 启用智能回顾 | 否 | `true` |

### API密钥获取指南

#### DeepSeek AI
1. 访问 [DeepSeek平台](https://platform.deepseek.com/)
2. 注册并登录账户
3. 进入API Keys页面创建新密钥
4. 复制API密钥到 `.env` 文件

#### 智谱AI GLM
1. 访问 [智谱AI平台](https://open.bigmodel.cn/)
2. 注册并完成实名认证
3. 进入API管理页面创建API Key
4. 新用户有免费试用额度

#### Kimi Moonshot
1. 访问 [Moonshot平台](https://platform.moonshot.cn/)
2. 注册并登录账户
3. 进入API Keys页面创建密钥
4. 提供免费试用额度

#### OpenAI
1. 访问 [OpenAI平台](https://platform.openai.com/)
2. 注册并添加付费方式
3. 进入API Keys页面创建密钥
4. 按使用量付费

#### Claude (Anthropic)
1. 访问 [Anthropic控制台](https://console.anthropic.com/)
2. 注册并添加付费方式
3. 进入API Keys页面创建密钥
4. 按使用量付费

## 🎯 AI功能使用

### 智能搜索

当关键词搜索没有结果时，AI会：
- 分析搜索意图
- 理解语义相关性
- 推荐相关便签
- 显示匹配原因和关键词

### 便签关联

在便签详情页面，AI会：
- 分析便签内容相似性
- 发现相关便签
- 构建知识网络
- 提供关联置信度

### 智能回顾

AI会根据以下因素推荐回顾：
- 便签年龄（越老越重要）
- 内容状态（草稿优先）
- 内容长度（重要内容通常较长）
- 用户行为模式

## 🔒 隐私和安全

### 数据保护
- API密钥使用AES加密存储在本地
- 支持本地优先处理模式
- 不会上传您的便签内容到AI服务商
- 所有处理都在本地完成

### 配置优先级
1. **用户手动设置**（最高优先级）
2. **环境变量配置**（中等优先级）
3. **系统默认值**（最低优先级）

## 🛠️ 故障排除

### 常见问题

**Q: AI功能不工作**
- 检查环境变量是否正确配置
- 确认API密钥有效且有足够额度
- 查看浏览器控制台错误信息

**Q: 模型加载失败**
- 检查网络连接
- 验证API密钥权限
- 尝试重新测试连接

**Q: 搜索建议不准确**
- 尝试使用不同的AI模型
- 检查便签内容是否足够丰富
- 考虑启用更多AI功能

### 调试模式

启用调试模式获取更多信息：
```bash
VITE_DEBUG_AI=true
```

### 日志查看

在浏览器开发者工具的Console中查看：
- AI服务初始化状态
- API调用结果
- 错误信息和警告

## 📊 成本管理

### 免费额度
- DeepSeek: 提供免费使用额度
- 智谱AI: 新用户免费试用
- Kimi: 提供免费试用
- OpenAI/Claude: 付费服务

### 成本优化建议
1. 选择性价比高的模型
2. 启用本地处理模式
3. 合理设置功能开关
4. 定期清理缓存

## 📚 高级配置

### 自定义AI服务商

支持自定义OpenAI和Claude兼容的服务商：

1. 在AI设置中点击"添加提供商"
2. 配置自定义API端点
3. 选择API类型（OpenAI或Claude）
4. 输入API密钥
5. 测试连接

### 模型选择建议

| 用途 | 推荐模型 | 考虑因素 |
|------|----------|----------|
| 日常搜索 | DeepSeek Chat, GLM-4-Air | 响应速度、成本 |
| 复杂分析 | DeepSeek Reasoner, GLM-4-Plus | 推理能力 |
| 代码相关 | DeepSeek Coder, GPT-4 | 代码理解 |
| 长文档 | Kimi Long, GLM-4-Long | 上下文长度 |

## 🆘 获取帮助

- [GitHub Issues](https://github.com/hhhh124hhhh/note-revive/issues)
- [项目文档](https://github.com/hhhh124hhhh/note-revive)
- [功能讨论](https://github.com/hhhh124hhhh/note-revive/discussions)

---

**提示**: 本地模拟模式可以在没有API密钥的情况下体验基础AI功能。