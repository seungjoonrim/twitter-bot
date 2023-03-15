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

// Global vars -----------------------------------------------------------------
let tweetStack = [];
let postedReplies = [];
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

    const openAiPrompt = makePrompt(joinedTweets);
    const reply = await reqOpenAi(openAiPrompt);
    const stripped = removeHashtags(reply);
    console.log(`____________________ POASTING REPLY FOR CONVO ID: ${convoId}`);
    const resp = await postReply(sorted, stripped);
    const replyTweet = await getTweet(resp);
    postedReplies.push(replyTweet);
    console.log("____________________ ALL REPLIES SO FAR");
    console.log(postedReplies);

    if (postedReplies.length == 13) {
      await sleep(12);
      break;
    }
  }
}

// If a tweet streams in, wait 6 seconds for add'l tweets in a thread, then analyze the stack
// (There's probably a better way to do this)
async function waitForAdditionalTweets() {
  if (!timer) {
    timer = setTimeout(() => {
      if (tweetStack.length > 0) {
        createReplies(tweetStack);
        tweetStack = [];
      }
    }, 6000);
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

async function autoReply() {
  await setInitialRules();
  streamer = new Streamer(maybeReply);
  streamer.startStream();
}

// createReplies(MOCK_TWEETS_STACK);

export { autoReply }
