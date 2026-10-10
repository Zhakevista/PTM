"use client";

import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [subjectId, setSubjectId] = useState("math");
  const id = encodeURIComponent(subjectId.trim() || "math");

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 p-6">
      <header>
        <h1 className="text-4xl font-extrabold leading-tight">Электронная очередь</h1>
        <p className="mt-2 text-xl text-brand-200">Родительское собрание</p>
      </header>

      <label className="block">
        <span className="mb-2 block text-lg font-semibold text-brand-100">
          Идентификатор предмета / кабинета
        </span>
        <input
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="w-full rounded-2xl border-4 border-brand-500 bg-white px-5 py-4 text-2xl font-bold text-brand-900 outline-none focus:border-white"
          placeholder="math"
        />
      </label>

      <div className="grid gap-4">
        <Link
          href={`/teacher/${id}`}
          className="rounded-2xl bg-white px-6 py-5 text-center text-2xl font-extrabold text-brand-900 active:scale-95"
        >
          Экран учителя
        </Link>
        <Link
          href={`/queue/${id}`}
          className="rounded-2xl border-4 border-white px-6 py-5 text-center text-2xl font-extrabold text-white active:scale-95"
        >
          Страница родителя
        </Link>
      </div>
    </main>
  );
}
