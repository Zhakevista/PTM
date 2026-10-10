"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQueue } from "@/hooks/useQueue";
import { useSound } from "@/hooks/useSound";
import { joinQueue, leaveQueue } from "@/lib/queue";
import { MEETING_SECONDS } from "@/lib/firebase";

const MEETING_MIN = MEETING_SECONDS / 60;

export default function ParentPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const storageKey = `queue:${subjectId}`;

  const q = useQueue(subjectId);
  const chime = useSound("/notification.mp3");

  const [entryId, setEntryId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const notifiedRef = useRef(false);

  // Восстанавливаем место после перезагрузки страницы
  useEffect(() => {
    try {
      setEntryId(localStorage.getItem(storageKey));
    } catch {
      /* private mode */
    }
  }, [storageKey]);

  const me = entryId ? q.all.find((e) => e.id === entryId) ?? null : null;

  // Запись удалена из базы (например, сброс очереди) — забываем её
  useEffect(() => {
    if (entryId && !q.loading && !me) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      setEntryId(null);
      notifiedRef.current = false;
    }
  }, [entryId, q.loading, me, storageKey]);

  // Слушаем смену статуса на «current» → звук + вибрация
  const isCurrent = me?.status === "current";
  useEffect(() => {
    if (isCurrent && !notifiedRef.current) {
      notifiedRef.current = true;
      chime.play();
      try {
        navigator.vibrate?.([400, 150, 400, 150, 800]);
      } catch {}
    }
    if (!isCurrent && me?.status !== "done") notifiedRef.current = false;
  }, [isCurrent, me?.status, chime]);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await chime.unlock(); // жест пользователя — разрешаем звук на будущее
      const id = await joinQueue(subjectId, name);
      try {
        localStorage.setItem(storageKey, id);
      } catch {}
      setEntryId(id);
    } catch (e) {
      setFormError((e as Error).message || "Не удалось встать в очередь");
    } finally {
      setSubmitting(false);
    }
  };

  const onLeave = async () => {
    if (!entryId || !confirm("Выйти из очереди?")) return;
    await leaveQueue(subjectId, entryId);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setEntryId(null);
  };

  const onJoinAgain = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setEntryId(null);
    notifiedRef.current = false;
  };

  const title = q.subject?.name ?? subjectId;
  const ahead = me && me.status === "waiting" ? q.waiting.filter((e) => e.number < me.number).length : 0;
  const waitMin = ahead * MEETING_MIN;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 bg-brand-900 p-5">
      <header>
        <p className="text-lg font-semibold text-brand-200">Электронная очередь</p>
        <h1 className="text-3xl font-black leading-tight">{title}</h1>
        {q.subject?.teacher && (
          <p className="mt-1 text-lg text-brand-100">
            {q.subject.teacher}
            {q.subject.room ? ` · ${q.subject.room}` : ""}
          </p>
        )}
      </header>

      {q.error && (
        <div className="rounded-2xl bg-red-600 p-4 text-lg font-bold">
          Нет связи с базой: {q.error}
        </div>
      )}

      {/* 1. Не в очереди */}
      {!me && (
        <form onSubmit={onSubmit} className="flex flex-1 flex-col justify-center gap-5">
          <label className="block">
            <span className="mb-2 block text-2xl font-extrabold">Имя и Фамилия ученика</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              autoComplete="off"
              placeholder="Например: Алия Нурланова"
              className="w-full rounded-2xl border-4 border-brand-500 bg-white px-5 py-5 text-2xl font-bold text-brand-900 placeholder:font-normal placeholder:text-slate-400 outline-none focus:border-white"
            />
          </label>
          {formError && <p className="text-lg font-bold text-yellow-300">{formError}</p>}
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-2xl bg-white py-6 text-3xl font-black text-brand-900 shadow-lg active:scale-95 disabled:opacity-50"
          >
            {submitting ? "Подождите…" : "Встать в очередь"}
          </button>
          <p className="text-center text-lg text-brand-200">
            В очереди сейчас: <b className="text-white">{q.waiting.length}</b>
          </p>
        </form>
      )}

      {/* 2. Ожидает */}
      {me?.status === "waiting" && (
        <section className="flex flex-1 flex-col gap-5">
          <div className="rounded-3xl bg-white p-6 text-center text-brand-900">
            <p className="text-xl font-bold text-brand-700">Ваш номер</p>
            <p className="text-[9rem] font-black leading-none">{me.number}</p>
            <p className="mt-1 break-words text-2xl font-extrabold">{me.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-2xl bg-brand-800 p-4">
              <p className="text-lg text-brand-200">Перед вами</p>
              <p className="text-6xl font-black">{ahead}</p>
            </div>
            <div className="rounded-2xl bg-brand-800 p-4">
              <p className="text-lg text-brand-200">Ожидание</p>
              <p className="text-6xl font-black">~{waitMin}</p>
              <p className="text-lg text-brand-200">мин</p>
            </div>
          </div>

          {q.current && (
            <p className="text-center text-lg text-brand-100">
              Сейчас на приеме: <b className="text-white">{q.current.name}</b>
            </p>
          )}

          {chime.blocked && (
            <button
              onClick={() => chime.unlock()}
              className="rounded-2xl bg-yellow-400 p-4 text-xl font-extrabold text-brand-950"
            >
              Нажмите, чтобы включить звук
            </button>
          )}

          <p className="text-center text-lg text-brand-200">
            Не закрывайте страницу — когда подойдет ваша очередь, телефон подаст сигнал.
          </p>

          <button
            onClick={onLeave}
            className="mt-auto rounded-2xl border-2 border-brand-500 py-4 text-xl font-bold text-brand-100 active:scale-95"
          >
            Выйти из очереди
          </button>
        </section>
      )}

      {/* 3. Ваша очередь */}
      {isCurrent && (
        <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="animate-pulse-green rounded-3xl bg-green-500 p-8">
            <p className="text-5xl font-black leading-tight text-white">ВАША ОЧЕРЕДЬ!</p>
            <p className="mt-3 text-3xl font-extrabold text-white">Пройдите в кабинет</p>
          </div>
          <p className="text-xl text-brand-100">
            Номер <b className="text-white">{me!.number}</b> · {me!.name}
          </p>
          {chime.blocked && (
            <button
              onClick={() => chime.play()}
              className="rounded-2xl bg-yellow-400 px-6 py-4 text-xl font-extrabold text-brand-950"
            >
              Включить звук
            </button>
          )}
        </section>
      )}

      {/* 4. Прием завершен */}
      {me?.status === "done" && (
        <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <p className="text-4xl font-black">Спасибо!</p>
          <p className="text-xl text-brand-100">Прием завершен.</p>
          <button
            onClick={onJoinAgain}
            className="rounded-2xl bg-white px-6 py-5 text-2xl font-black text-brand-900 active:scale-95"
          >
            Встать в очередь снова
          </button>
        </section>
      )}
    </main>
  );
}
