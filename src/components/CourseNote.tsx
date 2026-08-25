"use client";

import { useState } from "react";

/**
 * コースごとのメモ。
 *
 * 折りたたみにしているのは、コース数ぶんテキストエリアが並ぶと一覧性が落ちるため。
 * 書いてあるかどうかは summary に出すので、開かなくてもわかる。
 *
 * 保存は blur のタイミング。1打鍵ごとに localStorage へ書くのは無駄が大きい。
 */
export function CourseNote({
  note,
  courseTitle,
  onSave,
  disabled,
}: {
  note: string;
  courseTitle: string;
  onSave: (next: string) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(note);

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs text-ink-muted hover:text-ink">
        <span aria-hidden className="transition-transform group-open:rotate-90">
          ▸
        </span>
        メモ
        {note ? <span className="text-accent">（記入あり）</span> : null}
      </summary>

      <textarea
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== note) onSave(draft);
        }}
        aria-label={`${courseTitle} のメモ`}
        rows={3}
        placeholder="つまずいたところ、あとで見返したいことなど"
        className="mt-2 w-full rounded-control border border-line-strong bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-muted"
      />
    </details>
  );
}
