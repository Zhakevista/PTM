"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Аудио с учетом автозапрета браузеров: звук можно воспроизвести только после
 * жеста пользователя. `unlock()` вызываем из обработчика клика/тапа.
 * Если mp3 отсутствует, играет короткий сигнал через Web Audio.
 */
export function useSound(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const a = new Audio(src);
    a.preload = "auto";
    audioRef.current = a;
    return () => {
      a.pause();
      audioRef.current = null;
    };
  }, [src]);

  const beepFallback = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      [0, 0.3, 0.6].forEach((t) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.value = 0.4;
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.2);
      });
    } catch {
      /* ignore */
    }
  }, []);

  const play = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      await a.play();
      setBlocked(false);
    } catch (e) {
      if ((e as DOMException)?.name === "NotAllowedError") setBlocked(true);
      else beepFallback();
    }
  }, [beepFallback]);

  /** Вызвать из клика: «разблокирует» воспроизведение на будущее. */
  const unlock = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.muted = true;
      await a.play();
      a.pause();
      a.currentTime = 0;
      setBlocked(false);
    } catch {
      /* ignore */
    } finally {
      a.muted = false;
    }
  }, []);

  return { play, unlock, blocked };
}
