import {
  push,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { getDb, MEETING_SECONDS } from "./firebase";
import type { Entry, QueueData } from "./types";

const queuePath = (subjectId: string) => `queues/${subjectId}`;

/**
 * Родитель встает в очередь. Номер выдается атомарно через транзакцию,
 * поэтому два родителя одновременно не получат одинаковый номер.
 * Возвращает id записи — его родитель хранит в localStorage.
 */
export async function joinQueue(subjectId: string, name: string): Promise<string> {
  const db = getDb();
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!clean) throw new Error("Введите имя и фамилию ученика");

  const counter = await runTransaction(
    ref(db, `${queuePath(subjectId)}/counter`),
    (current: number | null) => (current ?? 0) + 1
  );
  const number = counter.snapshot.val() as number;

  const entryRef = push(ref(db, `${queuePath(subjectId)}/entries`));
  const entry = {
    name: clean,
    number,
    joinedAt: serverTimestamp(),
    status: "waiting",
  };
  await set(entryRef, entry);
  return entryRef.key as string;
}

/** Родитель выходит из очереди (только пока ожидает). */
export async function leaveQueue(subjectId: string, entryId: string): Promise<void> {
  await remove(ref(getDb(), `${queuePath(subjectId)}/entries/${entryId}`));
}

/**
 * Атомарно: текущий -> done, первый ожидающий -> current, таймер сброшен.
 * Если invite=false — просто завершает текущую встречу.
 */
async function advance(subjectId: string, invite: boolean): Promise<void> {
  await runTransaction(ref(getDb(), queuePath(subjectId)), (data: QueueData | null) => {
    // Первый вызов может прийти с null (нет локального кэша) — Firebase повторит с реальными данными.
    if (data === null) return data;

    const entries: Record<string, Entry> = data.entries ?? {};

    for (const id of Object.keys(entries)) {
      if (entries[id].status === "current") {
        entries[id] = { ...entries[id], status: "done" };
      }
    }

    if (invite) {
      const next = Object.entries(entries)
        .filter(([, e]) => e.status === "waiting")
        .sort(([, a], [, b]) => a.number - b.number)[0];
      if (next) {
        entries[next[0]] = { ...next[1], status: "current", invitedAt: Date.now() };
      }
    }

    return {
      ...data,
      entries,
      timer: { endsAt: null, duration: MEETING_SECONDS },
    };
  });
}

/** Кнопка «Пригласить следующего». */
export const inviteNext = (subjectId: string) => advance(subjectId, true);

/** Кнопка «Завершить встречу» (кабинет становится свободным). */
export const finishCurrent = (subjectId: string) => advance(subjectId, false);

/** Кнопка «Начать встречу»: запускает общий для всех устройств таймер. */
export async function startMeeting(subjectId: string, serverNow: number): Promise<void> {
  await update(ref(getDb(), `${queuePath(subjectId)}/timer`), {
    endsAt: serverNow + MEETING_SECONDS * 1000,
    duration: MEETING_SECONDS,
  });
}

/** Сбросить очередь целиком (для нового собрания). */
export async function resetQueue(subjectId: string): Promise<void> {
  await remove(ref(getDb(), queuePath(subjectId)));
}
