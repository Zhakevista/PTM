"use client";

import { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";
import { getDb, MEETING_SECONDS } from "@/lib/firebase";
import type { EntryWithId, QueueData, Subject, TimerState } from "@/lib/types";

export interface QueueView {
  loading: boolean;
  error: string | null;
  subject: Subject | null;
  current: EntryWithId | null;
  waiting: EntryWithId[]; // по возрастанию номера
  all: EntryWithId[];
  timer: TimerState;
  /** Серверное время «сейчас» = Date.now() + offset. */
  serverOffset: number;
}

/** Подписка на очередь предмета в реальном времени. */
export function useQueue(subjectId: string): QueueView {
  const [data, setData] = useState<QueueData | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getDb();
    const onError = (e: Error) => setError(e.message);

    const unsubQueue = onValue(
      ref(db, `queues/${subjectId}`),
      (snap) => {
        setData((snap.val() as QueueData | null) ?? {});
        setLoading(false);
      },
      onError
    );
    const unsubSubject = onValue(
      ref(db, `subjects/${subjectId}`),
      (snap) => setSubject((snap.val() as Subject | null) ?? null),
      onError
    );
    const unsubOffset = onValue(ref(db, ".info/serverTimeOffset"), (snap) =>
      setOffset((snap.val() as number) ?? 0)
    );

    return () => {
      unsubQueue();
      unsubSubject();
      unsubOffset();
    };
  }, [subjectId]);

  return useMemo(() => {
    const all: EntryWithId[] = Object.entries(data?.entries ?? {})
      .map(([id, e]) => ({ ...e, id }))
      .sort((a, b) => a.number - b.number);
    return {
      loading,
      error,
      subject,
      all,
      current: all.find((e) => e.status === "current") ?? null,
      waiting: all.filter((e) => e.status === "waiting"),
      timer: data?.timer ?? { endsAt: null, duration: MEETING_SECONDS },
      serverOffset: offset,
    };
  }, [data, subject, offset, loading, error]);
}
