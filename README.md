# Fight Me Bro
 
COP 4331C MERN group project. Players join a hosted game, choose teams, and use attack, heal, and block actions to battle enemies.
- [Website](https://mern.alex84plus.xyz/)
## Technologies

- React
- React Router for page routes
- TypeScript for type checking swag
- Vite for the frontend dev server and build
- Bootstrap using its prebuilt CSS
- Node.js
- Express
- MongoDB and Mongoose
- bcryptjs for password hashing
- JSON Web Tokens (JWT) for authentication
- Bruno for API testing

## Run the frontend

From the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Run `npm run typecheck` in `frontend` to check the TypeScript code for errors.
The frontend uses React Router for these pages:

| Route | Page | Purpose |
| --- | --- | --- |
| `/` when logged out | `LoginPage.tsx` | Log in to host a game, or go to `/join` |
| `/` when logged in | `DashboardPage.tsx` | Go to `/host` to create a lobby, or log out |
| `/join` | `JoinPage.tsx` | Enter a session code without an account |
| `/play/:sessionCode` | `PlayPage.tsx` | Choose a nickname and a team, then wait for the host to start the game |
| `/login` | `LoginPage.tsx` | Log in to host a game |
| `/register` | `RegisterPage.tsx` | Create a host account |
| `/verify-email` | `VerifyEmailPage.tsx` | Verify an email address with its emailed link, or send a new link |
| `/host` | `HostPage.tsx` | Preview the host lobby with sample players and a session code |

Page components live in `frontend/src/pages/`, and routes are defined in `frontend/src/App.tsx`.
Vite forwards `/api` requests to the API during development, on the port that `PORT` sets in `backend/.env`, or 5001 when it's unset.
Without a login, `/host` redirects to `/login`.
The host and player pages use sample data and don't call the API.
The host lobby's **Start game** and **Cancel match** buttons do nothing.

## Contributers
- Nathan Davis - Frontend
- Wilkenson Alcida - API
- Aidan Oien - API

## AI Disclosure 
Email Verification
