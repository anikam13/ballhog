import { existsSync, readFileSync } from "node:fs";
import ngrok from "ngrok";

// Load ngrok vars from .env (not loaded automatically outside Vite).
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const match = line.match(/^(NGROK_AUTHTOKEN|NGROK_DOMAIN)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

const port = Number(process.env.NGROK_PORT ?? 5173);
const token = process.env.NGROK_AUTHTOKEN;
const domain = process.env.NGROK_DOMAIN;

const connectOpts: {
  addr: number;
  authtoken?: string;
  hostname?: string;
} = { addr: port };

if (token) connectOpts.authtoken = token;
if (domain) connectOpts.hostname = domain;

let url: string;
try {
  url = await ngrok.connect(connectOpts);
} catch (err) {
  console.error(`
Tunnel failed to start.

If you have not saved your authtoken yet, run (use single quotes if the token contains $):

  ngrok config add-authtoken 'YOUR_TOKEN'

Or export it for this terminal session:

  export NGROK_AUTHTOKEN='YOUR_TOKEN'

Optional fixed domain (from ngrok dashboard):

  export NGROK_DOMAIN=your-name.ngrok-free.dev
`);
  throw err;
}

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
