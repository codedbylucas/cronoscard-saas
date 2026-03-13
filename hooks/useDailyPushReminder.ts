import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarEvent, EventType } from '../types';

type PermissionState = NotificationPermission | 'unsupported';

const LAST_REMINDER_KEY = 'dailyReminderSlots';
const REMINDER_SLOTS = [
  { hour: 9, min: 0 },
  { hour: 15, min: 0 },
  { hour: 16, min: 30 },
  { hour: 18, min: 0 },
] as const;
const NOTIFICATION_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
      <rect rx='14' ry='14' width='64' height='64' fill='#2563eb'/>
      <path d='M26 18h12c7 0 12 5 12 14s-5 14-12 14H28v-6h10c4 0 6-3 6-8s-2-8-6-8h-8v24h-8V18h8z' fill='white'/>
   </svg>`
)}`;

const formatLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

type FiredState = { date: string; firedSlots: string[] };

const formatSlotLabel = (hour: number, min: number) => 
  `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

interface ReminderBanner {
  title: string;
  description: string;
  list?: string[];
}

interface UseDailyPushReminderParams {
  events: CalendarEvent[];
  currentSection: 'calendar' | 'templates' | 'history';
}

export const useDailyPushReminder = ({ events, currentSection }: UseDailyPushReminderParams) => {
  const [permission, setPermission] = useState<PermissionState>('unsupported');
  const [banner, setBanner] = useState<ReminderBanner | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [today, setToday] = useState(() => formatLocalDate(new Date()));
  const hasNotificationApi = typeof window !== 'undefined' && 'Notification' in window;
  const debugSeconds =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_REMINDER_DEBUG_SECONDS
      ? Number(import.meta.env.VITE_REMINDER_DEBUG_SECONDS)
      : 0;

  // mantém o valor de hoje atualizado (caso a aba fique aberta após meia-noite)
  useEffect(() => {
    const id = setInterval(() => {
      const current = formatLocalDate(new Date());
      setToday((prev) => (prev === current ? prev : current));
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const pendingPushes = useMemo(
    () =>
      events.filter(
        (ev) =>
          ev.type === EventType.PUSH &&
          ev.date === today &&
          !ev.isCompleted
      ),
    [events, today]
  );

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current as any);
      timeoutRef.current = null;
    }
  };

  const getFiredState = (): FiredState => {
    if (typeof localStorage === 'undefined') return { date: today, firedSlots: [] };
    try {
      const raw = localStorage.getItem(LAST_REMINDER_KEY);
      if (!raw) return { date: today, firedSlots: [] };
      const parsed = JSON.parse(raw) as FiredState;
      if (parsed.date !== today) return { date: today, firedSlots: [] };
      return { date: today, firedSlots: Array.isArray(parsed.firedSlots) ? parsed.firedSlots : [] };
    } catch {
      return { date: today, firedSlots: [] };
    }
  };

  const markSlotFired = (slotKey: string) => {
    if (typeof localStorage === 'undefined') return;
    const state = getFiredState();
    const firedSlots = Array.from(new Set([...(state.firedSlots || []), slotKey]));
    localStorage.setItem(LAST_REMINDER_KEY, JSON.stringify({ date: today, firedSlots }));
  };

  const buildNotificationBody = () => {
    const titles = pendingPushes.slice(0, 3).map((ev) => ev.title);
    if (titles.length === 0) return 'Nenhuma push pendente para envio.';
    return titles.join(' • ');
  };

  const dispatchReminder = (hour: number, min: number) => {
    const slotKey = formatSlotLabel(hour, min);
    markSlotFired(slotKey);
    const body = buildNotificationBody();
    const list = pendingPushes.slice(0, 3).map((ev) => ev.title);

    // In-app banner (sempre mostra, mesmo sem Notification API)
    setBanner(
      pendingPushes.length > 0
        ? {
            title: `Pushs pendentes (${slotKey})`,
            description: `Você tem ${pendingPushes.length} push(s) agendadas para hoje.`,
            list,
          }
        : {
            title: `Sem push pendente (${slotKey})`,
            description: 'Nenhuma push agendada para hoje ou todas já foram concluídas.',
          }
    );

    if (hasNotificationApi && permission === 'granted') {
      new Notification('Pushs pendentes de hoje', {
        body,
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_ICON,
        tag: `daily-push-reminder-${today}-${slotKey}`,
      });
    }

    // agenda o próximo disparo automaticamente
    scheduleNext();
  };

  // agenda timeouts diários para os slots definidos; re-agenda sempre que disparar
  const scheduleNext = () => {
    clearTimer();
    if (currentSection !== 'calendar') return;

    // Debug fast-path: permite testar sem alterar relógio
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const paramDebug = params?.get('debugReminder') === '1';
    if ((debugSeconds && debugSeconds > 0) || paramDebug) {
      const delay = debugSeconds && debugSeconds > 0 ? debugSeconds * 1000 : 5000; // default 5s
      timeoutRef.current = setTimeout(() => dispatchReminder(REMINDER_SLOTS[0].hour, REMINDER_SLOTS[0].min), delay);
      return;
    }

    const now = new Date();
    const state = getFiredState();

    const todaySlots = REMINDER_SLOTS.map((slot) => ({
      ...slot,
      target: new Date(now.getFullYear(), now.getMonth(), now.getDate(), slot.hour, slot.min, 0, 0),
    }));

    const nextTodaySlot = todaySlots.find(
      ({ hour, min, target }) => {
        const slotKey = formatSlotLabel(hour, min);
        return target > now && !state.firedSlots.includes(slotKey);
      }
    );

    if (nextTodaySlot) {
      timeoutRef.current = setTimeout(
        () => dispatchReminder(nextTodaySlot.hour, nextTodaySlot.min),
        nextTodaySlot.target.getTime() - now.getTime()
      );
      return;
    }

    // Nenhum horário pendente hoje -> agenda o primeiro slot de amanhã
    const nextSlot = REMINDER_SLOTS[0];
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, nextSlot.hour, nextSlot.min, 0, 0);
    timeoutRef.current = setTimeout(
      () => dispatchReminder(nextSlot.hour, nextSlot.min),
      tomorrow.getTime() - now.getTime()
    );
  };

  const requestPermission = async () => {
    if (!hasNotificationApi) return;
    if (permission === 'granted' || permission === 'denied') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  // inicializa estado de permissão
  useEffect(() => {
    if (!hasNotificationApi) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
  }, [hasNotificationApi]);

  // agenda reminder diário enquanto a aba de calendário estiver ativa
  useEffect(() => {
    scheduleNext();
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSection, events, permission, today]); // reavalia quando eventos mudam, permissão muda ou vira o dia

  return {
    permission,
    hasNotificationApi,
    banner,
    today,
    requestPermission,
    clearBanner: () => setBanner(null),
  };
};
