# Frontend Setup Documentation

## Overview

The AXIS frontend is a React 18 application manually configured without Create React App (CRA). This setup provides a clean, minimal configuration using `react-scripts` for build tooling while maintaining full control over the project structure.

## What Was Done

### ✅ Manual React Setup (Completed)

1. **Created `package.json`** with minimal dependencies:
   - React 18.2.0
   - React DOM 18.2.0
   - React Router DOM 6.8.0 (for routing)
   - React Scripts 5.0.1 (build tooling)
   - Axios 1.6.0 (HTTP client)
   - Lucide React 0.263.1 (icons)

2. **Created `public/index.html`** - HTML entry point with root div

3. **Created `src/index.js`** - React application entry point that renders the App component

4. **Added `.gitignore`** to exclude:
   - `node_modules/`
   - `build/` (production builds)

5. **Verified build** - Production build tested and working (72.39 kB gzipped)

## File Structure

```
frontend/
├── package.json          # Dependencies and scripts
├── package-lock.json     # Locked dependency versions
├── public/
│   └── index.html       # HTML entry point
├── src/
│   ├── index.js         # React entry point
│   └── App.js           # Main application component (existing)
└── build/               # Production build output (gitignored)
```

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.2.0 | React library |
| react-dom | ^18.2.0 | React DOM rendering |
| react-router-dom | ^6.8.0 | Client-side routing |
| react-scripts | 5.0.1 | Build tooling (webpack, babel, etc.) |
| axios | ^1.6.0 | HTTP client for API calls |
| lucide-react | ^0.263.1 | Icon library |

## Setup Instructions

### Initial Setup

```bash
cd frontend
npm install
```

This installs all dependencies listed in `package.json`.

### Development

Start the development server:

```bash
npm start
```

The app will open at `http://localhost:3000` with hot-reload enabled.

### Production Build

Create an optimized production build:

```bash
npm run build
```

The build output will be in the `build/` directory, ready for deployment.

### Testing Production Build Locally

```bash
npm install -g serve
serve -s build
```

## Application Features

The frontend includes:

1. **Home Page** (`/`) - Company input form to generate interview briefs
2. **Brief View** (`/brief/:id`) - Multi-tab interface showing:
   - Interview brief
   - Intelligence schema (Document 4)
   - Executive email template
   - Post-interview debrief form
3. **Interviewee Page** (`/i/:id`) - Public-facing page for executives

## API Configuration

⚠️ **Important**: Update the API URL in `src/App.js`:

```javascript
const API_URL = 'YOUR_API_GATEWAY_URL_HERE';
```

Replace with your actual API Gateway endpoint URL after deployment.

## Troubleshooting

### npm install fails

If installation fails, try the nuclear option:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Build errors

- Ensure all dependencies are installed: `npm install`
- Check Node.js version (recommended: 14+)
- Clear cache: `npm cache clean --force`

### Port already in use

If port 3000 is in use, React Scripts will automatically try the next available port.

## Deployment

The `build/` folder contains static files ready for deployment to:
- AWS Amplify
- AWS S3 + CloudFront
- Any static hosting service

## Notes

- This setup avoids CRA bloat while maintaining compatibility with React Scripts tooling
- The build process uses webpack under the hood (via react-scripts)
- Hot module replacement (HMR) is enabled in development mode
- Production builds are optimized and minified automatically
