import { TwitterApi } from "twitter-api-v2";
import { Configuration, OpenAIApi } from "openai";

import { autoTweet } from "./src/tweet.js";
import { autoReply } from "./src/reply.js";

// Twitter creds ---------------------------------------------------------------
const APP_ID = process.env.SACRIFICE_APP_ID;
const BEARER_TOKEN = process.env.SACRIFICE_BEARER_TOKEN;
const ACCESS_TOKEN = process.env.SACRIFICE_ACCESS_TOKEN;
const ACCESS_TOKEN_SECRET = process.env.SACRIFICE_ACCESS_TOKEN_SECRET;
const API_KEY = process.env.SACRIFICE_API_KEY;
const API_KEY_SECRET = process.env.SACRIFICE_API_KEY_SECRET;

// OpenAI creds ----------------------------------------------------------------
const OAI_API_KEY = process.env.SACRIFICE_OAI_API_KEY;

// OpenAI client ---------------------------------------------------------------
const configuration = new Configuration({ apiKey: OAI_API_KEY });
const openai = new OpenAIApi(configuration);

// OAuth1.0a client ------------------------------------------------------------
const userClient = new TwitterApi({
  appKey: API_KEY,
  appSecret: API_KEY_SECRET,
  accessToken: ACCESS_TOKEN,
  accessSecret: ACCESS_TOKEN_SECRET,
});

// OAuth2 client (app-only or user context) ------------------------------------
const appOnlyClient = new TwitterApi(BEARER_TOKEN);

// Start streaming -------------------------------------------------------------
async function main() {
  autoTweet();
  autoReply();
}

main();
