import { describe, expect, it } from "vitest";
import { buildExam } from "./select";
import type { ExamDomain, Question } from "@/types/domain";

function question(
  id: string,
  domainId: string,
  courseIds: string[],
  choiceCount = 4,
): Question {
  return {
    id,
    certificationId: "cert",
    domainId,
    courseIds,
    type: "single",
    difficulty: 2,
    stem: `${id} の設問`,
    choices: Array.from({ length: choiceCount }, (_, index) => ({
      id: `c${index}`,
      text: `選択肢${index}`,
    })),
    correctChoiceIds: ["c0"],
    explanation: "解説",
    sourceRefs: ["https://example.com/"],
  };
}

/** ドメイン3つ × 各4問、コースはドメインと1対1 */
function bank(): Question[] {
  return ["a", "b", "c"].flatMap((domain) =>
    [1, 2, 3, 4].map((n) => question(`${domain}${n}`, domain, [`course-${domain}`])),
  );
}

const DOMAINS: ExamDomain[] = [
  { id: "a", name: "ドメインA" },
  { id: "b", name: "ドメインB" },
  { id: "c", name: "ドメインC" },
];

describe("シードによる再現性", () => {
  it("同じシードなら同じ問題・同じ並びになる", () => {
    const first = buildExam(bank(), { count: 6, seed: "seed-1" });
    const second = buildExam(bank(), { count: 6, seed: "seed-1" });

    expect(second.map((item) => item.question.id)).toEqual(
      first.map((item) => item.question.id),
    );
  });

  it("同じシードなら選択肢の並びも同じになる", () => {
    const first = buildExam(bank(), { count: 6, seed: "seed-1" });
    const second = buildExam(bank(), { count: 6, seed: "seed-1" });

    expect(second.map((item) => item.choices.map((choice) => choice.id))).toEqual(
      first.map((item) => item.choices.map((choice) => choice.id)),
    );
  });

  it("シードが違えば並びが変わる", () => {
    const seeds = ["s1", "s2", "s3", "s4"];
    const orders = seeds.map((seed) =>
      buildExam(bank(), { count: 8, seed }).map((item) => item.question.id).join(","),
    );

    expect(new Set(orders).size).toBeGreaterThan(1);
  });

  it("選択肢の並びは、何問目に出たかに左右されない", () => {
    // 「間違えた問題だけ再挑戦」で並びが変わると覚え直しになるため、
    // 問題ごとに独立したシードで決めている
    const full = buildExam(bank(), { count: 12, seed: "seed-1" });
    const partial = buildExam(bank(), {
      count: 3,
      seed: "seed-1",
      courseIds: ["course-b"],
    });

    for (const item of partial) {
      const same = full.find((other) => other.question.id === item.question.id)!;
      expect(item.choices.map((c) => c.id), item.question.id).toEqual(
        same.choices.map((c) => c.id),
      );
    }
  });

  it("選択肢は元の並びのままではない(位置を覚えさせない)", () => {
    const original = ["c0", "c1", "c2", "c3"];
    const orders = ["s1", "s2", "s3", "s4", "s5"].map((seed) =>
      buildExam([question("q1", "a", ["course-a"])], { count: 1, seed })[0].choices
        .map((choice) => choice.id)
        .join(","),
    );

    expect(orders.some((order) => order !== original.join(","))).toBe(true);
  });
});

describe("コース絞り込み(理解度チェック)", () => {
  it("そのコースの問題だけが出る", () => {
    const exam = buildExam(bank(), {
      count: 10,
      seed: "s",
      courseIds: ["course-b"],
    });

    expect(exam).toHaveLength(4);
    expect(
      exam.every((item) => item.question.courseIds.includes("course-b")),
    ).toBe(true);
  });

  it("複数コースを指定するとその和集合になる", () => {
    const exam = buildExam(bank(), {
      count: 20,
      seed: "s",
      courseIds: ["course-a", "course-c"],
    });

    expect(exam).toHaveLength(8);
    expect(exam.every((item) => item.question.domainId !== "b")).toBe(true);
  });

  it("1問が複数コースに紐づいていれば、どちらからも引ける", () => {
    const shared = question("shared", "a", ["course-a", "course-b"]);

    for (const courseId of ["course-a", "course-b"]) {
      const exam = buildExam([shared], { count: 1, seed: "s", courseIds: [courseId] });
      expect(exam.map((item) => item.question.id), courseId).toEqual(["shared"]);
    }
  });

  it("空配列は「絞り込まない」と同じ", () => {
    expect(buildExam(bank(), { count: 12, seed: "s", courseIds: [] })).toHaveLength(12);
  });

  it("問題が無いコースでは空になる", () => {
    expect(
      buildExam(bank(), { count: 5, seed: "s", courseIds: ["course-none"] }),
    ).toEqual([]);
  });
});

describe("ドメイン絞り込みと配分(模擬試験)", () => {
  const countByDomain = (exam: ReturnType<typeof buildExam>) =>
    exam.reduce<Record<string, number>>((acc, item) => {
      acc[item.question.domainId] = (acc[item.question.domainId] ?? 0) + 1;
      return acc;
    }, {});

  it("指定したドメインの問題だけが出る", () => {
    const exam = buildExam(bank(), { count: 10, seed: "s", domainIds: ["a", "c"] });

    expect(exam.every((item) => item.question.domainId !== "b")).toBe(true);
  });

  it("weight が無ければドメインへ均等に配分する", () => {
    const exam = buildExam(bank(), { count: 9, seed: "s", domains: DOMAINS });

    expect(countByDomain(exam)).toEqual({ a: 3, b: 3, c: 3 });
  });

  it("weight があればその比率で配分する", () => {
    const exam = buildExam(bank(), {
      count: 8,
      seed: "s",
      domains: [
        { id: "a", name: "ドメインA", weight: 2 },
        { id: "b", name: "ドメインB", weight: 1 },
        { id: "c", name: "ドメインC", weight: 1 },
      ],
    });

    expect(countByDomain(exam)).toEqual({ a: 4, b: 2, c: 2 });
  });

  it("割り切れないときも合計は要求数に一致する", () => {
    for (const count of [4, 5, 7, 10, 11]) {
      const exam = buildExam(bank(), { count, seed: "s", domains: DOMAINS });
      expect(exam.length, `count=${count}`).toBe(count);
    }
  });

  it("取り分に足りないドメインがあっても、総数を減らさない", () => {
    // a は1問しかない。均等配分なら a に4問だが、足りないぶんは b/c から埋める
    const uneven = [
      question("a1", "a", ["course-a"]),
      ...[1, 2, 3, 4, 5].map((n) => question(`b${n}`, "b", ["course-b"])),
      ...[1, 2, 3, 4, 5].map((n) => question(`c${n}`, "c", ["course-c"])),
    ];

    const exam = buildExam(uneven, { count: 9, seed: "s", domains: DOMAINS });

    expect(exam).toHaveLength(9);
    expect(countByDomain(exam).a).toBe(1);
  });

  it("同じドメインが固まらないよう、最後に混ぜている", () => {
    const orders = ["s1", "s2", "s3", "s4", "s5"].map((seed) =>
      buildExam(bank(), { count: 9, seed, domains: DOMAINS })
        .map((item) => item.question.domainId)
        .join(""),
    );

    // 配分したままの並び(aaabbbccc)ばかりにはならない
    expect(orders.some((order) => order !== "aaabbbccc")).toBe(true);
  });
});

describe("端の条件", () => {
  it("要求数が問題数を超えたら、あるだけ返す", () => {
    expect(buildExam(bank(), { count: 100, seed: "s" })).toHaveLength(12);
  });

  it("ドメイン配分でも、あるだけ返す", () => {
    expect(
      buildExam(bank(), { count: 100, seed: "s", domains: DOMAINS }),
    ).toHaveLength(12);
  });

  it("count が 0 以下なら空", () => {
    expect(buildExam(bank(), { count: 0, seed: "s" })).toEqual([]);
    expect(buildExam(bank(), { count: -1, seed: "s" })).toEqual([]);
  });

  it("問題バンクが空なら空", () => {
    expect(buildExam([], { count: 5, seed: "s" })).toEqual([]);
  });

  it("絞り込みの結果が空でも壊れない", () => {
    expect(
      buildExam(bank(), { count: 5, seed: "s", domainIds: ["no-such-domain"] }),
    ).toEqual([]);
  });

  it("引数の問題バンクを変更しない", () => {
    const original = bank();
    const snapshot = original.map((q) => q.id).join(",");

    buildExam(original, { count: 9, seed: "s", domains: DOMAINS });

    expect(original.map((q) => q.id).join(",")).toBe(snapshot);
  });
});
