'use client';

import { useState, useEffect } from 'react';
import { Building2, CarFront, CheckCircle2, ChevronDown, ChevronUp, CreditCard, CalendarDays, Loader2 } from 'lucide-react';
import api from '@/lib/api';

type PaymentStatus = 'PAID' | 'UNPAID';

interface ExternalDriver {
  driverId: string;
  name: string;
  tcKimlikNo: string | null;
  paymentStatus: PaymentStatus;
  paymentId: string | null;
  note: string;
  note: string;
}

interface TenantBilling {
  tenantId: string;
  companyName: string;
  paymentStatus: PaymentStatus;
  paymentId: string | null;
  externalDrivers: ExternalDriver[];
}


interface NoteInputProps {
  initialNote: string;
  tenantId: string;
  driverId?: string;
  month: number;
  year: number;
  onSaveSuccess: () => void;
}

function NoteInput({ initialNote, tenantId, driverId, month, year, onSaveSuccess }: NoteInputProps) {
  const [note, setNote] = useState(initialNote);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNote(initialNote);
  }, [initialNote]);

  const handleSave = async () => {
    if (note === initialNote) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/admin/billing/note', {
        tenantId,
        driverId,
        month: Number(month),
        year: Number(year),
        note
      });
      onSaveSuccess();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save note', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 max-w-full">
      {isEditing ? (
        <div className="flex items-center gap-1.5 w-full">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Not yazın..."
            autoFocus
            className="w-full text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 focus:ring-1 focus:ring-emerald-500 theme-text max-w-[200px]"
          />
          {isSaving && <Loader2 size={12} className="animate-spin text-slate-400" />}
        </div>
      ) : (
        <div 
          onClick={() => setIsEditing(true)}
          className="group flex items-center gap-1.5 cursor-pointer max-w-full text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <span className="truncate max-w-[200px]">
            {note ? '📝 ' + note : '➕ Not ekle'}
          </span>
        </div>
      )}
    </div>
  );
}

export default function BillingPage()
 {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<TenantBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTenants, setExpandedTenants] = useState<Record<string, boolean>>({});

  const months = [
    { value: 1, label: 'Ocak' }, { value: 2, label: 'Şubat' }, { value: 3, label: 'Mart' },
    { value: 4, label: 'Nisan' }, { value: 5, label: 'Mayıs' }, { value: 6, label: 'Haziran' },
    { value: 7, label: 'Temmuz' }, { value: 8, label: 'Ağustos' }, { value: 9, label: 'Eylül' },
    { value: 10, label: 'Ekim' }, { value: 11, label: 'Kasım' }, { value: 12, label: 'Aralık' }
  ];

  const years = [2024, 2025, 2026, 2027, 2028];

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/billing?month=${currentMonth}&year=${currentYear}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch billing data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [currentMonth, currentYear]);

  const togglePayment = async (tenantId: string, driverId: string | undefined, currentStatus: PaymentStatus) => {
    const newStatus: PaymentStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
    try {
      await api.post('/admin/billing/toggle', {
        tenantId,
        driverId,
        month: currentMonth,
        year: currentYear,
        status: newStatus
      });
      fetchBillingData();
    } catch (error) {
      console.error('Failed to toggle payment', error);
    }
  };

  const toggleExpand = (tenantId: string) => {
    setExpandedTenants(prev => ({ ...prev, [tenantId]: !prev[tenantId] }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 theme-text">
            <CreditCard className="text-emerald-500" />
            Abonelik & Ödeme Takibi
          </h1>
          <p className="text-sm theme-text-soft mt-1">
            Firmaların ve dış şoförlerin aylık aidat ödemelerini yönetin.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 bg-[rgb(var(--surface-elevated-rgb))] p-2 rounded-2xl shadow-sm border theme-border">
          <CalendarDays size={18} className="text-slate-400 ml-2" />
          <select 
            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer theme-text py-1"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(Number(e.target.value))}
          >
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select 
            className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer theme-text py-1"
            value={currentYear}
            onChange={(e) => setCurrentYear(Number(e.target.value))}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-emerald-500" size={32} />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-[rgb(var(--surface-rgb))] rounded-3xl border theme-border shadow-sm">
          Bu dönem için kayıtlı firma bulunamadı.
        </div>
      ) : (
        <div className="space-y-4">
          {data.map(tenant => {
            const isExpanded = expandedTenants[tenant.tenantId];
            const hasExternal = tenant.externalDrivers && tenant.externalDrivers.length > 0;
            
            return (
              <div key={tenant.tenantId} className="bg-[rgb(var(--surface-rgb))] rounded-3xl border theme-border shadow-sm overflow-hidden transition-all">
                
                {/* Tenant Main Row */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[linear-gradient(to_right,rgb(var(--surface-elevated-rgb))_0%,transparent_100%)]">
                  
                  {/* Tenant Info & Expand Toggle */}
                  <div className="flex items-center gap-3 flex-1" onClick={() => hasExternal && toggleExpand(tenant.tenantId)}>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shrink-0">
                      <Building2 size={24} />
                    </div>
                    <div className="flex-1 cursor-pointer">
                      <h3 className="font-bold text-lg leading-tight theme-text">{tenant.companyName}</h3>
                      <p className="text-xs theme-text-soft mt-0.5 flex items-center gap-1">
                        Ana Firma Aboneliği 
                        {hasExternal && <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 font-semibold ml-2">{tenant.externalDrivers.length} Alt Şoför</span>}
                      </p>
                      <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                        <NoteInput 
                          initialNote={tenant.note || ''} 
                          tenantId={tenant.tenantId} 
                          month={currentMonth} 
                          year={currentYear} 
                          onSaveSuccess={fetchBillingData} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Toggle Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 theme-border pt-4 sm:pt-0">
                    <button
                      onClick={() => togglePayment(tenant.tenantId, undefined, tenant.paymentStatus)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-sm active:scale-95 ${
                        tenant.paymentStatus === 'PAID' 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-500/5 hover:text-emerald-500'
                      }`}
                    >
                      {tenant.paymentStatus === 'PAID' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300 dark:border-slate-600" />}
                      {tenant.paymentStatus === 'PAID' ? 'ÖDENDİ' : 'ÖDENMEDİ'}
                    </button>

                    {/* Mobile Expand Icon */}
                    {hasExternal && (
                      <button onClick={() => toggleExpand(tenant.tenantId)} className="p-2 bg-[rgb(var(--surface-elevated-rgb))] rounded-full text-slate-500 sm:hidden shadow-sm">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-users / External Drivers (Collapsible) */}
                {hasExternal && (
                  <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden bg-[rgb(var(--surface-elevated-rgb))]`}>
                    <div className="p-4 sm:px-6 space-y-3 border-t theme-border">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Dışarıdan Bağlı Alt Şoförler</h4>
                      {tenant.externalDrivers.map(driver => (
                        <div key={driver.driverId} className="flex items-center justify-between p-3 sm:p-4 bg-[rgb(var(--surface-rgb))] rounded-2xl border theme-border shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                              <CarFront size={18} />
                            </div>
                            <div>
                              <p className="font-semibold text-sm theme-text">{driver.name}</p>
                              <p className="text-xs text-slate-500 mb-1">{driver.tcKimlikNo || 'TC Yok'}</p>
                              <NoteInput 
                                initialNote={driver.note || ''} 
                                tenantId={tenant.tenantId} 
                                driverId={driver.driverId} 
                                month={currentMonth} 
                                year={currentYear} 
                                onSaveSuccess={fetchBillingData} 
                              />
                            </div>
                          </div>
                          
                          <button
                            onClick={() => togglePayment(tenant.tenantId, driver.driverId, driver.paymentStatus)}
                            className={`flex items-center justify-center w-10 h-10 sm:w-auto sm:px-4 rounded-xl text-xs font-bold transition-all active:scale-90 ${
                              driver.paymentStatus === 'PAID' 
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {driver.paymentStatus === 'PAID' ? <CheckCircle2 size={18} /> : <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-400" />}
                            <span className="hidden sm:inline-block sm:ml-2">
                              {driver.paymentStatus === 'PAID' ? 'ÖDENDİ' : 'ÖDENMEDİ'}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Desktop Expand Bar */}
                {hasExternal && !isExpanded && (
                  <div 
                    onClick={() => toggleExpand(tenant.tenantId)}
                    className="hidden sm:flex items-center justify-center py-2 bg-[rgb(var(--surface-elevated-rgb))] border-t theme-border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs font-medium text-slate-400"
                  >
                    Alt şoförleri göster <ChevronDown size={14} className="ml-1" />
                  </div>
                )}
                {hasExternal && isExpanded && (
                  <div 
                    onClick={() => toggleExpand(tenant.tenantId)}
                    className="hidden sm:flex items-center justify-center py-2 bg-[rgb(var(--surface-elevated-rgb))] border-t theme-border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs font-medium text-slate-400"
                  >
                    Kapat <ChevronUp size={14} className="ml-1" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
