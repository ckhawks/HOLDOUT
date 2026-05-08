"use client";

export const SFX_FILES = [
  { id: "click_minimal", file: "370962__cabled_mess__click-01_minimal-ui-sounds.wav", label: "Click — minimal" },
  { id: "hover_g", file: "422836__gamedevc__g_ui_button_hover_1.wav", label: "Hover — G" },
  { id: "click_gasp", file: "541987__rob_marion__gasp_ui_clicks_5.wav", label: "Click — gasp" },
  { id: "hover_menu", file: "739251__avaol__menu-ui-hover.wav", label: "Hover — menu" },
  { id: "decline", file: "770202__yuugfr1a__modern-ui-decline.wav", label: "Modern — decline" },
  { id: "hover_modern", file: "770203__yuugfr1a__modern-ui-hover.wav", label: "Modern — hover" },
  { id: "press", file: "788611__el_boss__ui-button-press.wav", label: "Button press" },
] as const;

export type SfxId = (typeof SFX_FILES)[number]["id"];

export type SfxKind = "tick" | "inventory" | "error" | "click";

const KIND_MAP: Record<SfxKind, SfxId | null> = {
  tick: "click_minimal",
  inventory: "hover_g",
  error: "decline",
  click: null, // falls back to active picker selection
};

const STORAGE_KEY = "holdout:sfx:active";
const POOL_SIZE = 6;

let activeId: SfxId | null = null;
let volume = 0.5;
const pool: HTMLAudioElement[] = [];
let poolCursor = 0;

function srcFor(id: SfxId): string | null {
  const entry = SFX_FILES.find((f) => f.id === id);
  return entry ? `/sfx/${entry.file}` : null;
}

export function initSfx() {
  if (typeof window === "undefined") return;
  if (pool.length === 0) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const a = new Audio();
      a.preload = "auto";
      pool.push(a);
    }
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "__off__") {
    activeId = null;
  } else if (stored && SFX_FILES.some((f) => f.id === stored)) {
    activeId = stored as SfxId;
  } else {
    activeId = "press";
  }
}

export function setActiveSfx(id: SfxId | null) {
  activeId = id;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, id ?? "__off__");
  }
}

export function getActiveSfx(): SfxId | null {
  return activeId;
}

export function setSfxVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
}

export function playSfx(kind: SfxKind = "click") {
  if (typeof window === "undefined") return;
  const id = KIND_MAP[kind] ?? activeId;
  if (!id) return;
  const src = srcFor(id);
  if (!src) return;
  const a = pool[poolCursor];
  poolCursor = (poolCursor + 1) % pool.length;
  if (!a) return;
  a.src = src;
  a.currentTime = 0;
  a.volume = volume;
  a.play().catch(() => {
    // browsers reject autoplay until first user gesture; ignore
  });
}
