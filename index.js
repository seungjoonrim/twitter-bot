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

// Prompt params ---------------------------------------------------------------
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

// Global vars -----------------------------------------------------------------
let tweetStack = [];
let postedReplies = [];
let timer = undefined;
let stream = undefined;

// Helpers ---------------------------------------------------------------------
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
  // ` Feel free to use 0 to ${phrases.length} of the following words and phrases if you think any are appropriate: ${phrases.join(", ")}.` +
  ` ${ADDITIONAL_PARAMS.join(". ")}.`;
}

function joinTweets(tweets) {
  const tweetContents = tweets.map(t => t.text);
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
        if (tweet.referenced_tweets && tweet.referenced_tweets.length > 0) {
            references.set(tweet.id, tweet.referenced_tweets[0].id);
        }
    });
    // Sort the tweets based on their references
    tweets.sort((a, b) => {
        // If a does not have a reference, it should come first
        if (!references.has(a.id)) {
            return -1;
        }
        // If b does not have a reference, it should come first
        if (!references.has(b.id)) {
            return 1;
        }
        // Compare the references of a and b
        return references.get(a.id) - references.get(b.id);
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

function groupBy(arr, key) {
  return arr.reduce((grouped, i) => {
    const keyToGroup = i[key];
    if (grouped[keyToGroup]) {
      grouped[keyToGroup].push(i);
    } else {
      grouped[keyToGroup] = [i];
    }
    return grouped;
  }, {});
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
      tweets[0].id
    );
    const replyTweet = await userClient.v2.singleTweet(replyResp.data.id, {
      expansions: [
        "entities.mentions.username",
        "in_reply_to_user_id",
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

async function createReplies(tweets) {
  timer = undefined;

  const tweetsByConvoId = groupBy(tweets, "conversation_id");

  for (const convoId in tweetsByConvoId) {
    const tweetsForConvo = tweetsByConvoId[convoId];
    const ogTweet = tweetsForConvo.find(t => !t.in_reply_to_user_id);

    if (!ogTweet) { // ignore single reply tweets
      console.log("____________________ IGNORING THIS TWEET");
      continue;
    }

    const repliesForUserId = postedReplies.filter(t => t.in_reply_to_user_id == ogTweet.author_id);
    console.log(`____________________ REPLY COUNT FOR USER ${ogTweet.author_id}: ${repliesForUserId.length}`);

    const filtered = tweetsForConvo.filter(t => t.author_id == ogTweet.author_id); // filter out other user's replies
    const sorted = sortByReferences(filtered);
    const joinedTweets = joinTweets(sorted);

    if ((sorted.length == 0) ||
        (sorted.length == 1 && Object.keys(sorted[0].attachments).length > 0) || // single tweets with an image
        (joinedTweets.length < 80) || // tweets less than 50 chars long
        (repliesForUserId.length >= 1)) { // a tweet if already replied to once
      console.log("____________________ IGNORING THIS TWEET");
      continue;
    }

    const openAiPrompt = makePrompt(joinedTweets);

    console.log("____________________ HERES THE PROMPT");
    console.log(openAiPrompt);

    const reply = await reqOpenAi(openAiPrompt);
    const stripped = removeHashtags(reply);
    console.log(`____________________ POASTING REPLY FOR CONVO ID: ${convoId}`);
    await postReply(sorted, stripped);

    if (postedReplies.length > 9) {
      const sleepTime = 12; // hours
      console.log(`____________________ TWEET LIMIT REACHED, CLOSING STREAM AND SLEEPING FOR ${sleepTime} hours`);
      postedReplies = [];
      stream.close();
      setTimeout(() => {
        console.log("____________________ AWAKE. RECONNECTING...");
        stream.reconnect();
      }, 1000 * 60 * 60 * sleepTime);
      break;
    }
  }
}

// If a tweet streams in, wait 6 seconds for tweets in a thread, then analyze the stack
// (There's probably a better way to do this)
async function waitForAdditionalTweets() {
  if (!timer) {
    timer = setTimeout(() => {
      if (tweetStack.length > 0) {
        createReplies(tweetStack);
        tweetStack = [];
      }
    }, 6000); // for a reference: 13 tweet thread took longer than 3 seconds for all to stream in
  } else {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (tweetStack.length > 0) {
        createReplies(tweetStack);
        tweetStack = [];
      }
    }, 6000);
  }
}

function maybeReply(eventData) {
  console.log("____________________ SOMEONE TWEETED\n", eventData);

  // Set the timer to wait for additional tweets that may be part of a thread
  waitForAdditionalTweets();

  tweetStack.push(eventData.data);
}

// Start streaming -------------------------------------------------------------
async function main() {
  const tweetFields = `tweet.fields=${TWEET_FIELDS.join(",")}`;
  const expansions = `expansions=${TWEET_EXPANSIONS.join(",")}`;
  stream = await appOnlyClient.v2.getStream(`tweets/search/stream?${tweetFields}&${expansions}`);

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

// createReplies(MOCK_TWEETS);
