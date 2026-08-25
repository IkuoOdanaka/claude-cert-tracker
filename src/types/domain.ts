/**
 * アプリ全体で共有するドメイン型。
 *
 * - `data/*.json` (静的コンテンツ) と localStorage (ユーザーの進捗) を明確に分ける。
 * - 静的コンテンツはビルド時にのみ読み込む。ユーザー進捗はブラウザにしか存在しない。
 */

// ---------------------------------------------------------------------------
// 静的コンテンツ: data/courses.json, data/certifications.json
// ---------------------------------------------------------------------------

export type CourseProvider = "partner-academy" | "anthropic-academy";
export type CourseFormat = "video" | "hands-on" | "reading";

export interface Course {
  id: string;
  title: string;
  provider: CourseProvider;
  format: CourseFormat;
  /** 公式に掲載がないものは null */
  estimatedMinutes: number | null;
  url: string;
  summary: string;
  tags: string[];
}

export type CertificationRole = "associate" | "developer" | "architect";
export type CertificationLevel = "foundations" | "professional";

export interface ExamDomain {
  id: string;
  name: string;
  /** 公式の配点が判明したら設定する。未確定の間は undefined = 均等扱い */
  weight?: number;
}

export interface Certification {
  id: string;
  name: string;
  shortName: string;
  role: CertificationRole;
  level: CertificationLevel;
  priceUsd: number;
  targetAudience: string;
  summary: string;
  officialUrl: string;
  prepPathUrl: string;
  notes: string[];
  /** 推奨学習順。data/courses.json の Course.id を参照する */
  courseIds: string[];
  /** examDomains の出所。公式の出題範囲表が公開されたら "official" に変える */
  domainsSource: "official" | "derived-from-prep-courses";
  examDomains: ExamDomain[];
}

// ---------------------------------------------------------------------------
// 静的コンテンツ: data/questions/<certificationId>.json
// ---------------------------------------------------------------------------

export type QuestionType = "single" | "multiple";

export interface QuestionChoice {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  certificationId: string;
  /** Certification.examDomains[].id を参照する */
  domainId: string;
  type: QuestionType;
  /** 1 = やさしい, 2 = 標準, 3 = 難しい */
  difficulty: 1 | 2 | 3;
  stem: string;
  choices: QuestionChoice[];
  /** type が "single" のときは要素数 1 */
  correctChoiceIds: string[];
  explanation: string;
  /** 根拠にした公開情報の URL。公式試験問題の転載は禁止 */
  sourceRefs: string[];
}

// ---------------------------------------------------------------------------
// ユーザー進捗: localStorage のみに保存する
// ---------------------------------------------------------------------------

export type CourseStatus = "not-started" | "in-progress" | "completed";

export interface CourseProgress {
  status: CourseStatus;
  /** ISO8601。status が "completed" のときのみ設定 */
  completedAt: string | null;
  note: string;
}

export interface ExamAnswer {
  questionId: string;
  selectedChoiceIds: string[];
  correct: boolean;
}

export interface ExamAttempt {
  id: string;
  certificationId: string;
  startedAt: string;
  finishedAt: string | null;
  /** 0-100 */
  scorePercent: number;
  answers: ExamAnswer[];
}

/** localStorage キー: `cct:progress`。version はマイグレーション用 */
export interface ProgressState {
  version: 1;
  selectedCertificationIds: string[];
  courses: Record<string, CourseProgress>;
  examAttempts: ExamAttempt[];
  updatedAt: string;
}
