export enum EventType {
  CLOSING = 'closing',
  DUE = 'due',
  PUSH = 'push'
}

export interface Template {
  id: string;
  type: EventType;
  title: string;
  content: string;
}

export interface CalendarEvent {
  id: string;
  date: string; // ISO YYYY-MM-DD
  type: EventType;
  title: string; // Short title for the calendar flag
  templateId?: string; // Reference to a template
  customContent: string; // The actual text (copied from template or edited)
}

export interface User {
  username: string;
  companyName: string;
}

export const EVENT_COLORS = {
  [EventType.DUE]: {
    bg: 'bg-red-500',
    text: 'text-red-600',
    border: 'border-red-500',
    ring: 'ring-red-500',
    lightBg: 'bg-red-50',
    label: 'Vencimento da Fatura',
    shadow: 'shadow-red-200'
  },
  [EventType.CLOSING]: {
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    border: 'border-amber-500',
    ring: 'ring-amber-500',
    lightBg: 'bg-amber-50',
    label: 'Fechamento da Fatura',
    shadow: 'shadow-amber-200'
  },
  [EventType.PUSH]: {
    bg: 'bg-sky-500',
    text: 'text-sky-600',
    border: 'border-sky-500',
    ring: 'ring-sky-500',
    lightBg: 'bg-sky-50',
    label: 'Notificação Push',
    shadow: 'shadow-sky-200'
  }
};