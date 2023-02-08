import {
  ETwitterStreamEvent,
} from "twitter-api-v2";

import { MOCK_TWEETS } from "../mock.js";

import { reqOpenAi } from "./openai/openai.js";
import { postReply, getTweet } from "./twitter/twitter.js";
import {
  groupBy,
  removeHashtags,
  sortByReferences
} from "./utils.js";

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

// Global vars -----------------------------------------------------------------
let tUserClient = undefined;
let tAppClient = undefined;
let openaiClient = undefined;

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
    const reply = await reqOpenAi(openAiPrompt);
    const stripped = removeHashtags(reply);
    console.log(`____________________ POASTING REPLY FOR CONVO ID: ${convoId}`);
    const resp = await postReply(sorted, stripped);
    const replyTweet = await getTweet(resp);
    postedReplies.push(replyTweet);
    console.log("____________________ ALL REPLIES SO FAR");
    console.log(postedReplies);

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

async function autoReply(userClient, appOnlyClient, openai) {
  tUserClient = userClient;
  tAppClient = appOnlyClient;
  openaiClient = openai;

  const tweetFields = `tweet.fields=${TWEET_FIELDS.join(",")}`;
  const expansions = `expansions=${TWEET_EXPANSIONS.join(",")}`;
  stream = await tAppClient.v2.getStream(`tweets/search/stream?${tweetFields}&${expansions}`);

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

// createReplies(MOCK_TWEETS);

export { autoReply }
