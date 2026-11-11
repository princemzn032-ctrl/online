# QuizMaster

QuizMaster is a React/Vite quiz application with an Express API and a persistent local MongoDB database for accounts, quiz content, quiz attempts, and leaderboard data. Supabase can be enabled separately when a live Supabase project is configured.

## Run locally

1. Install dependencies from the repository root:

   ```bash
   npm install
   npm --prefix server install
   ```

2. Ensure `server/.env` has a unique `JWT_SECRET` of at least 32 characters. For local development, set `MONGO_URI=mongodb://127.0.0.1:27017/quizmaster`; if MongoDB is not installed, the server starts its persistent development database in `server/data/mongodb`.
3. Seed the local database with the General Knowledge category and its 20-question quiz:

   ```bash
   npm --prefix server run seed
   ```

   This keeps only General Knowledge, removes other quizzes/categories and their saved attempts, and preserves registered users and General Knowledge attempt history.
4. Start both the frontend and API:

   ```bash
   npm run dev:full
   ```

5. Open `http://127.0.0.1:5173`. Local email/password signup and login, quiz attempts, and scores are stored in MongoDB. Quiz answers are checked by the API, not sent to the browser. `npm run dev:full` starts the API on port `5000` and Vite on port `5173`.

The root `.env.example` selects `VITE_BACKEND_MODE=local`, which uses the Express/MongoDB backend. To connect the quiz, login, score, and leaderboard data to Supabase instead, set `VITE_BACKEND_MODE=supabase`, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the root `.env`, and run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor. That schema keeps only the General Knowledge category and its 20-question quiz; it deletes other quiz/category data and non-General-Knowledge attempts, but keeps user profiles and General Knowledge attempts. Restart Vite after changing `.env`.

## Deploy to Render

The [`render.yaml`](./render.yaml) Blueprint builds and serves the frontend and API as one web service. Before deploying:

1. Push the project to GitHub and connect that repository in Render using **New > Blueprint**.
2. Create a MongoDB Atlas database and set `MONGO_URI` in the Render service to its private connection URI.
3. Generate a unique `JWT_SECRET` of at least 32 characters and enter it in the Render service environment variables. Do not commit `.env` files or put secrets in `render.yaml`.
4. Deploy the Blueprint. It builds the frontend, seeds the General Knowledge quiz, starts the API, and checks `/api/health`.
5. If using a custom domain, set `FRONTEND_URL` in Render to that website's origin. The Render-provided service URL is allowed automatically.

The seed command keeps only the General Knowledge quiz and category, removes other quizzes and their attempts, and preserves accounts and General Knowledge attempts. The hosted database must be MongoDB Atlas (or another network-accessible MongoDB); the local development database is not suitable for deployment.

### Optional Google sign-in

Google sign-in requires a live Supabase project. Configure the Google provider under **Authentication > Providers > Google** with OAuth credentials from Google Cloud Console. Add the Supabase callback URL (usually `https://<project-ref>.supabase.co/auth/v1/callback`) as an authorized redirect URI in Google Cloud, and add `http://127.0.0.1:5173/auth` to the Supabase redirect URL allow list. Google OAuth secrets must not be added to the browser `.env`.

### Patient appointment requests

The separate `/patient-intake` page collects a patient's name, email, phone, and optional preferred appointment date. Run [`supabase/patient-intakes.sql`](./supabase/patient-intakes.sql) in the SQL Editor to create its write-only table and insert-only policy. Public browsers cannot read submitted rows; the clinic can inspect them in the Supabase dashboard. This is only for appointment contact requests, not medical records or clinical notes. Add CAPTCHA/rate limiting and review applicable privacy and healthcare compliance requirements before production use.

## Optional hosted database

To use MongoDB Atlas instead of the persistent local MongoDB database:

1. Create an Atlas cluster, a database user, and allow your current IP address in Atlas Network Access.
2. Copy `server/.env.example` to `server/.env`. Keep this file private; it is excluded from Git.
3. Set `MONGO_URI` to the Atlas connection string from **Connect > Drivers**, including the `quizmaster` database name. URL-encode special characters in the database user's password. A configured Atlas URI is used instead of the local development database.
4. Replace `JWT_SECRET` with a unique random value of at least 32 characters. Set `ADMIN_EMAIL`, `ADMIN_NAME`, and a unique `ADMIN_PASSWORD` of at least 12 characters.
5. Install backend dependencies and create/promote the administrator from the `server` directory:

   ```bash
   npm install
   npm run seed:admin
   npm run seed
   ```

   `npm run seed` resets only quiz categories and quizzes; it does not remove users.

6. From the repository root, start both the frontend and backend together:

   ```bash
   npm install
   npm run dev:full
   ```

In development, Vite proxies `/api` requests to `http://127.0.0.1:5000`. Set `VITE_API_URL` in the root `.env` only if the API runs at a different address.

The chatbot uses the built-in QuizMaster guide when `GEMINI_API_KEY` is not configured. Add a key to `server/.env` to enable AI-generated replies.
