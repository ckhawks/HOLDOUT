"use client";

import { useSyncExternalStore } from "react";

// Lightweight global toast queue. Module-level so any code path (store
// action, component handler) can call `toast(...)`. The Toaster component
// subscribes via useSyncExternalStore — same pattern as useNow.

export type ToastTone = "info" | "warn" | "error" | "success";

export interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 2800;

let queue: Toast[] = [];
const subscribers = new Set<() => void>();
let nextId = 1;

function emit() {
  for (const fn of subscribers) fn();
}

function prune(now: number) {
  const before = queue.length;
  queue = queue.filter((t) => t.expiresAt > now);
  if (queue.length !== before) emit();
}

export function toast(text: string, tone: ToastTone = "info", ttlMs = DEFAULT_TTL_MS) {
  const id = nextId++;
  const expiresAt = Date.now() + ttlMs;
  queue = [...queue, { id, text, tone, expiresAt }];
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(() => prune(Date.now()), ttlMs + 16);
  }
}

export function dismissToast(id: number) {
  const before = queue.length;
  queue = queue.filter((t) => t.id !== id);
  if (queue.length !== before) emit();
}

function subscribe(fn: () => void) {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

function getSnapshot() {
  return queue;
}

function getServerSnapshot(): Toast[] {
  return [];
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
