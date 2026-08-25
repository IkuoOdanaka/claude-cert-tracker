// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProgressStore } from "./store";
import { setCourseStatus } from "./state";
import { STORAGE_KEY } from "./storage";

beforeEach(() => {
  localStorage.clear();
});

const storedProgress = {
  version: 1,
  selectedCertificationIds: [],
  courses: {
    "dev-mso-foundations": {
      status: "completed",
      completedAt: "2026-08-25T10:00:00.000Z",
      note: "",
    },
  },
  examAttempts: [],
  updatedAt: "2026-08-25T10:00:00.000Z",
};

describe("getSnapshot の参照安定性", () => {
  it("変化していなければ同じ参照を返す", () => {
    const store = createProgressStore();

    // useSyncExternalStore は毎回新しいオブジェクトが返ると
    // 無限レンダリングになる。ここが崩れると画面全体が固まる
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("購読して読み込んだあとも参照は安定している", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedProgress));
    const store = createProgressStore();
    store.subscribe(() => {});

    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("更新したときだけ参照が変わる", () => {
    const store = createProgressStore();
    store.subscribe(() => {});
    const before = store.getSnapshot();

    store.update((current) => setCourseStatus(current, "course-a", "completed"));

    expect(store.getSnapshot()).not.toBe(before);
  });
});

describe("getServerSnapshot", () => {
  it("読み込み後も常に loading を返す(ビルド時の HTML と一致させるため)", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedProgress));
    const store = createProgressStore();
    store.subscribe(() => {});

    expect(store.getSnapshot().status).toBe("ready");
    expect(store.getServerSnapshot().status).toBe("loading");
  });

  it("常に同じ参照を返す", () => {
    const store = createProgressStore();
    expect(store.getServerSnapshot()).toBe(store.getServerSnapshot());
  });
});

describe("subscribe", () => {
  it("購読時に読み込み、リスナーへ通知する", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedProgress));
    const store = createProgressStore();
    const listener = vi.fn();

    store.subscribe(listener);

    expect(store.getSnapshot().status).toBe("ready");
    expect(store.getSnapshot().progress.courses["dev-mso-foundations"].status).toBe(
      "completed",
    );
    expect(listener).toHaveBeenCalled();
  });

  it("2回購読しても読み込みは1度きり", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const store = createProgressStore();

    store.subscribe(() => {});
    const afterFirst = getItem.mock.calls.length;
    store.subscribe(() => {});

    expect(getItem.mock.calls.length).toBe(afterFirst);
  });

  it("購読を解除すると storage リスナーも外れる", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const store = createProgressStore();

    const unsubscribe = store.subscribe(() => {});
    unsubscribe();

    expect(remove).toHaveBeenCalledWith("storage", expect.any(Function));
  });
});

describe("update", () => {
  it("localStorage に保存し、リスナーへ通知する", () => {
    const store = createProgressStore();
    const listener = vi.fn();
    store.subscribe(listener);
    listener.mockClear();

    store.update((current) => setCourseStatus(current, "course-a", "completed"));

    expect(listener).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.courses["course-a"].status).toBe("completed");
  });

  it("保存に失敗したら persistenceFailed を立てる", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const store = createProgressStore();
    store.subscribe(() => {});

    store.update((current) => setCourseStatus(current, "course-a", "completed"));

    expect(store.getSnapshot().persistenceFailed).toBe(true);
    // 保存できなくても画面上の状態は進む(操作が無反応にならないように)
    expect(store.getSnapshot().progress.courses["course-a"].status).toBe("completed");
  });
});

describe("別タブでの変更", () => {
  it("storage イベントを受けて進捗を取り込む", () => {
    const store = createProgressStore();
    store.subscribe(() => {});
    expect(store.getSnapshot().progress.courses).toEqual({});

    // 別タブが書き込んだ状況を作る
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedProgress));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));

    expect(store.getSnapshot().progress.courses["dev-mso-foundations"].status).toBe(
      "completed",
    );
  });

  it("関係のないキーの変更は無視する", () => {
    const store = createProgressStore();
    store.subscribe(() => {});
    const before = store.getSnapshot();

    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated-key" }));

    expect(store.getSnapshot()).toBe(before);
  });
});

describe("dismissIssue", () => {
  it("読み込み時の問題を消す", () => {
    localStorage.setItem(STORAGE_KEY, "{ 壊れている");
    const store = createProgressStore();
    store.subscribe(() => {});
    expect(store.getSnapshot().issue?.kind).toBe("unreadable");

    store.dismissIssue();

    expect(store.getSnapshot().issue).toBeNull();
  });

  it("問題が無いときは参照を変えない(無駄な再レンダリングを避ける)", () => {
    const store = createProgressStore();
    store.subscribe(() => {});
    const before = store.getSnapshot();

    store.dismissIssue();

    expect(store.getSnapshot()).toBe(before);
  });
});
