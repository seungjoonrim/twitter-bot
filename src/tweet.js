import { reqOpenAi } from "./openai/openai.js";
import { postTweet } from "./twitter/twitter.js";
import {
  removeHashtags,
  removeQuotes,
} from "./utils.js";

const TOPIC = "sacrifice";
const TIMES_TO_TWEET = [
  7,
  12,
];
const TWEET_EXAMPLES = [
  "The bravest thing you can do is keep going even when you're scared.",
  "Why is the theme of sacrifice not taught in school?\nBecause when you think about sacrifice long enough, all roads point to God.\nAnd governments don't want you to believe in God.",
  "A lot of you are depressed because you feel like you don't matter.\nWhat if I told you EVERY. SINGLE. CHOICE. you make matters.\nBecause every choice is a sacrifice.\nAnd every sacrifice produces value.\nYou matter. You just need to believe it.",
  `Nothing in life is free."\nIn other words, "No sacrifice, no value."\nThis also means nothing in life is "cheap."  You can't get the same product for less - you or someone out there will pay the full cost, one way or another.`,
  "Sacrifice is the ultimate act of love, it transforms what we give up into the greatest gift we can offer.",
  `*Game starts*\n...\n"Choose your sacrifice."`,
];

function makePrompt() {
  return `Using these examples:\n\n${TWEET_EXAMPLES.join("\n\n")}\n\nCome up with a tweet that inspires courage and sacrifice. Keep it to 250 characters or less.`;
}

async function createTweet() {
  const openAiPrompt = makePrompt();
  const result = await reqOpenAi(openAiPrompt);
  const noQuotes = removeQuotes(result);
  const stripped = removeHashtags(noQuotes);
  await postTweet(stripped);
}

function autoTweet() {
  const timeCheck = () => {
    const now = new Date();
    const timezoneOffset = -300; // -300 minutes for EST
    const estTime = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000 + timezoneOffset * 60 * 1000);
    for (const i in TIMES_TO_TWEET) {
      if (estTime.getHours() === TIMES_TO_TWEET[i] && estTime.getMinutes() === 0) {
        createTweet();
      }
    }
  };

  setInterval(timeCheck, 60000);
}

export { autoTweet }
