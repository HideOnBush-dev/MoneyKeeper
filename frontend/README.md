# Money Keeper Frontend - React + Vite

This is the frontend application for Money Keeper, built with React and Vite.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **React** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Tailwind CSS** - Styling (via CDN)

## Project Structure

```
src/
├── components/     # Reusable UI components
│   └── Layout.jsx  # Main layout with navigation
├── contexts/       # React contexts (state management)
│   └── AuthContext.jsx
├── pages/          # Page components
│   ├── Landing.jsx
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx
│   ├── Expenses.jsx
│   ├── Wallets.jsx
│   ├── Budgets.jsx
│   ├── Chat.jsx
│   ├── Settings.jsx
│   └── Notifications.jsx
├── services/       # API services
├── utils/          # Utility functions
├── hooks/          # Custom React hooks
├── App.jsx         # Main app component with routing
└── main.jsx        # Entry point
```

## API Integration

The frontend communicates with the Flask backend via REST API. The Vite dev server is configured to proxy API requests to `http://localhost:8000`.

## Building for Production

When you run `npm run build`, Vite will build the application and output the static files to `../app/static/dist`. The Flask backend can then serve these files.

## Environment Variables

Create a `.env` file in the frontend directory if needed:

```
VITE_API_URL=http://localhost:8000
```
