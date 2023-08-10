import { MOCK_TWEETS_STACK } from "../mock.js";

import { reqOpenAi } from "./openai/openai.js";
import {
  getTweet,
  postReply,
  Streamer
} from "./twitter/twitter.js";
import {
  setInitialRules,
  rotateRules,
} from "./rules.js";
import {
  chooseRandomElements,
  groupBy,
  joinTweets,
  removeHashtags,
  removeQuotes,
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

const MAX_REPLIES_PER_DAY = 13;

// Global vars -----------------------------------------------------------------
// let tweetStack = [];
// let postedReplies = [];
let tweetThreads = {};  // Map to store tweets by thread ID
let lastTweetTime = {}; // Map to store the timestamp of the last tweet in each thread
let timer = undefined;
let streamer = undefined;

// Biz -------------------------------------------------------------------------
function promptParams() {
  const min = Math.ceil(1);;
  const max = Math.floor(3);;
  const rand = Math.floor(Math.random() * (max - min + 1)) + min;
  const phrases = chooseRandomElements(rand, OPTIONAL_PHRASES);
  return `From the tweet above, come up with a ${TYPE_OF_TWEET} reply tweet ${PERSONALITY}.` +
  // ` Feel free to use 0 to ${phrases.length} of the following words and phrases if you think any are appropriate: ${phrases.join(", ")}.` +
  ` ${ADDITIONAL_PARAMS.join(". ")}.`;
}

function makePrompt(joined) {
  return `"` + joined + `"` + "\n\n" + promptParams();
}

async function sleep(hours) {
  console.log(`____________________ TWEET LIMIT REACHED, CLOSING STREAM AND SLEEPING FOR ${hours} hours`);
  rotateRules(postedReplies);
  postedReplies = [];
  streamer.closeStream();
  setTimeout(() => {
    console.log("____________________ AWAKE. RECONNECTING...");
    streamer.reconnectStream();
  }, 1000 * 60 * 60 * hours);
}

async function createReplies(tweets) {
  timer = undefined;

  const tweetsByConvoId = groupBy(tweets, "conversation_id");

  for (const convoId in tweetsByConvoId) {
    const tweetsForConvo = tweetsByConvoId[convoId];
    const ogTweet = tweetsForConvo.find(t => !t.in_reply_to_user_id);

    if (!ogTweet) { // ignore tweets that are originially part of a reply
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

    try {
      const openAiPrompt = makePrompt(joinedTweets);
      const reply = await reqOpenAi(openAiPrompt);
      const stripped = removeHashtags(reply);
      const noQuotes = removeQuotes(stripped);
      console.log("REPLY: " + reply);
      console.log("STRIPPED: " + stripped);
      console.log("NO QUOTES: " + noQuotes);
      console.log(`____________________ POASTING REPLY FOR CONVO ID: ${convoId}`);
      const resp = await postReply(sorted, noQuotes);
      const replyTweet = await getTweet(resp);
      if (!!replyTweet) {
        postedReplies.push(replyTweet);
      }
      console.log("____________________ ALL REPLIES SO FAR");
      console.log(postedReplies);
    } catch (err) {
      continue;
    }

    if (postedReplies.length == MAX_REPLIES_PER_DAY) {
      await sleep(12);
      break;
    }
  }
}

async function waitForAdditionalTweets(tweet) {
  // Add the tweet to its thread
  const threadId = tweet.conversation_id;
  if (!tweetThreads[threadId]) {
    tweetThreads[threadId] = [];
  }
  tweetThreads[threadId].push(tweet);

  // Update the timestamp of the last tweet in the thread
  lastTweetTime[threadId] = Date.now();

  // If the tweet is not a reply, consider the thread complete
  if (!tweet.in_reply_to_user_id) {
    if (tweetThreads[threadId].length > 0) {
      createReplies(tweetThreads[threadId]);
      tweetThreads[threadId] = [];
    }
  }
}

function maybeReply(eventData) {
  console.log("____________________ SOMEONE TWEETED\n", eventData);
  // Add the tweet to its thread and process the thread if it's complete
  waitForAdditionalTweets(eventData.data);
}

// Add a function to process incomplete threads after a certain timeout
setInterval(() => {
  const now = Date.now();
  for (const threadId in lastTweetTime) {
    if (now - lastTweetTime[threadId] > 6000) {  // 6 seconds timeout
      if (tweetThreads[threadId].length > 0) {
        createReplies(tweetThreads[threadId]);
        tweetThreads[threadId] = [];
      }
    }
  }
}, 1000);  // Check every second

// function maybeReply(eventData) {
//   console.log("____________________ SOMEONE TWEETED\n", eventData);
//   // Set the timer to wait for additional tweets that may be part of a thread
//   waitForAdditionalTweets();
//   tweetStack.push(eventData.data);
// }

async function autoReply() {
  await setInitialRules();
  streamer = new Streamer(maybeReply);
  streamer.startStream();
}

// createReplies(MOCK_TWEETS_STACK);

export { autoReply }
