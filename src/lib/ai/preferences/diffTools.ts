/**
 * Diff Tools
 *
 * Calculate differences between AI-generated and human-edited outputs.
 * Used for learning user preferences.
 */

/**
 * Compute structured diff between original and edited output
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeDiff(original: any, edited: any): any {
  // Simple JSON diff for now
  // In production, use a robust diff library like jsondiffpatch

  if (typeof original !== typeof edited) {
    return {
      type: "type_changed",
      from: typeof original,
      to: typeof edited,
      original,
      edited,
    };
  }

  if (typeof original !== "object" || original === null) {
    if (original !== edited) {
      return {
        type: "value_changed",
        from: original,
        to: edited,
      };
    }
    return null;
  }

  // Object/array diff
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const changes: any = {};
  const allKeys = [...new Set([...Object.keys(original), ...Object.keys(edited)])];

  for (const key of allKeys) {
    const origValue = original[key];
    const editedValue = edited[key];

    if (origValue !== editedValue) {
      changes[key] = {
        from: origValue,
        to: editedValue,
      };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Extract meaningful edits (ignore minor formatting changes)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMeaningfulEdits(diff: any): string[] {
  if (!diff) return [];

  const edits: string[] = [];

  // Recursively find meaningful changes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function traverse(obj: any, path: string = "") {
    if (obj && typeof obj === "object") {
      if (obj.type === "value_changed") {
        edits.push(`${path}: ${obj.from} → ${obj.to}`);
      } else {
        for (const key in obj) {
          const newPath = path ? `${path}.${key}` : key;
          traverse(obj[key], newPath);
        }
      }
    }
  }

  traverse(diff);
  return edits;
}

/**
 * Calculate edit distance (how different are the outputs?)
 */
export function calculateEditDistance(original: string, edited: string): number {
  // Levenshtein distance
  const m = original.length;
  const n = edited.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (original[i - 1] === edited[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] =
          1 +
          Math.min(
            dp[i - 1][j], // delete
            dp[i][j - 1], // insert
            dp[i - 1][j - 1] // replace
          );
      }
    }
  }

  return dp[m][n];
}
