import { autoTweet } from "./src/tweet.js";
import { autoReply } from "./src/reply.js";

async function main() {
  autoTweet();
  autoReply();
}

main();
