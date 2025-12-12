import { supabase } from './supabaseClient';
import { CalendarEvent, Template, EventType, TitleColor, getDefaultColorByType } from '../types';

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

const mapTemplate = (item: any): Template => ({
  id: item.id,
  type: item.type,
  title: item.title,
  content: item.content,
  titleColor: (item.title_color as TitleColor | undefined) || getDefaultColorByType(item.type as EventType),
});

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
      { user_id: user, type: EventType.CLOSING, title: 'Fechamento Padrão', content: 'Sua fatura fecha hoje, organize seu limite.', title_color: getDefaultColorByType(EventType.CLOSING) },
      { user_id: user, type: EventType.DUE, title: 'Vencimento Urgente', content: 'Sua fatura vence hoje! Evite juros.', title_color: getDefaultColorByType(EventType.DUE) },
      { user_id: user, type: EventType.PUSH, title: 'Novidade', content: 'Prepare-se! Temos uma novidade chegando em breve.', title_color: getDefaultColorByType(EventType.PUSH) },
    ];
    
    const { data: insertedData, error: insertError } = await supabase
      .from('templates')
      .insert(seeds)
      .select();
      
    if (insertError) console.error('Erro ao criar seeds:', insertError);
    return (insertedData || []).map(mapTemplate);
  }

  return data.map(mapTemplate);
};

export const saveTemplate = async (user: string, template: Partial<Template>) => {
  const payload = {
    user_id: user,
    type: template.type,
    title: template.title,
    content: template.content,
    title_color: template.titleColor || (template.type ? getDefaultColorByType(template.type) : null),
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
  const [{ data, error }, { data: templatesData }] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('user_id', user),
    supabase
      .from('templates')
      .select('id, title_color, type')
      .eq('user_id', user),
  ]);

  if (error) {
    console.error('Erro ao buscar eventos:', error);
    return [];
  }

  const templateColors = new Map<string, { titleColor?: TitleColor; type: EventType }>();
  (templatesData || []).forEach((template: any) => {
    templateColors.set(
      template.id,
      {
        titleColor: template.title_color as TitleColor | undefined,
        type: template.type as EventType,
      }
    );
  });
  
  return (data || []).map((item: any) => {
    const template = item.template_id ? templateColors.get(item.template_id) : undefined;
    const resolvedType = item.type as EventType;
    const resolvedColor = (template?.titleColor as TitleColor | undefined) || getDefaultColorByType(resolvedType);

    return {
      id: item.id,
      date: item.date,
      type: resolvedType,
      title: item.title,
      templateId: item.template_id,
      customContent: item.custom_content,
      order: item.order_index ?? item.order ?? undefined,
      isCompleted: item.is_completed ?? false,
      titleColor: resolvedColor,
    };
  });
};

export const saveEvent = async (user: string, event: CalendarEvent) => {
  const payload = {
    user_id: user,
    date: event.date,
    type: event.type,
    title: event.title,
    template_id: event.templateId,
    custom_content: event.customContent,
    order_index: event.order ?? null,
    is_completed: event.isCompleted ?? false,
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
