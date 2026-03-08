import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { signOut } from './services/authService';
import { Calendar } from './components/Calendar';
import { DayModal } from './components/DayModal';
import { TemplateManager } from './components/TemplateManager';
import { AuthPage } from './components/AuthPage';
import { HistoryDashboard } from './components/HistoryDashboard';
import { getEvents, saveEvent } from './services/storageService';
import { CalendarEvent } from './types';
import { Calendar as CalendarIcon, Layers, Layout, LogOut, Loader2, Clock3 } from 'lucide-react';
import { useDailyPushReminder } from './hooks/useDailyPushReminder';

const App: React.FC = () => {
  // Session State
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // App Navigation & Data State
  const [currentSection, setCurrentSection] = useState<'calendar' | 'templates' | 'history'>('calendar');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const sortDayEvents = (list: CalendarEvent[]) =>
    [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));

  const normalizeEvents = (items: CalendarEvent[]) => {
    const byDate: Record<string, CalendarEvent[]> = {};
    items.forEach((event) => {
      if (!byDate[event.date]) byDate[event.date] = [];
      byDate[event.date].push(event);
    });

    return Object.values(byDate).flatMap(dayEvents =>
      sortDayEvents(dayEvents).map((event, index) => ({
        ...event,
        order: event.order ?? index,
      }))
    );
  };

  const reorderEvents = (allEvents: CalendarEvent[], eventId: string, targetDate: string, targetIndex: number) => {
    const moving = allEvents.find(e => e.id === eventId);
    if (!moving) return { updated: allEvents, changed: [] as CalendarEvent[] };

    const sourceDate = moving.date;
    const clampedIndex = Math.max(0, Math.min(targetIndex, allEvents.filter(e => e.date === targetDate && e.id !== eventId).length));

    // Mesma data: apenas reordenar
    if (sourceDate === targetDate) {
      const dayEvents = sortDayEvents(allEvents.filter(e => e.date === sourceDate && e.id !== eventId));
      dayEvents.splice(clampedIndex, 0, { ...moving });
      const reindexed = dayEvents.map((event, index) => ({ ...event, order: index, date: sourceDate }));
      const others = allEvents.filter(e => e.date !== sourceDate);
      return { updated: [...others, ...reindexed], changed: reindexed };
    }

    // Datas diferentes: remover da origem e inserir no destino
    const sourceEvents = sortDayEvents(allEvents.filter(e => e.date === sourceDate && e.id !== eventId));
    const targetEvents = sortDayEvents(allEvents.filter(e => e.date === targetDate && e.id !== eventId));
    const updatedMoving = { ...moving, date: targetDate };
    targetEvents.splice(clampedIndex, 0, updatedMoving);

    const reindex = (list: CalendarEvent[], date: string) =>
      list.map((event, index) => ({ ...event, order: index, date }));

    const newSource = reindex(sourceEvents, sourceDate);
    const newTarget = reindex(targetEvents, targetDate);
    const others = allEvents.filter(e => e.date !== sourceDate && e.date !== targetDate);

    return { updated: [...others, ...newSource, ...newTarget], changed: [...newSource, ...newTarget] };
  };

  // Initialize Auth Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load events when session exists
  useEffect(() => {
    if (session?.user?.id) {
      loadEvents();
    } else {
        setEvents([]);
    }
  }, [session, currentSection]); // Reload when switching sections or session changes

  const loadEvents = async () => {
    if (!session?.user?.id) return;
    setIsLoadingEvents(true);
    const data = await getEvents(session.user.id);
    setEvents(normalizeEvents(data));
    setIsLoadingEvents(false);
  };

  const handleSignOut = async () => {
      await signOut();
      setSession(null);
  };

  const handleEventMove = async (eventId: string, targetDate: string, targetIndex: number) => {
    if (!session?.user?.id) return;
    const { updated, changed } = reorderEvents(events, eventId, targetDate, targetIndex);
    setEvents(updated);
    await Promise.all(changed.map(ev => saveEvent(session.user.id, ev)));
  };

  // Notificações de pushes às 09h, 12h e 15h
  const { banner, permission, hasNotificationApi, requestPermission, today, clearBanner } = useDailyPushReminder({
    events,
    currentSection,
  });

  if (isAuthLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-500" size={40} />
          </div>
      );
  }

  // Show Auth Page if no session
  if (!session) {
    return <AuthPage />;
  }

  // --- Main App Layout (Authenticated) ---
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-20 md:w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all duration-300">
        <div className="h-24 flex items-center justify-center md:justify-start md:px-8 border-b border-slate-800">
           <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-900/20">
             <CalendarIcon size={24} />
           </div>
           <span className="ml-3 font-bold text-xl tracking-tight hidden md:block">CronosCard</span>
        </div>

        <nav className="flex-1 py-8 space-y-3 px-4">
            <button 
                onClick={() => setCurrentSection('calendar')}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${currentSection === 'calendar' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <Layout size={22} className={`group-hover:scale-110 transition-transform ${currentSection === 'calendar' ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                <span className="font-medium hidden md:block text-sm">Calendário</span>
            </button>
            
            <button 
                onClick={() => setCurrentSection('templates')}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${currentSection === 'templates' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <Layers size={22} className={`group-hover:scale-110 transition-transform ${currentSection === 'templates' ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                <span className="font-medium hidden md:block text-sm">Mensagens</span>
            </button>

            <button 
                onClick={() => setCurrentSection('history')}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${currentSection === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <Clock3 size={22} className={`group-hover:scale-110 transition-transform ${currentSection === 'history' ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                <span className="font-medium hidden md:block text-sm">Histórico</span>
            </button>
        </nav>

        <div className="p-6 border-t border-slate-800">
             <div className="bg-slate-800/50 rounded-xl p-4 text-xs text-slate-400 hidden md:block border border-slate-700/50 mb-3">
                <p className="mb-2 font-semibold text-slate-300">Conta Conectada</p>
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                    <span className="truncate max-w-[120px]" title={session.user.email}>{session.user.email}</span>
                </div>
             </div>
             
             <button 
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-wider border border-slate-700 hover:border-red-500/20"
             >
                <LogOut size={16} />
                Sair
             </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative flex flex-col bg-[#F8FAFC]">
        
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 h-24 flex items-center justify-between px-10 flex-shrink-0 sticky top-0 z-40">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    {currentSection === 'calendar' && 'Visão Geral'}
                    {currentSection === 'templates' && 'Modelos de Mensagem'}
                    {currentSection === 'history' && 'Histórico e Dashboard'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    {currentSection === 'history'
                      ? 'Veja o histórico de push, atividades do calendário e lance contagens manuais.'
                      : 'Gerencie suas datas e notificações'}
                </p>
            </div>
            {currentSection === 'calendar' && (
              <div className="flex items-center gap-3">
                {permission !== 'granted' && (
                  <button
                    onClick={requestPermission}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-md shadow-blue-200 hover:bg-blue-700"
                  >
                    Ativar notificações
                  </button>
                )}
                {permission === 'denied' && (
                  <span className="text-xs text-red-500 max-w-xs text-right">
                    Notificações bloqueadas no navegador. Ative manualmente nas permissões do site para receber alertas.
                  </span>
                )}
                {!hasNotificationApi && (
                  <span className="text-xs text-slate-500">Seu navegador não suporta Web Notifications.</span>
                )}
              </div>
            )}
        </header>

        {/* Content Body */}
        <div className="p-6 md:p-10 flex-1 relative">
            
            {/* Loading Overlay for events */}
            {isLoadingEvents && (
                 <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center backdrop-blur-[1px] rounded-3xl">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                 </div>
            )}

            {currentSection === 'calendar' && (
                <div className="max-w-[1600px] mx-auto">
                    {/* Reminder banner */}
                    {banner && (
                      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 text-blue-900 shadow-sm px-5 py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold">{banner.title}</p>
                          <p className="text-sm">{banner.description}</p>
                          {banner.list && banner.list.length > 0 && (
                            <p className="text-xs text-blue-800 mt-1">Principais: {banner.list.join(' • ')}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedDate(today)}
                            className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700"
                          >
                            Ver agendadas
                          </button>
                          <button
                            onClick={clearBanner}
                            className="px-3 py-2 rounded-lg bg-white text-blue-700 border border-blue-200 text-sm hover:bg-blue-100"
                          >
                            Fechar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mb-8">
                        <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm ring-1 ring-gray-50">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                            <span className="text-sm font-semibold text-gray-600">Vencimento</span>
                        </div>
                        <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm ring-1 ring-gray-50">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div>
                            <span className="text-sm font-semibold text-gray-600">Fechamento</span>
                        </div>
                        <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm ring-1 ring-gray-50">
                            <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.4)]"></div>
                            <span className="text-sm font-semibold text-gray-600">Push</span>
                        </div>
                    </div>

                    <Calendar 
                        events={events} 
                        onDayClick={(date) => setSelectedDate(date)} 
                        onEventMove={handleEventMove}
                    />
                </div>
            )}

            {currentSection === 'templates' && (
                <div className="h-full max-w-[1600px] mx-auto">
                     <TemplateManager 
                        user={session.user.id} 
                        onClose={() => setCurrentSection('calendar')} 
                    />
                </div>
            )}

            {currentSection === 'history' && (
                <div className="h-full max-w-[1600px] mx-auto">
                    <HistoryDashboard 
                        userId={session.user.id} 
                        events={events} 
                        onReload={loadEvents}
                    />
                </div>
            )}
        </div>

      </main>

      {/* Day Modal (Overlay) */}
      {selectedDate && (
        <DayModal
          user={session.user.id}
          date={selectedDate}
          events={events}
          onClose={() => setSelectedDate(null)}
          onUpdate={loadEvents}
        />
      )}
    </div>
  );
};

export default App;
