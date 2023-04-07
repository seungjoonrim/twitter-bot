import { Configuration, OpenAIApi } from "openai";

const OAI_API_KEY = process.env.SACRIFICE_OAI_API_KEY;

const configuration = new Configuration({ apiKey: OAI_API_KEY });
const openai = new OpenAIApi(configuration);

async function reqOpenAi(prompt) {
  console.log("____________________ HERES THE PROMPT");
  console.log(prompt);

  try {
    const response = await openai.createCompletion({
      model: "gpt-3.5-turbo",
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

export { reqOpenAi };
