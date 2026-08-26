/**
 * data/*.json の整合性テスト。
 *
 * このアプリのコンテンツは手書きの JSON なので、壊れた参照や
 * 「正解が選択肢に存在しない問題」を CI で止められるようにしておく。
 */
import { describe, expect, it } from "vitest";
import certificationsJson from "../data/certifications.json";
import coursesJson from "../data/courses.json";
import associateQuestions from "../data/questions/claude-certified-associate-foundations.json";
import type { Certification, Course, Question } from "@/types/domain";

const courses = coursesJson.courses as Course[];
const certifications = certificationsJson.certifications as Certification[];
const questionBanks: { certificationId: string; questions: Question[] }[] = [
  associateQuestions as unknown as { certificationId: string; questions: Question[] },
];

const courseIds = new Set(courses.map((c) => c.id));

describe("courses.json", () => {
  it("id が一意である", () => {
    expect(courseIds.size).toBe(courses.length);
  });

  it("全コースに参照可能な URL がある", () => {
    for (const course of courses) {
      expect(course.url, course.id).toMatch(/^https:\/\//);
    }
  });
});

describe("certifications.json", () => {
  it("id が一意である", () => {
    const ids = new Set(certifications.map((c) => c.id));
    expect(ids.size).toBe(certifications.length);
  });

  it("courseIds がすべて courses.json に存在する", () => {
    for (const cert of certifications) {
      for (const id of cert.courseIds) {
        expect(courseIds.has(id), `${cert.id} -> ${id}`).toBe(true);
      }
    }
  });

  it("どの資格からも参照されない孤児コースがない", () => {
    const used = new Set(certifications.flatMap((c) => c.courseIds));
    const orphans = courses.filter((c) => !used.has(c.id)).map((c) => c.id);
    expect(orphans).toEqual([]);
  });

  it("examDomains の id が資格内で一意である", () => {
    for (const cert of certifications) {
      const ids = new Set(cert.examDomains.map((d) => d.id));
      expect(ids.size, cert.id).toBe(cert.examDomains.length);
    }
  });
});

/**
 * 掲載してよいのは事実情報だけ、という方針をデータ側で縛る。
 *
 * 以前 courses/certifications に公式の説明文を和訳した summary を持たせていたが、
 * 翻訳は二次的著作物にあたるため削除した。同じものが戻ってこないよう、
 * 「自由記述の長文フィールドが増えていないこと」をここで検出する。
 * コース内容の説明は url 先の公式ページに委ねる。
 */
describe("掲載範囲(事実情報のみ)", () => {
  const ALLOWED_COURSE_KEYS = [
    "id",
    "title",
    "provider",
    "format",
    "estimatedMinutes",
    "url",
    "tags",
  ];

  it("コースに想定外のフィールドが増えていない", () => {
    for (const course of courses) {
      expect(Object.keys(course).sort(), course.id).toEqual(
        [...ALLOWED_COURSE_KEYS].sort(),
      );
    }
  });

  it("資格に説明文フィールドを持たせていない", () => {
    for (const certification of certifications) {
      expect(certification, certification.id).not.toHaveProperty("summary");
      expect(certification, certification.id).not.toHaveProperty("description");
    }
  });

  it("対象者は職種の短いラベルであって、引き写した文章ではない", () => {
    for (const certification of certifications) {
      expect(
        certification.targetAudience.length,
        `${certification.id}: 長い説明文は載せない`,
      ).toBeLessThanOrEqual(40);
      expect(certification.targetAudience, certification.id).not.toMatch(/。/);
    }
  });
});

describe("data/questions/*.json", () => {
  it("問題が正しい資格・ドメインに紐づいている", () => {
    for (const bank of questionBanks) {
      const cert = certifications.find((c) => c.id === bank.certificationId);
      expect(cert, bank.certificationId).toBeDefined();
      const domainIds = new Set(cert!.examDomains.map((d) => d.id));

      for (const q of bank.questions) {
        expect(q.certificationId, q.id).toBe(bank.certificationId);
        expect(domainIds.has(q.domainId), `${q.id} -> ${q.domainId}`).toBe(true);
      }
    }
  });

  it("正解が選択肢の中に存在し、設問タイプと個数が一致する", () => {
    for (const bank of questionBanks) {
      for (const q of bank.questions) {
        const choiceIds = new Set(q.choices.map((c) => c.id));
        for (const correct of q.correctChoiceIds) {
          expect(choiceIds.has(correct), `${q.id} -> ${correct}`).toBe(true);
        }
        if (q.type === "single") {
          expect(q.correctChoiceIds.length, q.id).toBe(1);
        } else {
          expect(q.correctChoiceIds.length, q.id).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it("問題 id が一意で、解説と出典がある", () => {
    const seen = new Set<string>();
    for (const bank of questionBanks) {
      for (const q of bank.questions) {
        expect(seen.has(q.id), `duplicate: ${q.id}`).toBe(false);
        seen.add(q.id);
        expect(q.explanation.length, q.id).toBeGreaterThan(0);
        expect(q.sourceRefs.length, q.id).toBeGreaterThan(0);
      }
    }
  });
});
