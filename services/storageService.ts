import { supabase } from './supabaseClient';
import { CalendarEvent, Template, EventType } from '../types';

// --- Helper para identificar o "usuário" (sessão do navegador) ---
export const getUserId = (): string => {
  let userId = localStorage.getItem('cronos_user_id');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('cronos_user_id', userId);
  }
  return userId;
};

// --- Templates ---

export const getTemplates = async (user: string): Promise<Template[]> => {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('user_id', user);

  if (error) {
    console.error('Erro ao buscar templates:', error);
    return [];
  }
  
  // Se não tiver templates, cria os padrões no banco para este usuário
  if (!data || data.length === 0) {
    const seeds = [
      { user_id: user, type: EventType.CLOSING, title: 'Fechamento Padrão', content: 'Sua fatura fecha hoje, organize seu limite.' },
      { user_id: user, type: EventType.DUE, title: 'Vencimento Urgente', content: 'Sua fatura vence hoje! Evite juros.' },
      { user_id: user, type: EventType.PUSH, title: 'Novidade', content: 'Prepare-se! Temos uma novidade chegando em breve.' },
    ];
    
    const { data: insertedData, error: insertError } = await supabase
      .from('templates')
      .insert(seeds)
      .select();
      
    if (insertError) console.error('Erro ao criar seeds:', insertError);
    return insertedData as Template[] || [];
  }

  return data as Template[];
};

export const saveTemplate = async (user: string, template: Partial<Template>) => {
  const payload = {
    user_id: user,
    type: template.type,
    title: template.title,
    content: template.content
  };

  // Se tem ID longo (UUID), tenta atualizar
  if (template.id && template.id.length > 10) {
    const { error } = await supabase
      .from('templates')
      .update(payload)
      .eq('id', template.id)
      .eq('user_id', user); // RLS redundancy, but safe
    if (error) console.error('Erro ao atualizar template:', error);
  } else {
    // Insert
    const { error } = await supabase
      .from('templates')
      .insert([payload]);
    if (error) console.error('Erro ao criar template:', error);
  }
};

export const deleteTemplate = async (user: string, id: string) => {
  // Simplificado: deleta pelo ID. O RLS do Supabase garante que só deleta se for do usuário.
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', id);
    
  if (error) console.error('Erro ao deletar template:', error);
};

// --- Events ---

export const getEvents = async (user: string): Promise<CalendarEvent[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user);

  if (error) {
    console.error('Erro ao buscar eventos:', error);
    return [];
  }
  
  return data.map((item: any) => ({
    id: item.id,
    date: item.date,
    type: item.type,
    title: item.title,
    templateId: item.template_id,
    customContent: item.custom_content
  }));
};

export const saveEvent = async (user: string, event: CalendarEvent) => {
  const payload = {
    user_id: user,
    date: event.date,
    type: event.type,
    title: event.title,
    template_id: event.templateId,
    custom_content: event.customContent
  };

  if (event.id && event.id.length > 10) {
     const { error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', event.id);
     if (error) console.error('Erro ao atualizar evento:', error);
  } else {
    const { error } = await supabase
      .from('events')
      .insert([payload]);
    if (error) console.error('Erro ao criar evento:', error);
  }
};

export const deleteEvent = async (user: string, id: string) => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (error) console.error('Erro ao deletar evento:', error);
};