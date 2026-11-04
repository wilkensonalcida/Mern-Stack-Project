# Fight Me Bro
 
COP 4331C MERN group project. Players join a hosted game, choose teams, and use attack, heal, and block actions to battle enemies.

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
| `/` | `LandingPage.tsx` | Choose guest joining or host login and registration |
| `/join` | `JoinPage.tsx` | Enter a game PIN and nickname without an account |
| `/login` | `LoginPage.tsx` | Log in to host a game |
| `/register` | `RegisterPage.tsx` | Create a host account |
| `/host` | `HostPage.tsx` | Preview the host lobby with sample players and a session code |

Page components live in `frontend/src/pages/`, and routes are defined in `frontend/src/App.tsx`.
Vite forwards `/api` requests to the API during development, on the port that `PORT` sets in `backend/.env`, or 5001 when it's unset.
The host lobby is a public structural preview with sample data and Start game and Cancel match controls that have no actions connected.
Host authentication and live session behavior are not connected.

## Contributers
- Nathan Davis - Frontend
- Wilkenson Alcida - API
- Aidan Oien - API
