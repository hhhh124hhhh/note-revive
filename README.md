# Note Revive

A modern note-taking application built with React, TypeScript, and Vite.

## Features

- Create, edit, and delete notes with Markdown support
- Data persistence using IndexedDB (Dexie.js)
- Responsive design with Tailwind CSS
- Data encryption for sensitive information
- GitHub Flavored Markdown (GFM) support

## Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Database**: IndexedDB (via Dexie.js)
- **Markdown**: react-markdown + remark-gfm
- **Encryption**: crypto-js

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/note-revive.git
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

## Usage

1. Open the application in your browser
2. Create a new note using the "+" button
3. Write your notes in Markdown format
4. Save your notes - they will be persisted in your browser's IndexedDB
5. Edit or delete notes as needed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.