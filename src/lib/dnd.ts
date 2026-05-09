// Drop-zone hit-test helpers for drag-and-drop UI. Both PackTetris and
// StashPanel use the same patterns; centralizing here avoids drift.

// Bounding-box hit test for any element ref.
export function isInside(el: HTMLElement | null, x: number, y: number): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

// Cursor → grid cell coordinates for a fixed-cell-size grid element. Returns
// null if the cursor isn't inside the element.
export function gridCellAt(
  el: HTMLElement | null,
  cellPx: number,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const lx = clientX - r.left;
  const ly = clientY - r.top;
  if (lx < 0 || ly < 0 || lx >= r.width || ly >= r.height) return null;
  return { x: Math.floor(lx / cellPx), y: Math.floor(ly / cellPx) };
}

// First slot whose ref contains the point. Iterates `slots` in order so the
// caller controls priority (e.g. EquippedColumn's helmet/armor/weapon/bag).
export function slotUnder<S extends string>(
  refs: Record<S, React.RefObject<HTMLElement | null>>,
  slots: ReadonlyArray<S>,
  x: number,
  y: number,
): S | null {
  for (const s of slots) {
    if (isInside(refs[s].current, x, y)) return s;
  }
  return null;
}
