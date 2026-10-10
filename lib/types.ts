export type EntryStatus = "waiting" | "current" | "done";

/** queues/{subjectId}/entries/{entryId} */
export interface Entry {
  name: string; // "Имя и Фамилия ученика"
  number: number; // порядковый номер талона (растет, не переиспользуется)
  joinedAt: number; // время постановки в очередь (ms, серверное)
  status: EntryStatus;
  invitedAt?: number; // когда учитель пригласил
}

/** queues/{subjectId}/timer */
export interface TimerState {
  endsAt: number | null; // серверное время окончания (ms) или null, если не запущен
  duration: number; // регламент в секундах
}

/** queues/{subjectId} */
export interface QueueData {
  counter?: number;
  entries?: Record<string, Entry>;
  timer?: TimerState;
}

/** subjects/{subjectId} */
export interface Subject {
  name: string; // "Математика"
  teacher?: string; // "Иванова А.П."
  room?: string; // "Каб. 214"
}

export interface EntryWithId extends Entry {
  id: string;
}
