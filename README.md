# AiShipShape - MERN Habit Tracker (initialized)

Folders:
- backend: Express + Mongoose API
- frontend: Vite + React frontend

## Quick start (local)
1. Start MongoDB (local) or use Atlas and set MONGO_URI in backend/.env
2. Run backend:
   cd backend
   npm install
   npm run dev

3. Run frontend:
   cd frontend
   npm install
   npm run dev

Frontend will talk to API at VITE_API_URL (default http://localhost:5000/api).

## Deployment hints
- Backend: Render/Railway — configure environment variable MONGO_URI and PORT
- Frontend: Vercel/Netlify — set VITE_API_URL to your deployed backend URL
