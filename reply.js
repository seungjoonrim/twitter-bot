let tUserClient = undefined;
let tAppClient = undefined;
let openaiClient = undefined;

function autoReply(userClient, appOnlyClient, openai) {
  tUserClient = userClient;
  tAppClient = appOnlyClient;
  openaiClient = openai;
}

export { autoReply };
