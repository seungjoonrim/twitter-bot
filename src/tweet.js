import { reqOpenAi } from "./openai/openai.js";
import { postTweet, postReply } from "./twitter/twitter.js";
import { removeHashtags } from "./utils.js";

// Prompt params ---------------------------------------------------------------
const TOPIC = "sacrifice";

function makePrompt() {
  return `Come up with an inspiring saying about ${TOPIC}. Keep it to 250 characters or less.`;
}

async function createTweet() {
  const openAiPrompt = makePrompt();
  const result = reqOpenAi(openAiPrompt);
  const stripped = removeHashtags(result);
  await postTweet(stripped);
}

function autoTweet() {
  const timeCheck = () => {
    const now = new Date();
    // Tweet everyday at 7am and noon
    if ((now.getHours() === 7 && now.getMinutes() === 0) ||
        (now.getHours() === 12 && now.getMinutes() === 0)) {
      createTweet();
    }
  };

  setInterval(timeCheck, 60000);
}

export { autoTweet }
