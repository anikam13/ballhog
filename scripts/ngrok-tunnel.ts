import { existsSync, readFileSync } from "node:fs";
import ngrok from "ngrok";

// Load NGROK_AUTHTOKEN from .env (not loaded automatically outside Vite).
if (!process.env.NGROK_AUTHTOKEN && existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const match = line.match(/^NGROK_AUTHTOKEN=(.*)$/);
    if (match) process.env.NGROK_AUTHTOKEN = match[1].trim();
  }
}

const port = Number(process.env.NGROK_PORT ?? 5173);
const token = process.env.NGROK_AUTHTOKEN;

if (!token) {
  console.error(`
Missing NGROK_AUTHTOKEN.

1. Sign up: https://dashboard.ngrok.com/signup
2. Copy token: https://dashboard.ngrok.com/get-started/your-authtoken
3. Add to .env in the project root:

   NGROK_AUTHTOKEN=your_token_here

Then run: npm run dev:mobile
`);
  process.exit(1);
}

const url = await ngrok.connect({ addr: port, authtoken: token });

console.log(`
  Mobile URL: ${url}

  Open that link on your phone (any network).
  First visit on ngrok free tier shows a warning page — tap "Visit Site".
`);

async function shutdown() {
  await ngrok.disconnect(url);
  await ngrok.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
