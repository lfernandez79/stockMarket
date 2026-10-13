import React from 'react';
import { 
  TrendingUp, 
  Bell, 
  PlusCircle, 
  Bot, 
  Menu, 
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { TriggeredAlert } from '../types';

interface MobileBottomNavProps {
  activeTab: 'dashboard' | 'alerts';
  setActiveTab: (tab: 'dashboard' | 'alerts') => void;
  triggeredAlerts: TriggeredAlert[];
  onOpenAddModal: () => void;
  onOpenCopilot: () => void;
  onOpenMobileMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  triggeredAlerts,
  onOpenAddModal,
  onOpenCopilot,
  onOpenMobileMenu
}) => {
  const unreadAlertsCount = triggeredAlerts.filter((a) => !a.read).length;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-400 px-2 py-1.5 shadow-2xl safe-area-inset-bottom">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Tab 1: Portfolio Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all ${
            activeTab === 'dashboard'
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Portfolio</span>
        </button>

        {/* Tab 2: Alerts */}
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex flex-col items-center justify-center w-16 py-1 rounded-xl transition-all relative ${
            activeTab === 'alerts'
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Bell className="h-5 w-5 mb-0.5" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-extrabold h-4 w-4 rounded-full flex items-center justify-center border border-slate-900 animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Alerts</span>
        </button>

        {/* Center Action: + Add Position */}
        <button
          onClick={onOpenAddModal}
          className="flex flex-col items-center justify-center -mt-4 group"
          title="Add New Position"
        >
          <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/60 border-2 border-slate-900 group-active:scale-95 transition-transform">
            <PlusCircle className="h-6 w-6 text-white" />
          </div>
          <span className="text-[10px] font-bold text-slate-300 mt-0.5">Add</span>
        </button>

        {/* Tab 3: AI Copilot */}
        <button
          onClick={onOpenCopilot}
          className="flex flex-col items-center justify-center w-16 py-1 rounded-xl text-slate-400 hover:text-emerald-400 transition-all group"
        >
          <Bot className="h-5 w-5 mb-0.5 group-hover:text-emerald-400 text-slate-300" />
          <span className="text-[10px] tracking-tight">Copilot</span>
        </button>

        {/* Tab 4: More Actions Menu */}
        <button
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center w-16 py-1 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
        >
          <Menu className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
};
