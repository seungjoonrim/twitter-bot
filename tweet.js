let twitterClient = undefined;
let openaiClient = undefined;

const TOPIC = "sacrifice";

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

function makePrompt() {
  return `Come up with an inspiring saying about ${TOPIC}. Keep it to 250 characters or less.`;
}

async function reqOpenAi(prompt) {
  try {
    const response = await openaiClient.createCompletion({
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
    console.log("______________ SACRIFICE TWEET:", response.data);
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

async function tweet(text) {
  try {
    const resp = await twitterClient.v2.tweet(text);
  } catch (err) {
    console.log("Error tweeting", err);
  }
}

async function createTweet() {
  console.log("tweeting!");
  const openAiPrompt = makePrompt();
  const result = reqOpenAi(openAiPrompt);
  const stripped = removeHashtags(result);
  await tweet(stripped);
}

function autoTweet(twitter, openai) {
  twitterClient = twitter;
  openaiClient = openai;

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

export { autoTweet };
