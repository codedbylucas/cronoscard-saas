export enum EventType {
  CLOSING = 'closing',
  DUE = 'due',
  PUSH = 'push'
}

export const TITLE_COLORS = ['yellow', 'green', 'red', 'blue'] as const;
export type TitleColor = typeof TITLE_COLORS[number];

export interface Template {
  id: string;
  type: EventType;
  title: string;
  content: string;
  titleColor?: TitleColor;
}

export interface CalendarEvent {
  id: string;
  date: string; // ISO YYYY-MM-DD
  type: EventType;
  title: string; // Short title for the calendar flag
  templateId?: string; // Reference to a template
  customContent: string; // The actual text (copied from template or edited)
  titleColor?: TitleColor;
  order?: number; // Position within the day (0-based)
  isCompleted?: boolean; // Marks event as done without deleting
}

export interface User {
  username: string;
  companyName: string;
}

// Paleta de cores escolhidas manualmente pelo usuГЎrio
const COLOR_STYLES: Record<TitleColor, { bg: string; text: string; border: string; ring: string; lightBg: string; label: string; shadow: string }> = {
  yellow: {
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    border: 'border-amber-500',
    ring: 'ring-amber-500',
    lightBg: 'bg-amber-50',
    label: 'Amarelo',
    shadow: 'shadow-amber-200'
  },
  green: {
    bg: 'bg-green-500',
    text: 'text-green-600',
    border: 'border-green-500',
    ring: 'ring-green-500',
    lightBg: 'bg-green-50',
    label: 'Verde',
    shadow: 'shadow-green-200'
  },
  red: {
    bg: 'bg-red-500',
    text: 'text-red-600',
    border: 'border-red-500',
    ring: 'ring-red-500',
    lightBg: 'bg-red-50',
    label: 'Vermelho',
    shadow: 'shadow-red-200'
  },
  blue: {
    bg: 'bg-sky-500',
    text: 'text-sky-600',
    border: 'border-sky-500',
    ring: 'ring-sky-500',
    lightBg: 'bg-sky-50',
    label: 'Azul',
    shadow: 'shadow-sky-200'
  },
};

// Mantemos as cores antigas por categoria para fallback (dados legados)
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

export const getDefaultColorByType = (type: EventType): TitleColor => {
  switch (type) {
    case EventType.DUE:
      return 'red';
    case EventType.CLOSING:
      return 'yellow';
    case EventType.PUSH:
    default:
      return 'blue';
  }
};

export const resolveEventColorStyle = (type: EventType, titleColor?: TitleColor) => {
  const key = titleColor || getDefaultColorByType(type);
  return COLOR_STYLES[key];
};
