'use client';

import { useEffect, useState } from 'react';
import { logsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { FileText, Filter, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [methodFilter, setMethodFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await logsApi.getUetdsLogs({ page, limit: 30, onlyErrors, methodName: methodFilter || undefined });
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch { toast.error('Loglar yüklenemedi'); }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page, onlyErrors, methodFilter]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <FileText size={24} className="text-emerald-400" /> UETDS Logları
      </h1>

      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }} className="input-field w-auto min-w-[180px]">
          <option value="">Tüm Metodlar</option>
          <option value="seferEkle">seferEkle</option>
          <option value="yolcuEkleCoklu">yolcuEkleCoklu</option>
          <option value="personelEkle">personelEkle</option>
          <option value="seferGrupEkle">seferGrupEkle</option>
          <option value="bildirimOzeti">bildirimOzeti</option>
          <option value="seferIptal">seferIptal</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input type="checkbox" checked={onlyErrors} onChange={(e) => { setOnlyErrors(e.target.checked); setPage(1); }} className="accent-emerald-500" />
          Sadece Hatalar
        </label>
        <span className="text-sm text-slate-500 ml-auto">{total} kayıt</span>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
                  <th className="px-4 py-3">Zaman</th>
                  <th className="px-4 py-3">Metod</th>
                  <th className="px-4 py-3">Sonuç</th>
                  <th className="px-4 py-3">Mesaj</th>
                  <th className="px-4 py-3">Ref No</th>
                  <th className="px-4 py-3">Süre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-700/20 transition">
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('tr-TR')}</td>
                    <td className="px-4 py-3 text-sm font-mono text-cyan-300">{log.methodName}</td>
                    <td className="px-4 py-3">
                      {log.resultCode === 0 ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 size={13} /> Başarılı</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle size={13} /> Kod: {log.resultCode}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-[200px] truncate">{log.resultMessage}</td>
                    <td className="px-4 py-3 text-sm text-slate-300 font-mono">{log.referenceNumber || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{log.responseTimeMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
