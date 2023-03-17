import assert from "assert";

import {
  addRules,
  deleteRules,
  getRules,
} from "../src/twitter/twitter.js";

describe('Twitter Integration', function() {
  it('should get rules successfully', async function() {
    const resp = await getRules();
    assert.equal(!!resp, !undefined);
  });
});
