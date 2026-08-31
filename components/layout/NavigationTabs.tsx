'use client';
import React from 'react';
import {
  LayoutDashboard,
  History,
  Target,
  BarChart3,
} from 'lucide-react';
import { TabType } from '@/types';

interface NavigationTabsProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  darkMode: boolean;
}

export function NavigationTabs({
  activeTab,
  onChangeTab,
  darkMode,
}: NavigationTabsProps) {
  const tabs: {
    id: TabType;
    labelMobile: string;
    labelDesktop: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'actual',
      labelMobile: 'Mes Actual',
      labelDesktop: 'Mes Actual',
      icon: <LayoutDashboard size={18} className="shrink-0" />,
    },
    {
      id: 'historial',
      labelMobile: 'Historial',
      labelDesktop: 'Historial',
      icon: <History size={18} className="shrink-0" />,
    },
    {
      id: 'presupuestos',
      labelMobile: 'Presupuestos',
      labelDesktop: 'Presupuestos',
      icon: <Target size={18} className="shrink-0" />,
    },
    {
      id: 'analiticas',
      labelMobile: 'Evolución',
      labelDesktop: 'Evolución',
      icon: <BarChart3 size={18} className="shrink-0" />,
    },
  ];

  return (
    <nav
      className={`p-1 sm:p-1.5 rounded-2xl mb-5 w-full transition-all box-border ${
        darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-200/80'
      }`}
      aria-label="Pestañas de navegación"
    >
      <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-center sm:gap-2">
        {tabs.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChangeTab(t.id)}
              className={`sm:flex-1 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer ${
                isActive
                  ? darkMode
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-300'
                  : darkMode
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              {t.icon}
              {/* Etiqueta para celulares */}
              <span className="sm:hidden text-[10px] tracking-tight leading-tight whitespace-nowrap">
                {t.labelMobile}
              </span>
              {/* Etiqueta completa para tablets y escritorio */}
              <span className="hidden sm:inline text-xs whitespace-nowrap">
                {t.labelDesktop}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
