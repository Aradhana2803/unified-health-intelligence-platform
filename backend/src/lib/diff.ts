/**
 * Simple JSON diff categorization for EHR snapshots.
 * Produces:
 * - new: keys present in to but not in from
 * - modified: keys present in both but different (shallow+nested)
 * - missing: keys present in from but not in to (follow-ups missing)
 *
 * Note: For MVP we treat arrays as atomic values. Improve later with per-item diffs.
 */
export type DiffResult = {
  new: string[];
  modified: string[];
  missing: string[];
};

function isObject(v: any) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function diffJson(fromObj: any, toObj: any, prefix = ''): DiffResult {
  const out: DiffResult = { new: [], modified: [], missing: [] };

  const fromKeys = new Set(Object.keys(fromObj ?? {}));
  const toKeys = new Set(Object.keys(toObj ?? {}));

  for (const k of toKeys) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (!fromKeys.has(k)) {
      out.new.push(path);
      continue;
    }
    const a = (fromObj ?? {})[k];
    const b = (toObj ?? {})[k];
    if (isObject(a) && isObject(b)) {
      const child = diffJson(a, b, path);
      out.new.push(...child.new);
      out.modified.push(...child.modified);
      out.missing.push(...child.missing);
    } else {
      const same = JSON.stringify(a) === JSON.stringify(b);
      if (!same) out.modified.push(path);
    }
  }

  for (const k of fromKeys) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (!toKeys.has(k)) out.missing.push(path);
  }

  return out;
}
