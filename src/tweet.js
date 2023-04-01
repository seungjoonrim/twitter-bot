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

function makePrompt() {
  return `Come up with a tweet that inspires courage and sacrifice. Keep it to 250 characters or less.`;
}

async function createTweet() {
  const openAiPrompt = makePrompt();
  const result = await reqOpenAi(openAiPrompt);
  const stripped = removeQuotes(removeHashtags(result));
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
