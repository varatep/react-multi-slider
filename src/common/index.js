/**
 * To prevent text selection while dragging.
 * http://stackoverflow.com/questions/5429827/how-can-i-prevent-text-element-selection-with-cursor-drag
 */
export function pauseEvent(e) {
  if (e.stopPropagation) e.stopPropagation();
  if (e.preventDefault) e.preventDefault();
  e.cancelBubble = true;
  e.returnValue = false;
  return false;
}

export function stopPropagation(e) {
  if (e.stopPropagation) e.stopPropagation();
  e.cancelBubble = true;
}

/**
 * Spreads `count` values equally between `min` and `max`.
 */
export function linspace(min, max, count) {
  const range = (max - min) / (count - 1);
  const res = [];
  for (let i = 0; i < count; i++) {
    res.push(min + range * i);
  }
  return res;
}

// undoEnsureArray(ensureArray(x)) === x

export function ensureArray(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

export function undoEnsureArray(x) {
  return x && x.length === 1 ? x[0] : x;
}
