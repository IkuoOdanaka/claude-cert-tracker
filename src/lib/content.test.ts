import { describe, expect, it } from "vitest";
import {
  countQuestionsByDomain,
  getCertification,
  getCertifications,
  getCertificationsForCourse,
  getContentFreshness,
  getContentMeta,
  getContentStats,
  getCourse,
  getCoursesFor,
  getQuestionBank,
  STALE_AFTER_DAYS,
  summarizeStudyTime,
  summarizeStudyTimeFor,
} from "./content";
import type { Certification, Course } from "@/types/domain";

const ASSOCIATE = "claude-certified-associate-foundations";
const DEVELOPER = "claude-certified-developer-foundations";

/** 未知の ID を混ぜた検証用の資格。data/*.json には手を入れずに異常系を試すため。 */
function certificationWithCourseIds(courseIds: string[]): Certification {
  return {
    ...getCertification(DEVELOPER)!,
    id: "test-only",
    courseIds,
  };
}

describe("getCertifications / getCertification", () => {
  it("data/certifications.json の並び順で全資格を返す", () => {
    const ids = getCertifications().map((c) => c.id);
    expect(ids).toEqual([
      ASSOCIATE,
      DEVELOPER,
      "claude-certified-architect-foundations",
      "claude-certified-architect-professional",
    ]);
  });

  it("ID で1件引ける", () => {
    expect(getCertification(DEVELOPER)?.shortName).toBe("Developer – Foundations");
  });

  it("知らない ID には undefined を返す", () => {
    expect(getCertification("no-such-certification")).toBeUndefined();
  });
});

describe("getCourse", () => {
  it("ID で1件引ける", () => {
    expect(getCourse("dev-mso-foundations")?.title).toBe("MSO Foundations");
  });

  it("知らない ID には undefined を返す", () => {
    expect(getCourse("no-such-course")).toBeUndefined();
  });
});

describe("getCoursesFor", () => {
  it("courseIds の順序(= 推奨学習順)をそのまま保つ", () => {
    const certification = getCertification(DEVELOPER)!;
    const titles = getCoursesFor(certification).map((c) => c.title);

    expect(titles).toEqual([
      "MSO Foundations",
      "Production-Grade Prompting, Agents & Tool Use",
      "Claude Code, MCP & Integration",
      "Production Engineering, Evals & Security",
      "Accelerators & IP Contribution",
    ]);
  });

  it("資格 ID の文字列でも引ける", () => {
    expect(getCoursesFor(DEVELOPER)).toEqual(
      getCoursesFor(getCertification(DEVELOPER)!),
    );
  });

  it("解決できない courseId は落とし、残りの順序は保つ", () => {
    const certification = certificationWithCourseIds([
      "dev-mso-foundations",
      "removed-from-data",
      "dev-claude-code-mcp-and-integration",
    ]);

    expect(getCoursesFor(certification).map((c) => c.id)).toEqual([
      "dev-mso-foundations",
      "dev-claude-code-mcp-and-integration",
    ]);
  });

  it("知らない資格 ID には空配列を返す", () => {
    expect(getCoursesFor("no-such-certification")).toEqual([]);
  });
});

describe("summarizeStudyTime", () => {
  const course = (id: string, estimatedMinutes: number | null): Course => ({
    id,
    title: id,
    provider: "partner-academy",
    format: "video",
    estimatedMinutes,
    url: "https://example.com/",
    tags: [],
  });

  it("所要時間が判明しているコースだけを合計する", () => {
    const summary = summarizeStudyTime([
      course("a", 60),
      course("b", null),
      course("c", 30),
    ]);

    expect(summary).toEqual({
      totalMinutes: 90,
      measuredCourseCount: 2,
      unmeasuredCourseCount: 1,
    });
  });

  it("空配列でも壊れない", () => {
    expect(summarizeStudyTime([])).toEqual({
      totalMinutes: 0,
      measuredCourseCount: 0,
      unmeasuredCourseCount: 0,
    });
  });

  it("Developer は公式掲載の合計 774 分になる", () => {
    const summary = summarizeStudyTimeFor(DEVELOPER);

    expect(summary.totalMinutes).toBe(774);
    expect(summary.unmeasuredCourseCount).toBe(0);
  });

  it("Architect – Foundations は全コースが所要時間未掲載として扱われる", () => {
    const summary = summarizeStudyTimeFor("claude-certified-architect-foundations");

    expect(summary.totalMinutes).toBe(0);
    expect(summary.measuredCourseCount).toBe(0);
    expect(summary.unmeasuredCourseCount).toBe(7);
  });
});

describe("getQuestionBank", () => {
  it("問題を用意した資格では問題を返す", () => {
    const questions = getQuestionBank(ASSOCIATE);

    expect(questions.length).toBeGreaterThan(0);
    expect(questions.every((q) => q.certificationId === ASSOCIATE)).toBe(true);
  });

  it("まだ問題を用意していない資格では空配列を返す", () => {
    expect(getQuestionBank(DEVELOPER)).toEqual([]);
  });

  it("知らない資格 ID でも空配列を返す", () => {
    expect(getQuestionBank("no-such-certification")).toEqual([]);
  });
});

describe("countQuestionsByDomain", () => {
  it("問題が0件のドメインも 0 として現れる", () => {
    const counts = countQuestionsByDomain(ASSOCIATE);
    const domainIds = getCertification(ASSOCIATE)!.examDomains.map((d) => d.id);

    expect(Object.keys(counts).sort()).toEqual([...domainIds].sort());
    expect(counts["troubleshooting"]).toBe(0);
    expect(counts["evaluation"]).toBe(1);
  });

  it("合計が問題バンクの件数と一致する", () => {
    const counts = countQuestionsByDomain(ASSOCIATE);
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

    expect(total).toBe(getQuestionBank(ASSOCIATE).length);
  });

  it("知らない資格 ID では空オブジェクトを返す", () => {
    expect(countQuestionsByDomain("no-such-certification")).toEqual({});
  });
});

describe("getContentMeta", () => {
  it("最終確認日を YYYY-MM-DD で返す", () => {
    expect(getContentMeta().lastVerifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("getCertificationsForCourse", () => {
  it("そのコースを含む資格を返す", () => {
    const ids = getCertificationsForCourse("dev-mso-foundations").map((c) => c.id);
    expect(ids).toEqual([DEVELOPER]);
  });

  it("どの資格にも属さないコース ID には空配列を返す", () => {
    expect(getCertificationsForCourse("no-such-course")).toEqual([]);
  });

  it("すべてのコースが少なくとも1つの資格に属している", () => {
    for (const certification of getCertifications()) {
      for (const courseId of certification.courseIds) {
        expect(getCertificationsForCourse(courseId).length, courseId).toBeGreaterThan(0);
      }
    }
  });
});

describe("getContentFreshness", () => {
  const verified = getContentMeta().lastVerifiedAt;
  const at = (offsetDays: number) =>
    new Date(new Date(`${verified}T00:00:00Z`).getTime() + offsetDays * 86_400_000);

  it("確認日当日は経過0日で、古くない", () => {
    expect(getContentFreshness(at(0))).toMatchObject({
      daysSinceVerified: 0,
      stale: false,
    });
  });

  it("しきい値ちょうどではまだ古いとしない", () => {
    expect(getContentFreshness(at(STALE_AFTER_DAYS)).stale).toBe(false);
  });

  it("しきい値を超えたら古いとする", () => {
    expect(getContentFreshness(at(STALE_AFTER_DAYS + 1))).toMatchObject({
      daysSinceVerified: STALE_AFTER_DAYS + 1,
      stale: true,
    });
  });

  it("確認日より前の時刻でも負の日数にしない", () => {
    expect(getContentFreshness(at(-10)).daysSinceVerified).toBe(0);
  });
});

describe("getContentStats", () => {
  it("掲載している資格数とコース数を返す", () => {
    expect(getContentStats()).toEqual({ certificationCount: 4, courseCount: 25 });
  });
});
