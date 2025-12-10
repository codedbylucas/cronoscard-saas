import React, { useState, useEffect } from 'react';
import { Template, EventType, EVENT_COLORS } from '../types';
import { getTemplates, saveTemplate, deleteTemplate } from '../services/storageService';
import { generateTemplateMessage } from '../services/geminiService';
import { Trash2, Plus, Sparkles, Save, Bell, AlertCircle, ArrowLeft, CreditCard, PenLine, Loader2, AlertTriangle } from 'lucide-react';

interface Props {
  user: string;
  onClose: () => void;
}

export const TemplateManager: React.FC<Props> = ({ user, onClose }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Partial<Template>>({});
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Estado para o modal de confirmação de exclusão
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadTemplates = async () => {
    setIsLoadingData(true);
    const data = await getTemplates(user);
    setTemplates(data);
    setIsLoadingData(false);
  };

  useEffect(() => {
    loadTemplates();
  }, [user]);

  const handleSave = async () => {
    if (!currentTemplate.title || !currentTemplate.content || !currentTemplate.type) return;

    setIsLoadingData(true);
    await saveTemplate(user, currentTemplate);
    await loadTemplates();
    setIsEditing(false);
    setCurrentTemplate({});
    setIsLoadingData(false);
  };

  // Abre o modal de confirmação
  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  // Executa a exclusão de fato
  const handleDelete = async () => {
    if (!deleteId) return;
    setIsLoadingData(true);
    await deleteTemplate(user, deleteId);
    await loadTemplates();
    setDeleteId(null); // Fecha o modal
    setIsLoadingData(false);
  };

  const handleAiGenerate = async () => {
    if (!currentTemplate.type) return;
    setIsLoadingAi(true);
    const text = await generateTemplateMessage(currentTemplate.type);
    setCurrentTemplate(prev => ({ ...prev, content: text }));
    setIsLoadingAi(false);
  };

  const getIconForType = (type: EventType, size: number = 20) => {
    switch (type) {
        case EventType.DUE: return <AlertCircle size={size} strokeWidth={1.5} />;
        case EventType.CLOSING: return <CreditCard size={size} strokeWidth={1.5} />;
        case EventType.PUSH: return <Bell size={size} strokeWidth={1.5} />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative">
      
      {/* Modal de Confirmação de Exclusão */}
      {deleteId && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-white/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 max-w-sm w-full animate-scale-in">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir modelo?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Você tem certeza que deseja remover este modelo? Essa ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-colors text-sm"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto bg-slate-50/50 rounded-3xl relative">
        
        {isLoadingData && !isEditing && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
             <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        )}

        {isEditing ? (
          <div className="max-w-3xl mx-auto mt-8 px-4">
            
            <button 
                onClick={() => { setIsEditing(false); setCurrentTemplate({}); }}
                className="mb-6 flex items-center text-gray-500 hover:text-blue-600 transition-colors font-medium text-sm gap-2 pl-1"
            >
                <div className="p-1.5 rounded-full bg-white border border-gray-200 shadow-sm group-hover:border-blue-200">
                    <ArrowLeft size={16} />
                </div>
                Voltar para lista
            </button>

            <div className="bg-white p-10 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] border border-gray-100 relative">
                {isLoadingData && (
                  <div className="absolute inset-0 bg-white/80 rounded-[2rem] z-10 flex items-center justify-center">
                    <Loader2 className="animate-spin text-blue-500" />
                  </div>
                )}

                <div className="mb-10 text-center">
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                        {currentTemplate.id ? 'Editar Modelo' : 'Criar Novo Modelo'}
                    </h3>
                    <p className="text-gray-500 mt-2 text-sm">Configure os detalhes da mensagem automática</p>
                </div>
                
                <div className="space-y-8">
                  {/* Type Selector */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">Categoria do Evento</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.values(EventType).map(type => {
                        const isSelected = currentTemplate.type === type;
                        
                        // Default Style
                        let containerClass = "flex flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group";
                        let iconClass = "mb-3 text-gray-400 transition-colors";
                        let textClass = "font-medium text-gray-500 text-sm transition-colors";

                        if (isSelected) {
                            if (type === EventType.DUE) {
                                containerClass = "flex flex-col items-center justify-center p-5 rounded-2xl border border-red-200 bg-red-50/50 cursor-pointer shadow-md shadow-red-100 ring-2 ring-red-500 ring-offset-2";
                                iconClass = "mb-3 text-red-500";
                                textClass = "font-bold text-red-700";
                            }
                            if (type === EventType.CLOSING) {
                                containerClass = "flex flex-col items-center justify-center p-5 rounded-2xl border border-amber-200 bg-amber-50/50 cursor-pointer shadow-md shadow-amber-100 ring-2 ring-amber-500 ring-offset-2";
                                iconClass = "mb-3 text-amber-500";
                                textClass = "font-bold text-amber-700";
                            }
                            if (type === EventType.PUSH) {
                                containerClass = "flex flex-col items-center justify-center p-5 rounded-2xl border border-sky-200 bg-sky-50/50 cursor-pointer shadow-md shadow-sky-100 ring-2 ring-sky-500 ring-offset-2";
                                iconClass = "mb-3 text-sky-500";
                                textClass = "font-bold text-sky-700";
                            }
                        } else {
                            containerClass += " bg-white border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-gray-100 cursor-pointer";
                            iconClass += " group-hover:text-blue-500";
                            textClass += " group-hover:text-gray-700";
                        }

                        return (
                            <div
                                key={type}
                                onClick={() => setCurrentTemplate({ ...currentTemplate, type })}
                                className={containerClass}
                            >
                                <div className={iconClass}>{getIconForType(type, 24)}</div>
                                <span className={textClass}>{EVENT_COLORS[type].label.split(' ')[0]}</span>
                            </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Title Input */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Título de Identificação</label>
                    <input 
                      type="text" 
                      value={currentTemplate.title || ''}
                      onChange={e => setCurrentTemplate({ ...currentTemplate, title: e.target.value })}
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-5 py-4 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-base shadow-sm"
                      placeholder="Ex: Fatura Nubank, Aviso de corte..."
                      maxLength={30}
                    />
                  </div>

                  {/* Content Input */}
                  <div>
                    <div className="flex justify-between items-end mb-2 ml-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Conteúdo da Mensagem</label>
                        <button 
                          onClick={handleAiGenerate}
                          disabled={!currentTemplate.type || isLoadingAi}
                          className="text-xs flex items-center gap-1.5 text-blue-600 font-bold hover:text-blue-700 disabled:opacity-50 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Sparkles size={14} />
                          {isLoadingAi ? 'Gerando...' : 'Gerar com IA'}
                        </button>
                    </div>
                    <div className="relative">
                        <textarea 
                        value={currentTemplate.content || ''}
                        onChange={e => setCurrentTemplate({ ...currentTemplate, content: e.target.value })}
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-5 py-4 text-gray-700 placeholder-gray-400 h-40 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none text-base leading-relaxed shadow-sm"
                        placeholder="Digite o texto que será copiado..."
                        />
                        <div className="absolute bottom-4 right-4 text-gray-300 pointer-events-none">
                            <PenLine size={16} />
                        </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4 mt-10 pt-8 border-t border-gray-100">
                  <button 
                    onClick={() => { setIsEditing(false); setCurrentTemplate({}); }}
                    className="px-6 py-3 text-gray-500 font-semibold hover:bg-gray-50 rounded-xl transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={!currentTemplate.type || !currentTemplate.title || !currentTemplate.content}
                    className="px-10 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                  >
                    <Save size={18} strokeWidth={2} />
                    {isLoadingData ? 'Salvando...' : 'Salvar Modelo'}
                  </button>
                </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1600px] mx-auto p-4 md:p-8">
              {/* Add New Card */}
              <button 
                onClick={() => { setIsEditing(true); setCurrentTemplate({ type: EventType.CLOSING }); }}
                className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-300 rounded-[2rem] hover:border-blue-400 hover:bg-blue-50/30 transition-all group min-h-[220px] bg-transparent"
              >
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-gray-100 group-hover:border-blue-200 group-hover:shadow-md">
                  <Plus size={28} className="text-blue-500" strokeWidth={1.5} />
                </div>
                <span className="font-bold text-lg text-gray-700 group-hover:text-blue-700">Novo Modelo</span>
                <span className="text-sm text-gray-400 mt-1">Adicionar template</span>
              </button>

            {templates.map(template => (
              <div 
                key={template.id} 
                onClick={() => { setCurrentTemplate(template); setIsEditing(true); }}
                className="bg-white p-8 rounded-[2rem] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] hover:border-gray-200 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative group flex flex-col min-h-[220px]"
              >
                
                <div className="flex justify-between items-start mb-6">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${EVENT_COLORS[template.type].lightBg} ${EVENT_COLORS[template.type].text} ${EVENT_COLORS[template.type].border} bg-opacity-60 border-opacity-30`}>
                        {getIconForType(template.type, 16)}
                        <span className="truncate max-w-[120px]">{EVENT_COLORS[template.type].label.split(' ')[0]}</span>
                    </div>
                </div>
                
                <h3 className="font-bold text-xl text-gray-900 mb-3 truncate pr-4">{template.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-4 font-medium">
                    {template.content}
                </p>

                <div className="mt-auto flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <span className="text-xs font-bold text-blue-500">Editar Modelo</span>
                    <button 
                        onClick={(e) => confirmDelete(template.id, e)}
                        className="p-2 hover:bg-red-50 rounded-xl text-gray-300 hover:text-red-500 transition-colors"
                        title="Excluir"
                    >
                        <Trash2 size={18} strokeWidth={1.5} />
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};