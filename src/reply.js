import { MOCK_TWEETS } from "../mock.js";

import { reqOpenAi } from "./openai/openai.js";
import {
  getTweet,
  postReply,
  Streamer
} from "./twitter/twitter.js";
import {
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
      streamer.closeStream();
      setTimeout(() => {
        console.log("____________________ AWAKE. RECONNECTING...");
        streamer.reconnectStream();
      }, 1000 * 60 * 60 * sleepTime);
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

function autoReply() {
  streamer = new Streamer(maybeReply);
  streamer.startStream();
}

// createReplies(MOCK_TWEETS);

export { autoReply }
