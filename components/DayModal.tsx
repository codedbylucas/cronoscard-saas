import React, { useState, useEffect } from 'react';
import { CalendarEvent, EventType, Template, EVENT_COLORS, resolveEventColorStyle, getDefaultColorByType } from '../types';
import { getTemplates, saveEvent, deleteEvent } from '../services/storageService';
import { X, Copy, Trash2, Plus, Check, Calendar as CalendarIcon, ArrowRight, LayoutList, Loader2, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';

interface Props {
  user: string;
  date: string; // ISO Date YYYY-MM-DD
  events: CalendarEvent[];
  onClose: () => void;
  onUpdate: () => void;
}

export const DayModal: React.FC<Props> = ({ user, date, events, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<EventType>(EventType.DUE);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Estado para o modal de confirmação de exclusão
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Parse date for display
  const dateObj = new Date(date + 'T12:00:00');
  const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dayNumber = dateObj.getDate();
  const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long' });

  useEffect(() => {
    // Carregar templates async
    getTemplates(user).then(setTemplates);
  }, [user]);

  const handleAddEvent = async (template: Template) => {
    setIsProcessing(true);
    const dayEvents = events.filter(e => e.date === date);
    const newEvent: CalendarEvent = {
      // id será gerado pelo Supabase se omitido
      id: '', 
      date: date,
      type: template.type,
      title: template.title,
      templateId: template.id,
      customContent: template.content,
      titleColor: template.titleColor || getDefaultColorByType(template.type),
      order: dayEvents.length,
      isCompleted: false,
    };
    await saveEvent(user, newEvent);
    onUpdate(); // Chama refresh no pai
    setIsProcessing(false);
  };

  const confirmDelete = (id: string) => {
    setEventToDelete(id);
  };

  const handleDelete = async () => {
    if(!eventToDelete) return;
    setIsProcessing(true);
    await deleteEvent(user, eventToDelete);
    onUpdate();
    setEventToDelete(null);
    setIsProcessing(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleComplete = async (event: CalendarEvent) => {
    setIsProcessing(true);
    await saveEvent(user, { ...event, isCompleted: !event.isCompleted });
    onUpdate();
    setIsProcessing(false);
  };

  // Filter events for this day
  const dayEvents = events.filter(e => e.date === date);
  const sortedDayEvents = [...dayEvents].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));

  const getTypeLabelShort = (type: EventType) => {
      switch(type) {
          case EventType.DUE: return 'Vencimento';
          case EventType.CLOSING: return 'Fechamento';
          case EventType.PUSH: return 'Push';
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      
      {/* Modal de Confirmação de Exclusão (Nested) */}
      {eventToDelete && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-[2rem]">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-xs w-full animate-scale-in m-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3 text-red-500 mx-auto">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Excluir evento?</h3>
              <p className="text-xs text-gray-500 mb-5">
                Confirmar remoção deste evento do calendário.
              </p>
              <div className="flex gap-2 w-full">
                <button 
                  onClick={() => setEventToDelete(null)}
                  className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 text-sm"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row max-h-[85vh] ring-1 ring-white/20 relative">
        
        {isProcessing && !eventToDelete && (
          <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center backdrop-blur-[2px]">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        )}

        {/* Left Panel: Event List & Details */}
        <div className="flex-1 flex flex-col bg-gray-50/50">
            {/* Header Area */}
            <div className="px-8 py-8 border-b border-gray-100 flex justify-between items-start bg-white">
                <div>
                    <h2 className="text-4xl font-bold text-gray-900 tracking-tight flex items-baseline gap-2">
                        {dayNumber} 
                        <span className="text-xl font-medium text-gray-400 capitalize">{monthName}</span>
                    </h2>
                    <p className="text-gray-500 font-medium mt-1 capitalize">{dayName}</p>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        Timeline
                    </h3>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{dayEvents.length} eventos</span>
                </div>

                {dayEvents.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-3xl bg-white/50">
                        <div className="bg-gray-100 p-4 rounded-full mb-3">
                            <LayoutList size={24} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Dia livre</p>
                        <p className="text-xs text-gray-400 mt-1 max-w-[150px]">Nenhum evento financeiro agendado para hoje.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {sortedDayEvents.map(event => {
                        const colorStyle = resolveEventColorStyle(event.type, event.titleColor);
                        const isDone = !!event.isCompleted;
                        return (
                        <div key={event.id} className="relative pl-6 group">
                            {/* Vertical Line */}
                            <div className={`absolute left-0 top-0 bottom-0 w-[2px] rounded-full ${isDone ? 'bg-gray-300' : colorStyle.bg} opacity-30 group-hover:opacity-100 transition-opacity`}></div>
                            
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${isDone ? 'bg-gray-100 text-gray-500 border border-gray-200' : `${colorStyle.lightBg} ${colorStyle.text}`} `}>
                                              {EVENT_COLORS[event.type].label}
                                          </span>
                                          {isDone && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                              <CheckCircle2 size={12} />
                                              Concluído
                                            </span>
                                          )}
                                        </div>
                                        <h4 className={`font-bold text-lg leading-tight ${isDone ? 'text-gray-500' : 'text-gray-900'}`}>{event.title}</h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => toggleComplete(event)}
                                        className={`p-2 rounded-lg border text-xs font-bold uppercase tracking-wide ${
                                          isDone 
                                            ? 'border-gray-200 text-gray-500 hover:bg-gray-50' 
                                            : 'border-green-200 text-green-600 hover:bg-green-50'
                                        }`}
                                        title={isDone ? 'Marcar como ativo' : 'Marcar como concluído'}
                                      >
                                        {isDone ? <RotateCcw size={16} /> : <CheckCircle2 size={16} />}
                                      </button>
                                      <button onClick={() => confirmDelete(event.id)} className="text-gray-300 hover:text-red-500 transition p-2 hover:bg-red-50 rounded-lg -mr-2 -mt-2">
                                          <Trash2 size={18} />
                                      </button>
                                    </div>
                                </div>
                                
                                <div className={`bg-gray-50/80 p-4 rounded-xl text-sm leading-relaxed border border-gray-100 mb-4 ${isDone ? 'text-gray-500' : 'text-gray-600'}`}>
                                    "{event.customContent}"
                                </div>
                                
                                <button 
                                    onClick={() => handleCopy(event.customContent, event.id)}
                                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                                        copiedId === event.id 
                                        ? 'bg-green-500 text-white shadow-lg shadow-green-200' 
                                        : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-500 hover:text-blue-600'
                                    }`}
                                >
                                    {copiedId === event.id ? <Check size={18} /> : <Copy size={18} />}
                                    {copiedId === event.id ? 'Copiado para área de transferência' : 'Copiar Mensagem'}
                                </button>
                            </div>
                        </div>
                        );
                        })}
                    </div>
                )}
            </div>
        </div>

        {/* Right Panel: Add Event */}
        <div className="w-full md:w-[350px] bg-white border-l border-gray-100 flex flex-col shadow-[-20px_0_40px_-20px_rgba(0,0,0,0.05)] z-10">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Novo Evento</h3>
                <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                    <X size={20} />
                </button>
             </div>

             <div className="p-6 flex-1 overflow-y-auto">
                {/* Modern Tabs */}
                <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1 mb-6">
                    {Object.values(EventType).map(type => {
                        const isActive = activeTab === type;
                        return (
                            <button
                                key={type}
                                onClick={() => setActiveTab(type)}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 relative overflow-hidden ${
                                isActive 
                                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' 
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                }`}
                            >
                                <span className="relative z-10">{getTypeLabelShort(type)}</span>
                                {isActive && (
                                    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full mb-1 ${EVENT_COLORS[type].bg}`}></div>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="space-y-3">
                     <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 pl-1">Selecione o modelo</p>
                    
                    {templates.filter(t => t.type === activeTab).length === 0 ? (
                        <div className="text-center py-12 px-6 rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50/50">
                             <p className="text-sm text-gray-500 font-medium">Nenhum modelo encontrado.</p>
                             <p className="text-xs text-gray-400 mt-2">Crie modelos na tela de "Mensagens" para usá-los aqui.</p>
                        </div>
                    ) : (
                        templates
                        .filter(t => t.type === activeTab)
                        .map(template => (
                            <button
                                key={template.id}
                                onClick={() => handleAddEvent(template)}
                                className="w-full text-left p-4 rounded-2xl border border-gray-100 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 hover:bg-white bg-white group transition-all duration-300 transform hover:-translate-y-1 relative"
                            >
                                <div className="absolute top-4 right-4 text-gray-300 group-hover:text-blue-500 transition-colors">
                                    <Plus size={18} />
                                </div>
                                <div className="pr-8">
                                    <h4 className="text-sm font-bold text-gray-800 mb-1 group-hover:text-blue-700 transition-colors">{template.title}</h4>
                                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 group-hover:text-gray-500">
                                        {template.content}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};
