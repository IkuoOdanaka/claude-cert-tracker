"use client";

import type { CourseStatus } from "@/types/domain";
import { formatCourseStatus } from "@/lib/format";

const STATUSES: CourseStatus[] = ["not-started", "in-progress", "completed"];

/**
 * コースの状態を切り替えるセグメント。
 *
 * 3つの排他的な状態なので、実体は radio にしてある(チェックボックスでは3値を
 * 表せないうえ、radio なら矢印キーでの移動と「3つ中2つ目」の読み上げが
 * ブラウザ標準で効く)。
 *
 * 選択中の塗りは中立色(ink)にしている。アクセント色にすると、コース数だけ
 * 塗りつぶしが並んで「押すべきものが一目でわかる」性質が薄れるため。
 */
export function CourseStatusControl({
  courseId,
  courseTitle,
  status,
  onChange,
  disabled,
}: {
  courseId: string;
  courseTitle: string;
  status: CourseStatus;
  onChange: (next: CourseStatus) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="shrink-0">
      <legend className="sr-only">{courseTitle} の状態</legend>
      <div className="inline-flex rounded-control border border-line-strong p-0.5">
        {STATUSES.map((value) => (
          <label key={value} className="cursor-pointer">
            <input
              type="radio"
              name={`course-status-${courseId}`}
              value={value}
              checked={status === value}
              onChange={() => onChange(value)}
              className="peer sr-only"
            />
            <span
              className="inline-flex min-h-8 items-center whitespace-nowrap rounded-[0.35rem] px-3 text-xs font-medium text-ink-muted transition-colors peer-checked:bg-ink peer-checked:text-canvas peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
            >
              {formatCourseStatus(value)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
