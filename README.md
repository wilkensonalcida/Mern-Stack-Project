# Fight Me Bro
 
COP 4331C MERN group project. Players join a hosted game, choose teams, and use attack, heal, and block actions to battle enemies.
- [Website](https://mern.alex84plus.xyz/)
## Technologies

- React
- React Router for page routes
- Expo and React Native for the mobile app
- TypeScript for type checking swag
- Vite for the frontend dev server and build
- Bootstrap using its prebuilt CSS
- Node.js
- Express
- Socket.IO for the live lobby
- MongoDB and Mongoose
- bcryptjs for password hashing
- JSON Web Tokens (JWT) for authentication
- Bruno for API testing
- Vitest for testing the team fight's rules

## Run the frontend

From the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Run `npm run typecheck` in `frontend` to check the TypeScript code for errors.
Run `npm test` in `frontend` to test the team fight's rules.
The frontend uses React Router for these pages:

| Route | Page | Purpose |
| --- | --- | --- |
| `/` when logged out | `LoginPage.tsx` | Log in to host a game, or go to `/join` |
| `/` when logged in | `DashboardPage.tsx` | Create a lobby, which opens `/host/<code>`, or log out |
| `/join` | `JoinPage.tsx` | Enter a nickname and a session code without an account, then go to `/lobby/<code>` |
| `/lobby/:code` | `LobbyPage.tsx` | Choose a team, then wait for the host to start the game |
| `/play/:code` | `PlayPage.tsx` | Choose a nickname and see a sample lobby. It uses sample data, and no page links to it |
| `/login` | `LoginPage.tsx` | Log in to host a game |
| `/register` | `RegisterPage.tsx` | Create a host account |
| `/verify-email` | `VerifyEmailPage.tsx` | Verify an email address with its emailed link, or send a new link |
| `/host/:code` | `HostPage.tsx` | Show the session code and the players by team, choose the host's team, and start the game, which opens the team fight |

Page components live in `frontend/src/pages/`, and routes are defined in `frontend/src/App.tsx`.
Vite forwards `/api` requests and the lobby's Socket.IO connection at `/socket.io` to the API during development, on the port that `PORT` sets in `backend/.env`, or 5001 when it's unset.
Without a login, `/host/:code` redirects to `/login`.
The dashboard, join, lobby, and host pages talk to the API through Socket.IO.

After **Start game**, the host's page shows the team fight.
The Red and Blue teams take turns, and each turn gives one team 5 seconds to tap **Attack**, **Block**, and **Heal**, until one team's knight reaches 0 HP.
Until players can tap from their own phones, the host's page has the tap buttons, and they tap for whichever team's turn it is.
The fight's code lives in `frontend/src/game/`, and `fightRules.ts` holds its rules, with their numbers at the top.

## Run the mobile app

The mobile app in `mobile` uses Expo and React Native, in TypeScript.
It creates an account, waits for the emailed verification link, logs in, and logs out, against the live API at `https://mern.alex84plus.xyz/api`.
To use another API, set `EXPO_PUBLIC_API_URL`, such as `http://10.0.2.2:5001/api` for a local API from the Android emulator.

From the repository root:

```sh
cd mobile
npm ci
npx expo start
```

Scan the QR code with the Expo Go app on a phone, or press `a` to open the app in a running Android emulator.
The phone and the computer need the same Wi-Fi network, and on a network that blocks that, `npx expo start --tunnel` works instead.
Run `npm run typecheck` in `mobile` to check the TypeScript code for errors.
The app keeps its login token in the phone's encrypted storage through `expo-secure-store`, so it stays logged in until **Log out**.

## Contributers
- Nathan Davis - Frontend
- Wilkenson Alcida - API
- Aidan Oien - API

## AI Disclosure 
Email Verification
