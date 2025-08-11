# Yeezles Todo Web App - Railway Deployment Guide

## 🚀 Deployment Steps

### 1. Prerequisites
- Railway account
- GitHub repository with your code
- Google OAuth Client ID (for authentication)

### 2. Environment Variables Required

In Railway, set these environment variables:

```
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
VITE_API_BASE_URL=https://yeezles-todo-production.up.railway.app
VITE_API_KEY=dddb4edc295c78d432e0fe82a95819000c55f4e0870379b6b433a928c00d658b
NODE_ENV=production
```

### 3. Deploy to Railway

1. **Connect Repository**: Link your GitHub repository to Railway
2. **Set Environment Variables**: Add the variables above in Railway dashboard
3. **Deploy**: Railway will automatically build and deploy using the configurations in:
   - `railway.toml` - Railway-specific deployment settings
   - `nixpacks.toml` - Build configuration
   - `vite.config.ts` - Vite preview server configuration

### 4. Build Process

Railway will:
1. Install dependencies with `npm ci`
2. Build the app with `npm run build`
3. Start preview server with `npm run preview`
4. Serve on port determined by Railway's `PORT` environment variable

### 5. Google OAuth Setup

Make sure to add your Railway domain to your Google OAuth configuration:
- Go to Google Cloud Console
- Navigate to APIs & Credentials > OAuth 2.0 Client IDs
- Add your Railway domain (e.g., `https://your-app.up.railway.app`) to authorized origins

### 6. Features Available After Deployment

✅ **Complete Todo Management**
- Create, read, update, delete todos
- Real-time API integration with production backend
- Google OAuth authentication 
- Access restricted to `tangentialism@gmail.com`

✅ **Smart Today View**
- Today tagged items (`@today`)
- Due today items
- Overdue items
- Coming soon items

✅ **Mobile Responsive**
- Optimized for all screen sizes
- Touch-friendly interface
- Responsive navigation and modals

✅ **Production Ready**
- Built with Vite for optimal performance
- Proper error handling
- Secure API communication

## 🔧 Local Development

To run locally:
```bash
npm install
npm run dev
```

To test production build locally:
```bash
npm run build
npm run preview
```

## 📱 Mobile Features

The app is fully responsive and includes:
- Collapsible navigation on mobile
- Icon-only buttons on small screens
- Optimized card layouts
- Mobile-friendly modals
- Touch-optimized interactions
