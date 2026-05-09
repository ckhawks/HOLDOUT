"use client";

import { useEffect } from "react";

// Window-level pointer/keyboard listeners scoped to a drag's lifetime.
// While `drag` is non-null, the listeners are mounted; when it goes back
// to null, they're torn down. Handlers receive the *current* drag value
// as their second arg so callers don't need to thread it through closures.
//
// The hook re-runs whenever any of (drag, onMove, onUp, onKey, onContextMenu)
// changes — same semantics as inlining a useEffect, just with the
// boilerplate hoisted out.
export function useDragDrop<T>(
  drag: T | null,
  handlers: {
    onMove: (e: PointerEvent, drag: T) => void;
    onUp: (e: PointerEvent, drag: T) => void;
    onKey?: (e: KeyboardEvent, drag: T) => void;
    onContextMenu?: (e: MouseEvent, drag: T) => void;
  },
): void {
  const { onMove, onUp, onKey, onContextMenu } = handlers;
  useEffect(() => {
    if (!drag) return;
    const m = (e: PointerEvent) => onMove(e, drag);
    const u = (e: PointerEvent) => onUp(e, drag);
    window.addEventListener("pointermove", m);
    window.addEventListener("pointerup", u);
    let k: ((e: KeyboardEvent) => void) | null = null;
    let c: ((e: MouseEvent) => void) | null = null;
    if (onKey) {
      k = (e: KeyboardEvent) => onKey(e, drag);
      window.addEventListener("keydown", k);
    }
    if (onContextMenu) {
      c = (e: MouseEvent) => onContextMenu(e, drag);
      window.addEventListener("contextmenu", c);
    }
    return () => {
      window.removeEventListener("pointermove", m);
      window.removeEventListener("pointerup", u);
      if (k) window.removeEventListener("keydown", k);
      if (c) window.removeEventListener("contextmenu", c);
    };
  }, [drag, onMove, onUp, onKey, onContextMenu]);
}
