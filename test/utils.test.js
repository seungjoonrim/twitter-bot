import assert from "assert";

import {
  removeHashtags,
  removeQuotes,
  sortByReferences,
} from "../src/utils.js";

import {
  MOCK_TWEETS_STACK
} from "../mock.js";

describe("Utility Functions", function() {
  it("should remove trailing hashtags and remove the # from mid sentence hashtags", function() {
    const input = "The #quick brown fox #jumped over. #the #lazy #dog";
    const result = removeHashtags(input);
    const expected = "The quick brown fox jumped over.";
    assert.equal(result, expected);
  });

  it("should remove double quotes from start and end of string", function() {
    const input = `"This is a test."`;
    const expected = `This is a test.`;
    const result = removeQuotes(input);
    assert.equal(result, expected);
  });

  it("should sort tweets by reference", function() {
    const result = sortByReferences(MOCK_TWEETS_STACK);
    const ids = result.map(t => t.id);
    const expected = [
      "1619373032463794178",
      "1619373035416338432",
      "1619373038335840258",
      "1619373040156168192",
      "1619373041909383168",
      "1619373044086218752",
    ];
    for (let i in ids) {
      const id = ids[i];
      assert.equal(i, expected.indexOf(id));
    }
  });
});
