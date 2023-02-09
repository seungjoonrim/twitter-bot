import { reqOpenAi } from "./openai/openai.js";
import { postTweet } from "./twitter/twitter.js";
import { removeHashtags } from "./utils.js";

const TOPIC = "sacrifice";
const TIMES_TO_TWEET = [
  7,
  12,
];

function makePrompt() {
  return `Come up with an inspiring saying about ${TOPIC}. Keep it to 250 characters or less.`;
}

async function createTweet() {
  const openAiPrompt = makePrompt();
  const result = await reqOpenAi(openAiPrompt);
  const stripped = removeHashtags(result);
  await postTweet(stripped);
}

function autoTweet() {
  const timeCheck = () => {
    const now = new Date();
    for (const time in TIMES_TO_TWEET) {
      if (now.getHours() === time && now.getMinutes() === 0) {
        createTweet();
      }
    }
  };

  setInterval(timeCheck, 60000);
}

export { autoTweet }
