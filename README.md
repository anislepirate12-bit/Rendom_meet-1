# Random Meet

A simple Arabic, right-to-left random text chat website built with Node.js, Express, and Socket.IO.

## Run locally

Requirements: Node.js 18 or newer.

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Deploy on Render

1. Upload **the contents of this folder** to the root of a GitHub repository. The repository root must show `package.json`, `server.js`, `README.md`, and the `public` folder.
2. On Render, choose **New + → Web Service**, then connect the repository.
3. Set **Build Command** to `npm install` and **Start Command** to `npm start`.
4. Deploy and wait for the service to finish building.

The app listens on `process.env.PORT` and includes `/health` for a basic health check.

## Important notes

- Only users connected to the same running server instance can be matched.
- Reports are kept in memory and are not sent to a moderation team. Block/report data is not permanent.
- This is a starter project, not a fully moderated dating service. Add persistent storage, rate limiting, and an actual moderation workflow before public promotion.
- Intended for adults 18+. Do not share personal information with strangers.
