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

function removeQuotes(str) {
  const chars = str.split("");
  chars.splice(0, 1);
  chars.splice(-1, 1);
  return chars.join("");
}

function groupBy(arr, key) {
  return arr.reduce((grouped, i) => {
    const keyToGroup = i[key];
    if (grouped[keyToGroup]) {
      grouped[keyToGroup].push(i);
    } else {
      grouped[keyToGroup] = [i];
    }
    return grouped;
  }, {});
}

function sortByReferences(tweets) {
    // Create a map to store the relationship between tweets
    let references = new Map();
    tweets.forEach(tweet => {
        // Add the tweet to the map with its reference
        if (tweet.referenced_tweets && tweet.referenced_tweets.length > 0) {
            references.set(tweet.id, tweet.referenced_tweets[0].id);
        }
    });
    // Sort the tweets based on their references
    tweets.sort((a, b) => {
        // If a does not have a reference, it should come first
        if (!references.has(a.id)) {
            return -1;
        }
        // If b does not have a reference, it should come first
        if (!references.has(b.id)) {
            return 1;
        }
        // Compare the references of a and b
        return references.get(a.id) - references.get(b.id);
    });
    return tweets;
}

function joinTweets(tweets) {
  const tweetContents = tweets.map(t => t.text);
  return tweetContents.join("\n\n");
}

function chooseRandomElements(amount, arr) {
  return [...Array(amount).keys()].reduce((result, i) => {
    const length = arr.length;
    const index = Math.floor(Math.random() * (Math.floor(length - 1) + 1));
    const el = arr[index];
    result.push(el);
    arr.splice(index, 1);
    return result;
  }, []);
}

export {
  chooseRandomElements,
  groupBy,
  joinTweets,
  removeHashtags,
  removeQuotes,
  sortByReferences,
}
