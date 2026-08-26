/**
 * 静的コンテンツ(`data/*.json`)を読み込む唯一の窓口。
 *
 * 画面側は `data/*.json` を直接 import せず、必ずこのモジュールを経由する
 * (ESLint の no-restricted-imports で強制している)。素の JSON をそのまま import すると
 * 型が広がり(`provider: string` など)、呼び出し側の至るところでキャストが必要になるため。
 *
 * JSON は静的 import なので、参照はビルド時に解決される。静的書き出し(`output: "export"`)の
 * 前提を崩さないよう、このモジュールには実行時の副作用を置かない。
 *
 * なお JSON → ドメイン型のキャストは検証を伴わない。データの正しさは
 * `tests/data-integrity.test.ts` が CI で担保している。
 */
import certificationsJson from "../../data/certifications.json";
import coursesJson from "../../data/courses.json";
import associateQuestionsJson from "../../data/questions/claude-certified-associate-foundations.json";
import type { Certification, Course, Question } from "@/types/domain";

const courses = coursesJson.courses as Course[];
const certifications = certificationsJson.certifications as Certification[];

const coursesById = new Map(courses.map((course) => [course.id, course]));
const certificationsById = new Map(
  certifications.map((certification) => [certification.id, certification]),
);

/**
 * 資格 ID → 問題バンク。
 *
 * 静的書き出しのため動的 import は使わず、ここに明示的に列挙する。
 * まだ問題を作っていない資格は登録しない(`getQuestionBank` が空配列を返す)。
 */
const questionBanksByCertificationId = new Map<string, Question[]>([
  [
    associateQuestionsJson.certificationId,
    associateQuestionsJson.questions as unknown as Question[],
  ],
]);

// ---------------------------------------------------------------------------
// 資格
// ---------------------------------------------------------------------------

/** 全資格を `data/certifications.json` の並び順で返す。 */
export function getCertifications(): readonly Certification[] {
  return certifications;
}

export function getCertification(id: string): Certification | undefined {
  return certificationsById.get(id);
}

// ---------------------------------------------------------------------------
// コース
// ---------------------------------------------------------------------------

export function getCourse(id: string): Course | undefined {
  return coursesById.get(id);
}

/**
 * 資格に紐づくコースを **推奨学習順** で返す。
 *
 * `courseIds` の順序がそのまま学習順を表すため、並べ替えない。
 * 解決できない ID は黙って除外する(データ側でコースが消えても画面が落ちないように)。
 * ID の妥当性そのものは `tests/data-integrity.test.ts` が保証する。
 */
export function getCoursesFor(certification: Certification | string): Course[] {
  const resolved =
    typeof certification === "string"
      ? certificationsById.get(certification)
      : certification;

  if (!resolved) return [];

  return resolved.courseIds
    .map((id) => coursesById.get(id))
    .filter((course): course is Course => course !== undefined);
}

/**
 * そのコースを含む資格を返す。
 *
 * ダッシュボードの学習履歴で「どの資格のコースか」を添えるのに使う。
 * 1つのコースが複数の資格に現れることもありうるので配列で返す
 * (現在のデータでは Architect – Foundations が一般公開コースを参照している)。
 */
export function getCertificationsForCourse(courseId: string): Certification[] {
  return certifications.filter((certification) =>
    certification.courseIds.includes(courseId),
  );
}

// ---------------------------------------------------------------------------
// 学習時間
// ---------------------------------------------------------------------------

export interface StudyTimeSummary {
  /** `estimatedMinutes` が判明しているコースの合計(分) */
  totalMinutes: number;
  /** 合計に含めたコース数 */
  measuredCourseCount: number;
  /** 公式に所要時間の掲載がなく、合計に含められなかったコース数 */
  unmeasuredCourseCount: number;
}

/**
 * コース群の学習時間を集計する。
 *
 * 公式に所要時間の掲載がないコース(`estimatedMinutes` が null)は合計から除外し、
 * その件数を返す。合計だけを見せると「これだけで終わる」と誤解されるため、
 * 画面側では未計測の件数も必ず添えて表示すること。
 */
export function summarizeStudyTime(courses: readonly Course[]): StudyTimeSummary {
  let totalMinutes = 0;
  let measuredCourseCount = 0;
  let unmeasuredCourseCount = 0;

  for (const course of courses) {
    if (course.estimatedMinutes === null) {
      unmeasuredCourseCount += 1;
      continue;
    }
    totalMinutes += course.estimatedMinutes;
    measuredCourseCount += 1;
  }

  return { totalMinutes, measuredCourseCount, unmeasuredCourseCount };
}

/** 資格1つぶんの学習時間を集計するショートハンド。 */
export function summarizeStudyTimeFor(
  certification: Certification | string,
): StudyTimeSummary {
  return summarizeStudyTime(getCoursesFor(certification));
}

// ---------------------------------------------------------------------------
// 模擬試験の問題
// ---------------------------------------------------------------------------

/**
 * 資格の問題バンクを返す。まだ問題を用意していない資格では空配列になる。
 *
 * 呼び出し側は「問題が0件の資格がある」前提で書くこと(Issue #15 で拡充するまで
 * Associate 以外は空)。
 */
export function getQuestionBank(certificationId: string): readonly Question[] {
  return questionBanksByCertificationId.get(certificationId) ?? [];
}

/** 出題ドメインごとの問題数。模擬試験の設定画面で「足りないドメイン」を示すのに使う。 */
export function countQuestionsByDomain(
  certificationId: string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  const certification = certificationsById.get(certificationId);

  // 問題が0件のドメインも 0 として現れるようにしておく
  for (const domain of certification?.examDomains ?? []) {
    counts[domain.id] = 0;
  }
  for (const question of getQuestionBank(certificationId)) {
    counts[question.domainId] = (counts[question.domainId] ?? 0) + 1;
  }

  return counts;
}

// ---------------------------------------------------------------------------
// メタ情報
// ---------------------------------------------------------------------------

export interface ContentMeta {
  /** 公式サイトとの突き合わせを最後に行った日 (YYYY-MM-DD) */
  lastVerifiedAt: string;
  /** 出典 */
  source: string;
}

/**
 * コンテンツの最終確認日など。
 * 「このサイトについて」画面での表示をハードコードにしないために使う。
 */
export function getContentMeta(): ContentMeta {
  const { lastVerifiedAt, source } = certificationsJson.meta;
  return { lastVerifiedAt, source };
}

/**
 * 公式サイトとの突き合わせから何日経ったか。
 *
 * このアプリの一番の信頼性リスクは「古い情報を載せ続けること」なので、
 * 一定期間を超えたら画面で注意を出せるようにしておく。
 */
export const STALE_AFTER_DAYS = 90;

export interface ContentFreshness {
  lastVerifiedAt: string;
  /** 確認日からの経過日数。未来日付や解釈できない値のときは 0 */
  daysSinceVerified: number;
  stale: boolean;
}

export function getContentFreshness(now: Date = new Date()): ContentFreshness {
  const { lastVerifiedAt } = getContentMeta();
  const verified = new Date(`${lastVerifiedAt}T00:00:00Z`);

  if (Number.isNaN(verified.getTime())) {
    return { lastVerifiedAt, daysSinceVerified: 0, stale: false };
  }

  const elapsedDays = Math.floor(
    (now.getTime() - verified.getTime()) / (24 * 60 * 60 * 1000),
  );
  const daysSinceVerified = Math.max(0, elapsedDays);

  return {
    lastVerifiedAt,
    daysSinceVerified,
    stale: daysSinceVerified > STALE_AFTER_DAYS,
  };
}

/** 掲載しているデータの規模。「このサイトについて」で出所と一緒に示す */
export function getContentStats(): { certificationCount: number; courseCount: number } {
  return { certificationCount: certifications.length, courseCount: courses.length };
}
