# Yeezles Todo Web Application

A modern React + TypeScript web application for managing todos, built to connect with the Yeezles Todo API.

## 🎯 Features

- **Google OAuth Authentication** - Secure single-user access
- **Modern React Stack** - React 19, TypeScript, Vite, Tailwind CSS
- **API Integration** - Connects to Yeezles Todo REST API
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Multi-view Application** - Organized navigation between different views

## 🚀 Getting Started

### Prerequisites

1. **Yeezles Todo API** running on `http://localhost:3000`
2. **Google OAuth Client ID** (see environment setup below)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp environment-setup.md .env.local
# Edit .env.local with your Google OAuth Client ID
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## 🔧 Environment Setup

See [environment-setup.md](./environment-setup.md) for detailed instructions on:
- Setting up Google OAuth Client ID
- Configuring API connection
- Development vs. production settings

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Main application views
├── contexts/           # React contexts (Auth, etc.)
├── services/           # API communication layer
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

## ✅ Completed Features

- [x] React + TypeScript + Vite setup
- [x] Tailwind CSS integration
- [x] Google OAuth authentication
- [x] API service layer with TypeScript types
- [x] Authentication context and protected routes
- [x] Basic dashboard layout
- [x] Passkey sign-in and passkey management
- [x] Access tokens: create, list, revoke
- [x] OAuth consent page at `/oauth/consent`: approve a Claude connection with a passkey, or deny it
- [x] Connected apps: list OAuth connections (client, scopes, created, last used, expiry) and disconnect them
- [x] **Topics**: a second axis inside an area. The Topics tab lists each topic's open/done counts and status note (stale after 14 days with open todos), topic detail edits the note and lists the topic's todos, every todo form has a topic picker, and todo rows carry a topic chip that opens the topic. Claude's proposed topic changes, including new todos it wants to create (with a No topic section for those without one), are reviewed at `/topics/proposals/:id` (reachable from the Topics tab's pending count and banner) and applied all or nothing.
- [x] **People**: tag todos with the people they involve. The People tab lists everyone tagged (most recent first, with open counts, dimmed when nothing is open) beside the selected person's todos across all areas; on phones the person opens in place of the list. Todo rows carry person chips (filled when linked to Peopler, outlined when not) that open the person. The add and edit forms have a People field with typeahead and Create. A person can be renamed, given aliases, merged into another person, or deleted (the todos stay). MCP and proposals, Peopler linking and suggestions come in later phases.

## 🚧 Upcoming Features

- [ ] Todo list view with CRUD operations
- [ ] Today view with smart categorization
- [ ] Cross-reference navigation
- [ ] Responsive design polish
- [ ] Railway deployment

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Authentication**: Google OAuth 2.0
- **State Management**: React Query + Context API
- **HTTP Client**: Axios

## ✅ Tests

`npx vitest run` is green. CI (`.github/workflows/check.yml`) runs typecheck, lint and tests on every PR and push to `master`. A known failure is marked `it.fails` with a `// KNOWN-FAILURE yeezles-todo-webapp#<issue>: <reason>` comment; `grep -rn KNOWN-FAILURE src/` lists them. Node 22 is required (`engines` in `package.json`).

## 📚 Development

This project follows a learning-focused, step-by-step development approach:

1. **Foundation Setup** ✅
2. **API Integration & CRUD** 🚧
3. **Today View Implementation**
4. **Cross-Reference Navigation**
5. **Responsive Design**
6. **Railway Deployment**

Each phase builds upon the previous one with detailed explanations and best practices.