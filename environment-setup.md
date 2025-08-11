# Environment Setup

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com

# API Configuration (Production)
VITE_API_BASE_URL=https://yeezles-todo-production.up.railway.app
VITE_API_KEY=dddb4edc295c78d432e0fe82a95819000c55f4e0870379b6b433a928c00d658b

# API Configuration (Local Development - uncomment to use local API)
# VITE_API_BASE_URL=http://localhost:3000
# VITE_API_KEY=
```

## Getting Google OAuth Client ID

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Choose "Web application"
6. Add authorized origins:
   - `http://localhost:5173` (for development)
   - Your production domain (for deployment)
7. Copy the Client ID to your `.env.local` file

## API Setup

Make sure your yeezles-todo API is running on port 3000:

```bash
cd ../yeezles-todo
npm run dev
```

The API should be accessible at `http://localhost:3000`
