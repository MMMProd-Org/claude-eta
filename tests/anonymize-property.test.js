import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { dedupKey, locBucket, normalizeModel } from '../dist/anonymize.js';

const FC_OPTIONS = { numRuns: 100, seed: 20260512 };

describe('anonymize property checks', () => {
  it('dedupKey is deterministic and always emits a 32-char hex key', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), fc.string({ maxLength: 200 }), (contributor, taskId) => {
        const key = dedupKey(contributor, taskId);
        assert.equal(key, dedupKey(contributor, taskId));
        assert.match(key, /^[a-f0-9]{32}$/);
      }),
      FC_OPTIONS,
    );
  });

  it('locBucket preserves bucket boundaries for non-negative line counts', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (loc) => {
        const expected =
          loc < 1000 ? 'tiny' : loc < 10000 ? 'small' : loc < 50000 ? 'medium' : loc < 200000 ? 'large' : 'huge';

        assert.equal(locBucket(loc), expected);
      }),
      FC_OPTIONS,
    );
  });

  it('normalizeModel removes only trailing metadata suffixes', () => {
    const bracketSuffixArbitrary = fc.stringMatching(/^[^\]\r\n]{0,20}$/);

    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z][a-z0-9.-]{0,40}$/),
        fc.integer({ min: 20200101, max: 20991231 }),
        bracketSuffixArbitrary,
        (base, dateSuffix, bracketSuffix) => {
          assert.equal(normalizeModel(`${base}-${dateSuffix}`), base);
          assert.equal(normalizeModel(`${base}[${bracketSuffix}]`), base);
        },
      ),
      FC_OPTIONS,
    );
  });
});
