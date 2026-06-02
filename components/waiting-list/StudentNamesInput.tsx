"use client";

import { useEffect, useState } from "react";

type Props = {
  name: string; // ชื่อ field ที่จะส่งเป็น hidden JSON เข้า FormData
  defaultNames?: string[];
  placeholder?: string;
};

/**
 * Input สำหรับใส่ชื่อนักเรียนหลายคนแบบ chip/tag
 * - พิมพ์ชื่อ → Enter หรือกด + → เพิ่มเป็น chip
 * - กด × บน chip → ลบ
 * - ส่งเป็น hidden input JSON string สำหรับ FormData
 */
export function StudentNamesInput({
  name,
  defaultNames = [],
  placeholder = "พิมพ์ชื่อแล้วกด Enter",
}: Props) {
  const [names, setNames] = useState<string[]>(defaultNames);
  const [draft, setDraft] = useState("");

  // sync ถ้า defaultNames เปลี่ยน (กรณี drawer เปิดดู deal อื่น)
  useEffect(() => {
    setNames(defaultNames);
  }, [defaultNames]);

  function addName(raw: string) {
    const v = raw.trim();
    if (!v) return;
    if (names.includes(v)) {
      setDraft("");
      return;
    }
    setNames((cur) => [...cur, v]);
    setDraft("");
  }

  function removeName(i: number) {
    setNames((cur) => cur.filter((_, idx) => idx !== i));
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addName(draft);
    } else if (e.key === "Backspace" && !draft && names.length > 0) {
      // backspace ตอนช่อง input ว่าง → ลบ chip สุดท้าย
      removeName(names.length - 1);
    } else if (e.key === ",") {
      e.preventDefault();
      addName(draft);
    }
  }

  return (
    <div>
      {/* hidden input ส่งเป็น JSON ให้ FormData */}
      <input type="hidden" name={name} value={JSON.stringify(names)} />

      <div
        className="flex min-h-[40px] flex-wrap gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200"
        onClick={(e) => {
          // คลิกขอบ → focus ที่ช่อง input
          const input = (e.currentTarget as HTMLElement).querySelector("input[type=text]") as
            | HTMLInputElement
            | null;
          input?.focus();
        }}
      >
        {names.map((n, i) => (
          <span
            key={`${n}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700"
          >
            {n}
            <button
              type="button"
              onClick={() => removeName(i)}
              className="rounded text-brand-600 hover:bg-brand-200 hover:text-brand-800"
              aria-label={`ลบ ${n}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => addName(draft)}
          placeholder={names.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] border-0 bg-transparent p-0.5 text-sm focus:outline-none focus:ring-0"
        />
      </div>
      <p className="mt-1 text-[11px] text-gray-400">
        กด <kbd className="rounded bg-gray-100 px-1">Enter</kbd> หรือ{" "}
        <kbd className="rounded bg-gray-100 px-1">,</kbd> เพื่อเพิ่มชื่อ ·{" "}
        <kbd className="rounded bg-gray-100 px-1">Backspace</kbd> ที่ช่องว่างเพื่อลบชื่อล่าสุด
      </p>
    </div>
  );
}
