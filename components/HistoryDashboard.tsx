import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock3, Plus, Trash2, RefreshCcw } from 'lucide-react';
import { CalendarEvent, EventType, ManualReportEntry } from '../types';
import { deleteManualReport, getManualReports, saveManualReport } from '../services/storageService';

interface HistoryDashboardProps {
  userId: string;
  events: CalendarEvent[];
  onReload?: () => void;
}

export const HistoryDashboard: React.FC<HistoryDashboardProps> = ({ userId, events, onReload }) => {
  const [manualReports, setManualReports] = useState<ManualReportEntry[]>([]);
  const [title, setTitle] = useState('');
  const [count, setCount] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingManuals, setIsLoadingManuals] = useState(false);

  const loadManuals = async () => {
    setIsLoadingManuals(true);
    const data = await getManualReports(userId);
    setManualReports(data);
    setIsLoadingManuals(false);
  };

  useEffect(() => {
    loadManuals();
  }, [userId]);

  const pushEvents = useMemo(
    () => events.filter(event => event.type === EventType.PUSH),
    [events]
  );

  const manualTotal = useMemo(
    () => manualReports.reduce((sum, item) => sum + (Number(item.count) || 0), 0),
    [manualReports]
  );

  const groupedByTitle = useMemo(() => {
    const map = new Map<string, { pushCount: number; manualCount: number }>();

    pushEvents.forEach(event => {
      const key = event.title || 'Sem título';
      const value = map.get(key) || { pushCount: 0, manualCount: 0 };
      value.pushCount += 1;
      map.set(key, value);
    });

    manualReports.forEach(entry => {
      const key = entry.title || 'Sem título';
      const value = map.get(key) || { pushCount: 0, manualCount: 0 };
      value.manualCount += Number(entry.count) || 0;
      map.set(key, value);
    });

    return Array.from(map.entries())
      .map(([groupTitle, data]) => ({
        title: groupTitle,
        pushCount: data.pushCount,
        manualCount: data.manualCount,
        total: data.pushCount + data.manualCount,
      }))
      .sort((a, b) => b.total - a.total);
  }, [pushEvents, manualReports]);

  const timeline = useMemo(() => {
    const merge = [
      ...events.map(event => ({
        id: event.id,
        type: event.type === EventType.PUSH ? 'push' : 'calendar',
        date: event.date,
        title: event.title,
        desc: event.customContent,
      })),
      ...manualReports.map(entry => ({
        id: entry.id,
        type: 'manual',
        date: entry.createdAt,
        title: entry.title,
        desc: `${entry.count} envios registrados manualmente`,
      }))
    ];

    return merge
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);
  }, [events, manualReports]);

  const handleAddManual = async () => {
    const trimmed = title.trim();
    if (!trimmed || count <= 0) return;

    setIsSaving(true);
    const entry: ManualReportEntry = {
      id: crypto.randomUUID(),
      title: trimmed,
      count,
      createdAt: new Date().toISOString(),
    };

    await saveManualReport(userId, entry);
    await loadManuals();
    setTitle('');
    setCount(1);
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    await deleteManualReport(userId, id);
    await loadManuals();
  };

  const handleReloadAll = async () => {
    await loadManuals();
    if (onReload) onReload();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Histórico consolidado</p>
          <h2 className="text-3xl font-semibold text-slate-900">Dashboard de Envios e Atividades</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReloadAll}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm disabled:opacity-50"
            disabled={isLoadingManuals}
          >
            <RefreshCcw size={16} className={isLoadingManuals ? 'animate-spin' : ''} />
            Atualizar dados
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-sky-100 bg-sky-50 text-sky-900 shadow-sm p-5">
          <p className="text-xs uppercase font-semibold text-sky-700/80">Push enviados</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{pushEvents.length}</span>
            <span className="text-xs text-sky-700/80">total</span>
          </div>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-900 shadow-sm p-5">
          <p className="text-xs uppercase font-semibold text-indigo-700/80">Atividades do calendário</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{events.length}</span>
            <span className="text-xs text-indigo-700/80">eventos</span>
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-900 shadow-sm p-5">
          <p className="text-xs uppercase font-semibold text-emerald-700/80">Títulos de push</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{new Set(pushEvents.map(e => e.title)).size}</span>
            <span className="text-xs text-emerald-700/80">únicos</span>
          </div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 text-amber-900 shadow-sm p-5">
          <p className="text-xs uppercase font-semibold text-amber-700/80">Lançamentos manuais</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{manualTotal}</span>
            <span className="text-xs text-amber-700/80">envios</span>
          </div>
        </div>
      </div>

      {/* Grouped by title */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-500" />
            <h3 className="text-lg font-semibold text-slate-900">Agrupamento por título</h3>
          </div>
          <p className="text-sm text-slate-500">Ex.: “Fechamento de fatura”</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-2">Título</th>
                <th className="py-2">Push registrados</th>
                <th className="py-2">Lançamentos manuais</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupedByTitle.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">Nenhum envio registrado ainda.</td>
                </tr>
              )}
              {groupedByTitle.map(group => (
                <tr key={group.title} className="text-sm">
                  <td className="py-3 font-semibold text-slate-900">{group.title}</td>
                  <td className="py-3 text-slate-600">{group.pushCount}</td>
                  <td className="py-3 text-slate-600">{group.manualCount}</td>
                  <td className="py-3 font-semibold text-slate-900">{group.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual entry form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock3 size={18} className="text-emerald-500" />
            <h3 className="text-lg font-semibold text-slate-900">Adicionar lançamento manual</h3>
          </div>
          <p className="text-sm text-slate-500">Agrupe qualquer evento extra não vindo do calendário.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs uppercase font-semibold text-slate-500">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Fechamento de fatura"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
            />
          </div>
          <div>
            <label className="text-xs uppercase font-semibold text-slate-500">Qtd. de envios</label>
            <input
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleAddManual}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-60"
          >
            <Plus size={16} />
            Registrar lançamento
          </button>
        </div>

        {manualReports.length > 0 && (
          <div className="mt-6">
            <p className="text-xs uppercase font-semibold text-slate-500 mb-2">Lançamentos manuais</p>
            <div className="space-y-2">
              {manualReports.map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.count} envios • {new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-slate-400 hover:text-red-500"
                    title="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock3 size={18} className="text-indigo-500" />
          <h3 className="text-lg font-semibold text-slate-900">Linha do tempo recente</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {timeline.length === 0 && (
            <p className="text-slate-400 text-sm py-4 text-center">Nenhum registro encontrado.</p>
          )}
          {timeline.map(item => (
            <div key={item.id} className="flex items-start gap-3 py-3">
              <span
                className={`mt-1 h-2.5 w-2.5 rounded-full ${
                  item.type === 'push'
                    ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.4)]'
                    : item.type === 'manual'
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.4)]'
                }`}
              ></span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{new Date(item.date).toLocaleString()}</p>
                {item.desc && <p className="text-sm text-slate-600 mt-1">{item.desc}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
