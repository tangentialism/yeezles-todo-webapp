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

## 📚 Development

This project follows a learning-focused, step-by-step development approach:

1. **Foundation Setup** ✅
2. **API Integration & CRUD** 🚧
3. **Today View Implementation**
4. **Cross-Reference Navigation**
5. **Responsive Design**
6. **Railway Deployment**

Each phase builds upon the previous one with detailed explanations and best practices.