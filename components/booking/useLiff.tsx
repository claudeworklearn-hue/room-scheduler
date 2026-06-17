"use client";

import { useEffect, useState } from "react";

/**
 * LIFF loader (client-only).
 *
 * โหลด LIFF SDK จาก CDN แล้ว init ด้วย NEXT_PUBLIC_LIFF_ID.
 *
 * 🔴 line_user_id มาจาก `liff.getProfile()` เท่านั้น.
 *    ❌ ห้ามอ่านจาก URL param / query string — เคยทำให้ id ของลูกค้าหนึ่งคน
 *    หลุดไปติดทุกคน (ดู knowledge-academy-brain project_liff_userid_capture).
 *    ถ้า LIFF ไม่พร้อม/เปิดนอก LINE → lineUserId = null (ปลอดภัยกว่าได้ค่าผิด).
 *
 * ถ้าไม่ได้ตั้ง NEXT_PUBLIC_LIFF_ID (เช่น dev / ยังไม่สร้าง LIFF app) → status "no-liff"
 * และฟอร์มยังใช้งานได้ตามปกติ (ผปค กรอกเบอร์แทน).
 */

const SDK_URL = "https://static.line-scdn.net/liff/edge/2/sdk.js";

export type LiffStatus = "loading" | "ready" | "no-liff" | "error";

export interface LiffState {
  status: LiffStatus;
  /** line_user_id จาก getProfile() — null ถ้าไม่ได้เปิดใน LINE / ยังไม่ login. */
  lineUserId: string | null;
  displayName: string | null;
  /** true เมื่อเปิดอยู่ในแอป LINE จริง. */
  inClient: boolean;
}

declare global {
  interface Window {
    // LIFF SDK global — typed as unknown-ish; we only touch a few methods.
    liff?: {
      init: (cfg: { liffId: string }) => Promise<void>;
      isInClient?: () => boolean;
      isLoggedIn?: () => boolean;
      getProfile: () => Promise<{ userId?: string; displayName?: string }>;
    };
  }
}

export function useLiff(): LiffState {
  const [state, setState] = useState<LiffState>({
    status: "loading",
    lineUserId: null,
    displayName: null,
    inClient: false,
  });

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      setState({ status: "no-liff", lineUserId: null, displayName: null, inClient: false });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await loadScript(SDK_URL);
        const liff = window.liff;
        if (!liff) throw new Error("liff sdk missing");
        await liff.init({ liffId });
        if (cancelled) return;
        const inClient = typeof liff.isInClient === "function" ? liff.isInClient() : false;
        if (typeof liff.isLoggedIn === "function" && liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          if (cancelled) return;
          setState({
            status: "ready",
            lineUserId: profile?.userId ?? null,
            displayName: profile?.displayName ?? null,
            inClient,
          });
        } else {
          // ยังไม่ login / เปิดนอก LINE → ไม่ดึง id (ไม่ fallback ไป URL)
          setState({ status: "ready", lineUserId: null, displayName: null, inClient });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "error", lineUserId: null, displayName: null, inClient: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("no document"));
      return;
    }
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("liff sdk load failed"));
    document.head.appendChild(s);
  });
}
