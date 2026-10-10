"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQueue } from "@/hooks/useQueue";
import { useSound } from "@/hooks/useSound";
import { finishCurrent, inviteNext, startMeeting } from "@/lib/queue";

const pad = (n: number) => String(n).padStart(2, "0");
const fmtTime = (ms: number) =>
  new Date(ms).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

export default function TeacherPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const q = useQueue(subjectId);
  const bell = useSound("/bell.mp3");

  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const firedFor = useRef<number | null>(null);

  // Тик 4 раза в секунду — таймер остается точным и после перезагрузки страницы
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const { endsAt } = q.timer;
  const running = endsAt !== null;
  const remainingMs = running ? Math.max(0, endsAt - (now + q.serverOffset)) : q.timer.duration * 1000;
  const expired = running && remainingMs === 0;
  const secs = Math.ceil(remainingMs / 1000);

  // Когда таймер дошел до 00:00 — один раз звоним
  useEffect(() => {
    if (expired && endsAt !== null && firedFor.current !== endsAt) {
      firedFor.current = endsAt;
      bell.play();
    }
  }, [expired, endsAt, bell]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await bell.unlock();
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const title = q.subject?.name ?? subjectId;
  const hasCurrent = !!q.current;

  return (
    <main
      className={`min-h-screen select-none p-6 lg:p-10 ${
        expired ? "animate-flash-red" : "bg-brand-900"
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex items-baseline justify-between">
          <h1 className="text-3xl font-extrabold lg:text-5xl">{title}</h1>
          <span className="text-xl text-brand-200 lg:text-3xl">
            В очереди: <b className="text-white">{q.waiting.length}</b>
          </span>
        </header>

        {q.error && (
          <div className="rounded-2xl bg-red-600 p-4 text-xl font-bold">
            Ошибка соединения с базой: {q.error}
          </div>
        )}

        {/* Статус */}
        <section className="rounded-3xl bg-white p-8 text-brand-900 lg:p-12">
          <p className="text-2xl font-semibold text-brand-700 lg:text-4xl">
            {hasCurrent ? "Сейчас на приеме:" : "Свободно"}
          </p>
          {hasCurrent && (
            <p className="mt-2 break-words text-5xl font-black leading-tight lg:text-8xl">
              {q.current!.name}
            </p>
          )}
        </section>

        {/* Таймер */}
        <section className="text-center">
          <div
            className={`font-black tabular-nums leading-none ${
              expired ? "text-white" : running ? "text-white" : "text-brand-200"
            } text-[7rem] sm:text-[10rem] lg:text-[14rem]`}
          >
            {pad(Math.floor(secs / 60))}:{pad(secs % 60)}
          </div>
          {expired && (
            <p className="mt-2 text-4xl font-black uppercase tracking-wide">Время вышло!</p>
          )}
        </section>

        {/* Кнопки */}
        <section className="grid gap-4 lg:grid-cols-2">
          {hasCurrent && !running ? (
            <button
              disabled={busy}
              onClick={() => run(() => startMeeting(subjectId, Date.now() + q.serverOffset))}
              className="rounded-3xl bg-green-500 py-8 text-4xl font-black text-white shadow-lg active:scale-95 disabled:opacity-50 lg:text-5xl"
            >
              Начать встречу
            </button>
          ) : (
            <button
              disabled={busy || !hasCurrent}
              onClick={() => run(() => finishCurrent(subjectId))}
              className="rounded-3xl border-4 border-white py-8 text-3xl font-black text-white active:scale-95 disabled:opacity-30 lg:text-4xl"
            >
              Завершить встречу
            </button>
          )}

          <button
            disabled={busy || q.waiting.length === 0}
            onClick={() => run(() => inviteNext(subjectId))}
            className="rounded-3xl bg-white py-8 text-4xl font-black text-brand-900 shadow-lg active:scale-95 disabled:opacity-40 lg:text-5xl"
          >
            Пригласить следующего
          </button>
        </section>

        {bell.blocked && (
          <button
            onClick={() => bell.unlock()}
            className="rounded-2xl bg-yellow-400 p-4 text-2xl font-extrabold text-brand-950"
          >
            Нажмите, чтобы включить звук звонка
          </button>
        )}

        {/* Очередь */}
        <section className="rounded-3xl bg-brand-950/60 p-6 lg:p-8">
          <h2 className="mb-4 text-3xl font-extrabold lg:text-4xl">Очередь</h2>
          {q.loading ? (
            <p className="text-2xl text-brand-200">Загрузка…</p>
          ) : q.waiting.length === 0 ? (
            <p className="text-2xl text-brand-200">Никого нет в очереди</p>
          ) : (
            <ol className="grid gap-3">
              {q.waiting.map((e, i) => (
                <li
                  key={e.id}
                  className="flex items-center gap-4 rounded-2xl bg-brand-800 p-4 text-2xl lg:text-4xl"
                >
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-3xl font-black text-brand-900 lg:h-20 lg:w-20 lg:text-5xl">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 break-words font-bold">{e.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-brand-200">
                    {typeof e.joinedAt === "number" ? fmtTime(e.joinedAt) : "—"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
