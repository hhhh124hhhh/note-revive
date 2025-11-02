# Note Revive

A modern note-taking application built with React, TypeScript, and Vite.

## Features

- Create, edit, and delete notes with Markdown support
- Data persistence using IndexedDB (Dexie.js)
- Responsive design with Tailwind CSS
- Data encryption for sensitive information
- GitHub Flavored Markdown (GFM) support
- **AI-Powered Features:**
  - Smart search suggestions with semantic understanding
  - Intelligent note relationship recommendations
  - Smart review reminders based on content importance
  - Support for multiple AI providers (DeepSeek, 智谱AI, Kimi, OpenAI, Claude)
  - Dynamic model selection and management
  - Local-first processing with data privacy protection

## Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Database**: IndexedDB (via Dexie.js)
- **Markdown**: react-markdown + remark-gfm
- **Encryption**: crypto-js
- **Desktop Framework**: Tauri (optional)

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm, yarn, or pnpm

For desktop app (Tauri):
- Rust toolchain (optional, for desktop app development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/hhhh124hhhh/note-revive.git
   ```

2. Navigate to the project directory:
   ```bash
   cd note-revive
   ```

3. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

### Development

Start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

### Build

Create a production build:
```bash
npm run build
# or
yarn build
# or
pnpm build
```

### Preview

Preview the production build locally:
```bash
npm run preview
# or
yarn preview
# or
pnpm preview
```

## AI Features Configuration

### Environment Setup

To use AI features, you need to configure API keys for AI service providers:

1. **Copy the environment configuration file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file** with your API keys:
   ```bash
   # DeepSeek AI (recommended for Chinese users)
   VITE_DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here

   # 智谱AI GLM
   VITE_ZHIPU_API_KEY=your-zhipu-api-key-here

   # Kimi Moonshot
   VITE_KIMI_API_KEY=sk-your-kimi-api-key-here

   # OpenAI
   VITE_OPENAI_API_KEY=sk-your-openai-api-key-here

   # Claude (Anthropic)
   VITE_CLAUDE_API_KEY=sk-ant-your-claude-api-key-here
   ```

### Getting API Keys

- **DeepSeek AI**: [platform.deepseek.com](https://platform.deepseek.com/)
- **智谱AI GLM**: [open.bigmodel.cn](https://open.bigmodel.cn/)
- **Kimi Moonshot**: [platform.moonshot.cn](https://platform.moonshot.cn/)
- **OpenAI**: [platform.openai.com](https://platform.openai.com/)
- **Claude**: [console.anthropic.com](https://console.anthropic.com/)

### In-App Configuration

1. Start the application
2. Go to **Settings** → **AI** tab
3. Configure your preferred AI providers
4. Test connections and select models
5. Enable AI features as needed

### AI Features

- **Smart Search**: Semantic understanding to find related content when keyword search fails
- **Note Relationships**: Automatic discovery of related notes to build knowledge networks
- **Smart Reminders**: AI-powered recommendations for important notes to review
- **Multi-Provider Support**: Choose from multiple AI service providers
- **Privacy Protection**: Local-first processing with encrypted API key storage

### Desktop App (Tauri)

#### Prerequisites for Desktop
Install Rust toolchain first:
```bash
# Windows
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Or use winget
winget install Rustlang.Rust.MSVC
```

#### Development Mode
Run the desktop app in development mode:
```bash
npm run tauri:dev
```

#### Build Desktop App
Build the desktop executable:
```bash
npm run tauri:build
```

The built executable will be available in `src-tauri/target/release/bundle/` directory.

### Automated Builds with GitHub Actions

This repository is configured with GitHub Actions for automated building and releasing:

1. Push to the `release` branch to trigger an automated build
2. The workflow will create a new GitHub Release with the built executables
3. Download the built executables from the Releases page

To manually trigger a build:
1. Go to the Actions tab in your GitHub repository
2. Select the "Publish" workflow
3. Click "Run workflow"

## Usage

1. Open the application in your browser
2. Create a new note using the "+" button
3. Write your notes in Markdown format
4. Save your notes - they will be persisted in your browser's IndexedDB
5. Edit or delete notes as needed

## License


This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.