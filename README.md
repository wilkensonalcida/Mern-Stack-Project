# Fight Me Bro
 
COP 4331C MERN group project. Players join a hosted game, choose teams, and use attack, heal, and block actions to battle enemies.

## Technologies

- React
- TypeScript
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

Open the local URL printed by Vite.
The frontend uses React Router for these pages:

| Route | Page | Purpose |
| --- | --- | --- |
| `/` | `LandingPage.tsx` | Choose guest joining or host login and registration |
| `/join` | `JoinPage.tsx` | Enter a game PIN and nickname without an account |
| `/login` | `LoginPage.tsx` | Log in to host a game |
| `/register` | `RegisterPage.tsx` | Create a host account |

Page components live in `frontend/src/pages/`, and routes are defined in `frontend/src/App.tsx`.
The forms collect input and prevent a page reload on submit; they do not yet send API requests or enter a game.
Password confirmation checks, authentication state, and navigation after successful submission are integration work.
Vite forwards `/api` requests to `http://127.0.0.1:6000` during development.

## Contributers
- Nathan Davis - Frontend
- Wilkenson Alcida - API
- Aidan Oien - API
