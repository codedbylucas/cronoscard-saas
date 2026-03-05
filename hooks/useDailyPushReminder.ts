import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarEvent, EventType } from '../types';

type PermissionState = NotificationPermission | 'unsupported';

const LAST_REMINDER_KEY = 'lastDailyReminderDate';
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

  const todayPushes = useMemo(() => {
    const list = events.filter(
      (ev) => ev.type === EventType.PUSH && ev.date === today
    );

    // fallback mock quando não houver eventos carregados
    if (list.length === 0) {
      return [
        { id: 'mock-1', title: 'Vencimento no dia', date: today, type: EventType.PUSH, customContent: '', order: 0 },
        { id: 'mock-2', title: 'Fechamento de fatura', date: today, type: EventType.PUSH, customContent: '', order: 1 },
      ];
    }

    return list;
  }, [events, today]);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current as any);
      timeoutRef.current = null;
    }
  };

  const persistLastReminder = (date: string) => {
    localStorage.setItem(LAST_REMINDER_KEY, date);
  };

  const alreadyFiredToday = () => localStorage.getItem(LAST_REMINDER_KEY) === today;

  const buildNotificationBody = () => {
    const titles = todayPushes.slice(0, 3).map((ev) => ev.title);
    if (titles.length === 0) return 'Você tem push(s) agendadas para hoje.';
    return titles.join(' • ');
  };

  const dispatchReminder = () => {
    persistLastReminder(today);
    const body = buildNotificationBody();
    const list = todayPushes.slice(0, 3).map((ev) => ev.title);

    // In-app banner (sempre mostra, mesmo sem Notification API)
    setBanner({
      title: 'Pushs pendentes de hoje',
      description:
        todayPushes.length > 0
          ? `Você tem ${todayPushes.length} push(s) agendadas para hoje.`
          : 'Nenhuma push agendada para hoje.',
      list,
    });

    if (hasNotificationApi && permission === 'granted') {
      new Notification('Pushs pendentes de hoje', {
        body,
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_ICON,
        tag: 'daily-push-reminder',
      });
    }
  };

  // agenda timeout diário para 08:00 local; re-agenda para o dia seguinte após disparar
  const scheduleNext = () => {
    clearTimer();
    if (currentSection !== 'calendar') return;

    // Debug fast-path: permite testar sem alterar relógio
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const paramDebug = params?.get('debugReminder') === '1';
    if ((debugSeconds && debugSeconds > 0) || paramDebug) {
      const delay = debugSeconds && debugSeconds > 0 ? debugSeconds * 1000 : 5000; // default 5s
      timeoutRef.current = setTimeout(dispatchReminder, delay);
      return;
    }

    const now = new Date();
    const target = new Date();
    target.setHours(8, 0, 0, 0);

    // Se já passou das 08:00, dispara agora se ainda não disparou, e agenda para amanhã
    if (now >= target) {
      if (!alreadyFiredToday()) {
        dispatchReminder();
      }
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);
      timeoutRef.current = setTimeout(dispatchReminder, tomorrow.getTime() - now.getTime());
      return;
    }

    // Ainda não deu 08:00 -> agenda timeout até lá
    timeoutRef.current = setTimeout(dispatchReminder, target.getTime() - now.getTime());
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
  }, [currentSection, events, permission]); // reavalia quando eventos mudam ou permissão muda

  return {
    permission,
    hasNotificationApi,
    banner,
    today,
    requestPermission,
    clearBanner: () => setBanner(null),
  };
};
