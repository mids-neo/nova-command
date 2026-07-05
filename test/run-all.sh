#!/bin/sh
# Run the full simulation suite. Requires Node. ~5-10 minutes total.
set -e
cd "$(dirname "$0")"
for t in smoke smoke2 mp-test mp3-test replay-test; do
  echo "=== $t ==="
  node "$t.js" | tail -2
done
echo "ALL TESTS PASSED"
