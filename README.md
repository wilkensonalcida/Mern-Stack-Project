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
- Vitest for testing the game's rules

## Run the frontend

From the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Run `npm run typecheck` in `frontend` to check the TypeScript code for errors.
Run `npm test` in `frontend` to test the PvP turn lines the host's screen shows.
The frontend uses React Router for these pages:

| Route | Page | Purpose |
| --- | --- | --- |
| `/` when logged out | `LoginPage.tsx` | Log in to host a game, or go to `/join` |
| `/` when logged in | `DashboardPage.tsx` | Create a lobby, which opens `/host/<code>`, or log out |
| `/join` | `JoinPage.tsx` | Enter a nickname and a session code without an account, then go to `/lobby/<code>` |
| `/lobby/:code` | `LobbyPage.tsx` | Choose a team, then wait for the host to start the game |
| `/play/:code` | `PlayPage.tsx` | A player's phone during the game: the controller, then the result |
| `/login` | `LoginPage.tsx` | Log in to host a game |
| `/register` | `RegisterPage.tsx` | Create a host account |
| `/verify-email` | `VerifyEmailPage.tsx` | Verify an email address with its emailed link, or send a new link |
| `/host/:code` | `HostPage.tsx` | Show the session code and the players by team, and start the game, then show the game: the boss fights side by side, the item votes, and the knights' fight |

Page components live in `frontend/src/pages/`, and routes are defined in `frontend/src/App.tsx`.
Vite forwards `/api` requests and the lobby's Socket.IO connection at `/socket.io` to the API during development, on the port that `PORT` sets in `backend/.env`, or 5001 when it's unset.
Without a login, `/host/:code` redirects to `/login`.
The dashboard, join, lobby, and host pages talk to the API through Socket.IO.

After **Start game**, the host's page shows the game, and each player's phone is the controller, with **Attack**, **Block**, and **Heal**.
Each team fights the Goblin and then the Skeleton with one knight, votes on an item for it after each boss, and then the two knights fight each other, taking 5 second turns, until one reaches 0 HP.
The game runs on the API server, in `backend/sockets/`: `enemyGame.js` and `pvpGame.js` run the boss fights and the knights' fight, and `enemyRules.js`, `upgradeSelection.js`, and `pvpRules.js` hold their rules, which `npm test` in `backend` tests.

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
