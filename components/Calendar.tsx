import React, { useState } from 'react';
import { CalendarEvent, EventType, EVENT_COLORS, resolveEventColorStyle } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  events: CalendarEvent[];
  onDayClick: (date: string) => void;
  onEventMove: (eventId: string, targetDate: string, targetIndex: number) => void;
}

export const Calendar: React.FC<Props> = ({ events, onDayClick, onEventMove }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const sortDayEvents = (list: CalendarEvent[]) =>
    [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));

  const setDragTarget = (date: string | null, index: number | null) => {
    if (dragOverDate === date && dragOverIndex === index) return;
    setDragOverDate(date);
    setDragOverIndex(index);
  };

  // Navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Calendar Grid Construction Logic
  const getCalendarDays = () => {
    const startDay = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const daysArray = [];

    // Previous Month Days (Padding)
    for (let i = startDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const date = new Date(year, month - 1, d);
      daysArray.push({ date, isCurrentMonth: false });
    }

    // Current Month Days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      daysArray.push({ date, isCurrentMonth: true });
    }

    // Next Month Days (Fill remaining grid to ensure consistent height, usually 42 cells)
    const totalCells = 42; 
    const remaining = totalCells - daysArray.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      daysArray.push({ date, isCurrentMonth: false });
    }

    return daysArray;
  };

  const calendarDays = getCalendarDays();

  // Helper to get visual style for a specific day cell
  const getDayStyle = (dateStr: string, isCurrentMonth: boolean) => {
    const dayEvents = sortDayEvents(events.filter(e => e.date === dateStr));
    const activeEvents = dayEvents.filter(e => !e.isCompleted);
    
    // Default base style
    let styles = "border-r border-b border-gray-100/50 transition-all duration-300 relative group flex flex-col ";
    
    // Determine priority color if has events
    if (activeEvents.length > 0) {
        const primaryColor = resolveEventColorStyle(activeEvents[0].type, activeEvents[0].titleColor);
        styles += `${primaryColor.lightBg} bg-opacity-50 ring-1 ring-inset ${primaryColor.ring} ring-opacity-40 `;
    } else {
        // No events
        styles += "bg-transparent hover:bg-white hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:z-10 ";
    }

    // Is Today?
    const isToday = new Date().toISOString().slice(0, 10) === dateStr;
    if (isToday && dayEvents.length === 0) {
        styles += "bg-blue-50/10 ";
    }

    // Opacity for off-months
    if (!isCurrentMonth) {
        styles += "opacity-60 grayscale-[0.3] ";
        if (dayEvents.length === 0) styles += "bg-gray-50/30 text-gray-300 ";
    }

    return styles;
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-10 py-8 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-20">
        <div className="flex flex-col">
            <h2 className="text-4xl font-bold text-gray-900 capitalize tracking-tighter">
                {new Date(year, month).toLocaleDateString('pt-BR', { month: 'long' })}
            </h2>
            <span className="text-lg font-medium text-gray-400 mt-1">
                {year}
            </span>
        </div>

        <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
          <button onClick={prevMonth} className="p-3 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-gray-900 transition-all">
            <ChevronLeft size={22} />
          </button>
          <div className="w-px h-8 bg-gray-100 mx-1"></div>
          <button onClick={nextMonth} className="p-3 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-gray-900 transition-all">
            <ChevronRight size={22} />
          </button>
        </div>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/40">
        {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(day => (
          <div key={day} className="py-5 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
            <span className="hidden md:inline">{day}</span>
            <span className="md:hidden">{day.slice(0,3)}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 auto-rows-fr">
        {calendarDays.map((dayObj, index) => {
            const dateStr = dayObj.date.toISOString().slice(0, 10);
            const dayEvents = sortDayEvents(events.filter(e => e.date === dateStr));
            const isToday = new Date().toISOString().slice(0, 10) === dateStr;
            const dayNumber = dayObj.date.getDate();

            const insertPlaceholder = (position: number) =>
              draggingId && dragOverDate === dateStr && dragOverIndex === position ? (
                <div
                  key={`ph-${dateStr}-${position}`}
                  className="h-8 rounded-md border-2 border-dashed border-blue-300 bg-blue-50/60"
                ></div>
              ) : null;

            return (
                <div 
                    key={dateStr}
                    onClick={() => onDayClick(dateStr)}
                    onDragOver={(e) => {
                      if (!draggingId) return;
                      e.preventDefault();
                      // Só atualiza o alvo se ainda não está neste dia/índice (evita jitter ao alternar container/itens)
                      if (dragOverDate !== dateStr || dragOverIndex === null) {
                        setDragTarget(dateStr, dayEvents.length);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggingId === null) return;
                      const targetIndex = dragOverIndex ?? dayEvents.length;
                      onEventMove(draggingId, dateStr, targetIndex);
                      setDraggingId(null);
                      setDragTarget(null, null);
                    }}
                    className={`min-h-[160px] p-4 cursor-pointer flex flex-col ${getDayStyle(dateStr, dayObj.isCurrentMonth)} ${dragOverDate === dateStr ? 'outline outline-2 outline-blue-200' : ''}`}
                >
                    <div className="flex justify-between items-start mb-3">
                        <span className={`text-lg font-medium w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                            isToday 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                            : dayObj.isCurrentMonth ? 'text-gray-400 group-hover:text-gray-900' : 'text-gray-300'
                        }`}>
                            {dayNumber}
                        </span>
                        
                        {/* Dots indicator for high density */}
                        {dayEvents.length > 3 && (
                             <div className="flex -space-x-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 ml-1"></div>
                             </div>
                        )}
                    </div>
                    
                    <div className="flex-1 overflow-hidden space-y-1.5 flex flex-col justify-start">
                        {dayEvents.map((event, idx) => (
                          <React.Fragment key={event.id}>
                            {insertPlaceholder(idx)}
                            <div 
                              draggable
                              onDragStart={(e) => {
                                setDraggingId(event.id);
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/plain', event.id);
                              }}
                              onDragEnd={() => {
                                setDraggingId(null);
                                setDragTarget(null, null);
                              }}
                              onDragOver={(e) => {
                                if (!draggingId) return;
                                e.preventDefault();
                                e.stopPropagation();
                                if (dragOverDate !== dateStr || dragOverIndex !== idx) {
                                  setDragTarget(dateStr, idx);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide shadow-sm flex items-center gap-1.5 border border-black/5 ${
                                event.isCompleted ? 'bg-gray-200 text-gray-600 border-gray-200' : resolveEventColorStyle(event.type, event.titleColor).bg + ' text-white'
                              } ${draggingId === event.id ? 'opacity-60' : ''} hover:brightness-105 transition-all w-full`}
                              >
                                <span className="truncate leading-none pb-[1px]">{event.title}</span>
                            </div>
                          </React.Fragment>
                        ))}
                        {insertPlaceholder(dayEvents.length)}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};
