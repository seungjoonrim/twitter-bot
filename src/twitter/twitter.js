import {
  ETwitterStreamEvent,
  TwitterApi
} from "twitter-api-v2";

// Twitter creds ---------------------------------------------------------------
const BEARER_TOKEN = process.env.SACRIFICE_BEARER_TOKEN;
const ACCESS_TOKEN = process.env.SACRIFICE_ACCESS_TOKEN;
const ACCESS_TOKEN_SECRET = process.env.SACRIFICE_ACCESS_TOKEN_SECRET;
const API_KEY = process.env.SACRIFICE_API_KEY;
const API_KEY_SECRET = process.env.SACRIFICE_API_KEY_SECRET;

// OAuth1.0a client ------------------------------------------------------------
const userClient = new TwitterApi({
  appKey: API_KEY,
  appSecret: API_KEY_SECRET,
  accessToken: ACCESS_TOKEN,
  accessSecret: ACCESS_TOKEN_SECRET,
});

// OAuth2 client (app-only or user context) ------------------------------------
const appOnlyClient = new TwitterApi(BEARER_TOKEN);

// Twitter stream config -------------------------------------------------------
const TWEET_FIELDS = [
  "attachments",
  "author_id",
  "referenced_tweets",
  "in_reply_to_user_id",
  "created_at",
  "conversation_id",
];
const TWEET_EXPANSIONS = [
  "referenced_tweets.id"
];

async function postTweet(text) {
  try {
    const resp = await userClient.v2.tweet(text);
    console.log("____________________ TWEET SUCCESS");
  } catch (err) {
    console.log("Error tweeting", err);
  }
}

async function postReply(tweets, reply) {
  try {
    const replyResp = await userClient.v2.reply(
      reply,
      tweets[0].id
    );
    console.log("____________________ REPLY SUCCESS");
    return replyResp.data;
  } catch (err) {
    console.log("Error replying to tweet", err);
  }
}

async function getTweet(tweet) {
  try {
    const tweetResp = await userClient.v2.singleTweet(tweet.id, {
      expansions: [
        "entities.mentions.username",
        "in_reply_to_user_id",
      ],
    });
    return tweetResp.data;
  } catch (err) {
    console.log("Error getting tweet", err);
  }
}

class Streamer {
  constructor(callbackFn) {
    this.callback = callbackFn;
    this.stream = undefined;
  }

  async startStream() {
    const tweetFields = `tweet.fields=${TWEET_FIELDS.join(",")}`;
    const expansions = `expansions=${TWEET_EXPANSIONS.join(",")}`;
    this.stream = await appOnlyClient.v2.getStream(`tweets/search/stream?${tweetFields}&${expansions}`);

    // Emitted when Node.js {response} emits a "error" event (contains its payload).
    this.stream.on(ETwitterStreamEvent.ConnectionError,
      err => console.log("Connection error!", err),
    );

    // Emitted when Node.js {response} is closed by remote or using .close().
    this.stream.on(ETwitterStreamEvent.ConnectionClosed,
      () => console.log("Connection has been closed."),
    );

    // Emitted when a Twitter payload (a tweet or not, given the endpoint).
    this.stream.on(ETwitterStreamEvent.Data,
      this.callback
    );

    // Emitted when a Twitter sent a signal to maintain connection active
    this.stream.on(ETwitterStreamEvent.DataKeepAlive,
      // () => console.log("Twitter has a keep-alive packet."),
      () => {},
    );

    // Enable reconnect feature
    this.stream.autoReconnect = true;
  }

  closeStream() {
    this.stream.close();
  }

  reconnectStream() {
    this.stream.reconnect();
  }
}

export {
  getTweet,
  postTweet,
  postReply,
  Streamer,
}
