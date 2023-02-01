import {
  ETwitterStreamEvent,
  TwitterApi
} from "twitter-api-v2";
import {
  Configuration,
  OpenAIApi
} from "openai";

import { MOCK_TWEETS } from "./mock.js";

// Twitter creds ---------------------------------------------------------------
const APP_ID = process.env.SACRIFICE_APP_ID;
const BEARER_TOKEN = process.env.SACRIFICE_BEARER_TOKEN;
const ACCESS_TOKEN = process.env.SACRIFICE_ACCESS_TOKEN;
const ACCESS_TOKEN_SECRET = process.env.SACRIFICE_ACCESS_TOKEN_SECRET;
const API_KEY = process.env.SACRIFICE_API_KEY;
const API_KEY_SECRET = process.env.SACRIFICE_API_KEY_SECRET;

// OpenAI creds ----------------------------------------------------------------
const OAI_API_KEY = process.env.SACRIFICE_OAI_API_KEY;

// Prompt constants -------------------------------------------------------------
const PERSONALITY = "as if you were Marcus Aurelius";
const TYPE_OF_TWEET = "";
const OPTIONAL_PHRASES = [
  "sacrifice",
  "value",
];
const ADDITIONAL_PARAMS = [
  "Do not use any #hashtags",
  "Do not use any emojis",
  "Don't use a direct quote",
  "Keep the response to 250 characters or less",
  "Return the response in quotes",
];

function promptParams() {
  const min = Math.ceil(1);;
  const max = Math.floor(3);;
  const rand = Math.floor(Math.random() * (max - min + 1)) + min;

  const phrases = [...Array(rand).keys()].reduce((result, i) => {
    const length = OPTIONAL_PHRASES.length;
    const index = Math.floor(Math.random() * (Math.floor(length - 1) + 1));
    const phrase = OPTIONAL_PHRASES[index];
    const alreadyPulled = result.find(i => i == phrase);
    if (!alreadyPulled) {
      result.push(phrase);
    }
    return result;
  }, []);
  return `From the tweet above, come up with a ${TYPE_OF_TWEET} reply tweet ${PERSONALITY}.` +
  ` Feel free to use 0 to ${phrases.length} of the following words and phrases if you think any are appropriate: ${phrases.join(", ")}.` +
  ` ${ADDITIONAL_PARAMS.join(". ")}.`;
}

// OpenAI client ---------------------------------------------------------------
const configuration = new Configuration({
  apiKey: OAI_API_KEY
});
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

let tweetStack = [];
let postedReplies = [];
let timer = undefined;
let isSleeping = false;

// Helpers ---------------------------------------------------------------------
function joinTweets(tweets) {
  const tweetContents = tweets.map(t => t.data.text);
  return tweetContents.join("\n\n");
}

function makePrompt(joined) {
  return `"` + joined + `"` + "\n\n" + promptParams();
}

function sortByReferences(tweets) {
    // Create a map to store the relationship between tweets
    let references = new Map();
    tweets.forEach(tweet => {
        // Add the tweet to the map with its reference
        if (tweet.data.referenced_tweets && tweet.data.referenced_tweets.length > 0) {
            references.set(tweet.data.id, tweet.data.referenced_tweets[0].id);
        }
    });
    // Sort the tweets based on their references
    tweets.sort((a, b) => {
        // If a does not have a reference, it should come first
        if (!references.has(a.data.id)) {
            return -1;
        }
        // If b does not have a reference, it should come first
        if (!references.has(b.data.id)) {
            return 1;
        }
        // Compare the references of a and b
        return references.get(a.data.id) - references.get(b.data.id);
    });
    return tweets;
}

function removeHashtags(str) {
  const words = str.split(" ");
  // Only remove the # from hashtags in the middle of sentences
  for (let i = 0; i < words.length; i++) {
    if (words[i].startsWith("#") &&
        (i === 0 || !words[i - 1].startsWith("#")) &&
        (i === words.length - 1 || !words[i + 1].startsWith("#"))) {
      words[i] = words[i].substring(1);
    }
  }
  // Entirely remove the hashtags that are left. (At the end of the tweet)
  return words.filter(word => !word.startsWith("#")).join(" ");
}

// OpenAI ----------------------------------------------------------------------
async function reqOpenAi(prompt) {
  try {
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      temperature: 0.5,
      max_tokens: 65, // No need to return responses greater than 250 char count for twitter
      top_p: 1,
      n: 1, // only return one choice, dont want to burn through API
      frequency_penalty: 0.0, // what does this do?
      presence_penalty: 0.6, // what does this do?
      stop: null, // what does this do?
    });
    console.log("______________ OPEN AI RESPONSE:", response.data);
    const text = response.data.choices[0].text;
    if ((text.charAt(2) == '"') && (text.charAt(text.length - 1) == '"')) {
      return text.slice(3, -1);
    } else {
      return text.slice(2);
    }
  } catch (err) {
    console.log("Error getting response from OpenAI", err);
  }
}

// Twitter ---------------------------------------------------------------------
async function postReply(tweets, reply) {
  try {
    const replyResp = await userClient.v2.reply(
      reply,
      tweets[0].data.id
    );
    const replyTweet = await userClient.v2.singleTweet(replyResp.data.id, {
      expansions: [
        'entities.mentions.username',
        'in_reply_to_user_id',
      ],
    });
    console.log("____________________ REPLY SUCCESS");
    postedReplies.push(replyTweet.data);
    console.log("____________________ ALL REPLIES SO FAR");
    console.log(postedReplies);
  } catch (err) {
    console.log("Error replying to tweet", err);
  }
}

async function createReply() {
  timer = undefined;

  const repliesForUserId = postedReplies.filter(t => t.in_reply_to_user_id == tweetStack[0].data.author_id);
  console.log(`____________________ REPLY COUNT FOR USER: ${repliesForUserId.length}`);

  // We have to sort because sometimes the API returns tweets from threads in the wrong order
  const sorted = sortByReferences(tweetStack);
  const joinedTweets = joinTweets(sorted);

  // (For now) Don't reply to:
  if ((tweetStack.length == 0) ||
      (tweetStack.length == 1 && tweetStack[0].data.in_reply_to_user_id) || // tweet replies
      (tweetStack.length == 1 && Object.keys(tweetStack[0].data.attachments).length > 0) || // single tweets with an image
      (joinedTweets.length < 80) || // tweets less than 50 chars long
      (repliesForUserId.length >= 1)) { // a tweet if already replied to once
    console.log("____________________ IGNORING THIS TWEET");
    tweetStack = [];
    return;
  }

  const openAiPrompt = makePrompt(joinedTweets);

  console.log("____________________ HERES THE PROMPT");
  console.log(openAiPrompt);

  const reply = await reqOpenAi(openAiPrompt);
  const stripped = removeHashtags(reply);
  await postReply(sorted, stripped);

  tweetStack = [];

  // Keep it to 10 tweets/day
  if (postedReplies.length > 9) {
    const sleepTime = 12; // hours
    console.log(`____________________ TWEET LIMIT REACHED, SLEEPING FOR ${sleepTime} hours`);
    postedReplies = [];
    isSleeping = true;
    setTimeout(() => {
      isSleeping = false;
    }, 1000 * 60 * 60 * sleepTime);
  }
}

// There's probably a better way to do this
async function waitForAdditionalTweets() {
  if (!timer) {
    timer = setTimeout(() => {
      if (tweetStack.length > 0) {
        createReply();
      }
    }, 6000); // for a reference: 13 tweet thread took longer than 3 seconds for all to stream in
  } else {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (tweetStack.length > 0) {
        createReply();
      }
    }, 6000);
  }
}

function maybeReply(eventData) {
  console.log("____________________ SOMEONE TWEETED\n", eventData);

  if (isSleeping) {
    console.log("____________________ SLEEPING");
    return;
  }
  // Set the timer to wait for additional tweets that may be part of a thread
  waitForAdditionalTweets();

  // New tweet(s) to analyze and potentially reply to
  if (tweetStack.length == 0 && !eventData.data.in_reply_to_user_id) {
    tweetStack.push(eventData);
  }

  // Tweet came in, check if it's part of a thread of one of the tweets already in the stack.
  // If new tweets come in while a reply is being created, they will be ignored
  if (tweetStack.length != 0) {
    const tweetIds = tweetStack.map(t => t.data.id);
    const conversationId = tweetStack[0].data.conversation_id;
    const isPartOfThread = tweetIds.includes(eventData.data.referenced_tweets[0].id);
    if (isPartOfThread || eventData.data.conversation_id == conversationId) {
      tweetStack.push(eventData);
    }
  }
}

// Start streaming -------------------------------------------------------------
async function main() {
  const tweetFields = "tweet.fields=attachments,author_id,referenced_tweets,in_reply_to_user_id,created_at,conversation_id";
  const expansions = "expansions=referenced_tweets.id";
  const stream = await appOnlyClient.v2.getStream(`tweets/search/stream?${tweetFields}&${expansions}`);

  // Emitted when Node.js {response} emits a "error" event (contains its payload).
  stream.on(ETwitterStreamEvent.ConnectionError,
    err => console.log("Connection error!", err),
  );

  // Emitted when Node.js {response} is closed by remote or using .close().
  stream.on(ETwitterStreamEvent.ConnectionClosed,
    () => console.log("Connection has been closed."),
  );

  // Emitted when a Twitter payload (a tweet or not, given the endpoint).
  stream.on(ETwitterStreamEvent.Data,
    maybeReply
  );

  // Emitted when a Twitter sent a signal to maintain connection active
  stream.on(ETwitterStreamEvent.DataKeepAlive,
    // () => console.log("Twitter has a keep-alive packet."),
    () => {},
  );

  // Enable reconnect feature
  stream.autoReconnect = true;
}

main();

// createReply(MOCK_TWEETS);
