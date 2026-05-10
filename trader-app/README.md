# Eko Trader App

React frontend for trader-facing features in the Eko intelligent economic platform.

## Tech Stack

- **React** - UI framework
- **React Router** - Role-based routing
- **Axios** - API calls
- **Recharts** - Score & analytics charts
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Vercel** - Deployment

## Features

- Trader onboarding (link Squad account, register details)
- EkoScore dashboard & breakdown
- EkoCredit application & repayment tracker
- Opportunity posting form
- EkoSave & insurance product display

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:3000`

### Build

```bash
npm run build
```

### Environment Variables

Create a `.env` file (copy from `.env.example`):

```
VITE_API_BASE_URL=http://localhost:8000
VITE_SQUAD_API_KEY=your_squad_sandbox_key
```

## Project Structure

```
src/
  ├── main.jsx           # Entry point
  ├── App.jsx            # Main component & routing
  ├── index.css          # Tailwind styles
  ├── api/               # Axios client & API calls
  ├── components/        # Reusable UI components
  ├── pages/             # Page components
  └── hooks/             # Custom React hooks
```

## Deployment

Push to main branch. Vercel auto-deploys.

```bash
npm run build
npm run preview
```

## Team

Frontend Developer - Trader App
