# QuizMaster

QuizMaster is a React/Vite quiz application with an Express, MongoDB, and JWT backend.

## Setup

1. Start MongoDB locally, or provide a MongoDB connection string.
2. Copy `server/.env.example` to `server/.env` and set `MONGO_URI` and `JWT_SECRET`.
3. Install and seed the backend:

   ```bash
   cd server
   npm install
   npm run seed
   npm run dev
   ```

4. In another terminal, install and start the frontend:

   ```bash
   npm install
   npm run dev
   ```

The frontend uses `http://localhost:5000` by default. Set `VITE_API_URL` in a root `.env` file when the API runs elsewhere. Registration, login, quiz loading, and authenticated result saving use the backend API. The UI falls back to bundled demo quizzes if the API is unavailable.
