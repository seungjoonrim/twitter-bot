async function postTweet(text) {
  try {
    const resp = await twitterClient.v2.tweet(text);
    console.log("____________________ TWEET SUCCESS");
  } catch (err) {
    console.log("Error tweeting", err);
  }
}

async function postReply(tweets, reply) {
  try {
    const replyResp = await tUserClient.v2.reply(
      reply,
      tweets[0].id
    );
    console.log("____________________ REPLY SUCCESS");
    return replyResp.data;
  } catch (err) {
    console.log("Error replying to tweet", err);
  }
}

async function getTweet(tweet) {
  try {
    const tweetResp = await tUserClient.v2.singleTweet(tweet.id, {
      expansions: [
        "entities.mentions.username",
        "in_reply_to_user_id",
      ],
    });
    return tweetResp.data;
  } catch (err) {
    console.log("Error getting tweet", err);
  }
}
