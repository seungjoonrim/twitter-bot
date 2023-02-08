let twitterClient = undefined;
let openaiClient = undefined;

function makePrompt() {
  return "";
}

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

function createTweet() {
  console.log("tweeting!");
  const openAiPrompt = makePrompt(joinedTweets);
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
