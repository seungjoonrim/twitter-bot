# Twitter Bot

## Description
Twitter bot hooked up to ChatGPT. Autoreplies and autotweets AI generated content that is configurable.

## Uses:
- twitter api (twitter-api-v2 lib)
- openAI chatGPT

## Setup:
- apply for elevated access for twitter API
- set up openAI account
- configure env variables
- configure personality of the bot in `reply.js` and `tweet.js`
- configure which accounts you want to listen on and stream in `rules.js`

## Run tests:
```
npm install
npm run test
```

## Run the bot:
```
npm run start
```
