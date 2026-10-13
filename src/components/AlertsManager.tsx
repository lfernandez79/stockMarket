import React, { useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles, 
  Plus, 
  Trash2, 
  Power, 
  Volume2, 
  VolumeX, 
  Zap, 
  ShieldAlert, 
  Info,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { AlertRule, TriggeredAlert, AlertType, AlertSeverity, Holding } from '../types';

interface AlertsManagerProps {
  rules: AlertRule[];
  triggeredAlerts: TriggeredAlert[];
  holdings: Holding[];
  onAddRule: (rule: Omit<AlertRule, 'id' | 'createdDate'>) => void;
  onToggleRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onMarkAlertRead: (alertId: string) => void;
  onClearAlert: (alertId: string) => void;
  onClearAllAlerts: () => void;
  onTestTriggerAlert: (rule: AlertRule) => void;
  onExplainAlertWithAi: (alert: TriggeredAlert) => void;
}

export const AlertsManager: React.FC<AlertsManagerProps> = ({
  rules,
  triggeredAlerts,
  holdings,
  onAddRule,
  onToggleRule,
  onDeleteRule,
  onMarkAlertRead,
  onClearAlert,
  onClearAllAlerts,
  onTestTriggerAlert,
  onExplainAlertWithAi
}) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'rules'>('feed');
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  // Form state for creating new rule
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<AlertType>('STOCK_PRICE_HIGH');
  const [newSymbol, setNewSymbol] = useState(holdings[0]?.symbol || 'NVDA');
  const [newThreshold, setNewThreshold] = useState<number>(140);
  const [newSeverity, setNewSeverity] = useState<AlertSeverity>('gain');
  const [newSound, setNewSound] = useState(true);
  const [newNotes, setNewNotes] = useState('');

  const unreadCount = triggeredAlerts.filter((a) => !a.read).length;

  const filteredAlerts = triggeredAlerts.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  const handleSubmitNewRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newThreshold) return;

    onAddRule({
      title: newTitle,
      type: newType,
      symbol: newType.startsWith('STOCK_') ? newSymbol : undefined,
      thresholdValue: Number(newThreshold),
      enabled: true,
      severity: newSeverity,
      soundEnabled: newSound,
      notes: newNotes
    });

    // Reset form
    setNewTitle('');
    setShowAddModal(false);
  };

  return (
    <div className="theme-card bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
      {/* Header & Navigation */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500 animate-pulse" /> Real-Time Portfolio Performance Alerts
            </h3>
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-full animate-bounce">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Set custom threshold triggers for daily portfolio drops, target price breakouts, and intraday volatility
          </p>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'feed'
                  ? 'bg-white text-emerald-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Alert Feed ({triggeredAlerts.length})
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'rules'
                  ? 'bg-white text-emerald-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active Rules ({rules.length})
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Alert Rule</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Triggered Alerts Feed */}
      {activeTab === 'feed' && (
        <div className="p-5">
          {/* Feed Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Filter Severity:</span>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Alerts</option>
                <option value="critical">Critical Drop</option>
                <option value="warning">Warning</option>
                <option value="gain">Target Reached</option>
                <option value="info">Info</option>
              </select>
            </div>

            {triggeredAlerts.length > 0 && (
              <button
                onClick={onClearAllAlerts}
                className="text-xs text-slate-400 hover:text-rose-600 transition-colors font-medium flex items-center gap-1 self-end sm:self-auto"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear All Alert History
              </button>
            )}
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-700">No Performance Alerts Triggered Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Your portfolio is being actively monitored in real time. When stock prices cross your custom thresholds, alerts will appear here with instant AI analysis.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border transition-all ${
                    !alert.read ? 'bg-amber-50/40 border-amber-300 shadow-sm' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Severity Icon */}
                      <div className="mt-0.5 shrink-0">
                        {alert.severity === 'critical' ? (
                          <ShieldAlert className="h-5 w-5 text-rose-600" />
                        ) : alert.severity === 'warning' ? (
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                        ) : alert.severity === 'gain' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Info className="h-5 w-5 text-blue-600" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{alert.title}</h4>
                          {alert.symbol && (
                            <span className="font-mono text-xs font-extrabold px-1.5 py-0.5 bg-slate-900 text-white rounded">
                              {alert.symbol}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(alert.triggeredAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 font-mono">{alert.description}</p>

                        {/* AI Explanation Accordion / Section */}
                        {alert.aiExplanation && (
                          <div className="mt-3 p-3 bg-purple-50/80 border border-purple-200 rounded-lg text-xs text-purple-900 space-y-2">
                            <div className="font-bold flex items-center gap-1.5 text-purple-800">
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Gemini AI Market Catalyst Analysis:
                            </div>
                            <p className="whitespace-pre-line text-purple-950 font-sans leading-relaxed">
                              {alert.aiExplanation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                      {!alert.aiExplanation && (
                        <button
                          onClick={() => onExplainAlertWithAi(alert)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-xs font-semibold transition-all"
                          title="Generate AI market explanation for this alert"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          <span>Explain with AI</span>
                        </button>
                      )}

                      {!alert.read && (
                        <button
                          onClick={() => onMarkAlertRead(alert.id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium"
                        >
                          Mark Read
                        </button>
                      )}

                      <button
                        onClick={() => onClearAlert(alert.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Dismiss Alert"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Rules List */}
      {activeTab === 'rules' && (
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`p-4 rounded-xl border transition-all ${
                  rule.enabled ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleRule(rule.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        rule.enabled ? 'bg-emerald-50 border-emerald-300 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}
                      title={rule.enabled ? 'Rule Enabled' : 'Rule Disabled'}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {rule.title}
                        {rule.symbol && (
                          <span className="font-mono text-xs px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200">
                            {rule.symbol}
                          </span>
                        )}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Threshold: {rule.type.includes('PCT') || rule.type.includes('LOSS') ? `${rule.thresholdValue}%` : `$${rule.thresholdValue}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onTestTriggerAlert(rule)}
                      className="flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold transition-all"
                      title="Simulate this alert right now to test chime and notification toast"
                    >
                      <Zap className="h-3 w-3 fill-amber-500" /> Test
                    </button>
                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      title="Delete Rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{rule.notes || 'No notes provided.'}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
                  <span>Created: {rule.createdDate}</span>
                  <span className="flex items-center gap-1 font-medium">
                    {rule.soundEnabled ? <Volume2 className="h-3 w-3 text-emerald-600" /> : <VolumeX className="h-3 w-3 text-slate-400" />}
                    {rule.soundEnabled ? 'Chime On' : 'Silent'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Create New Alert Rule */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" /> Create Custom Portfolio Alert
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewRule} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alert Rule Title</label>
                <input
                  type="text"
                  placeholder="e.g. NVDA Breakout Target"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alert Target Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as AlertType)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="STOCK_PRICE_HIGH">Stock Price Target (High)</option>
                    <option value="STOCK_PRICE_LOW">Stock Price Stop (Low)</option>
                    <option value="STOCK_DAY_CHANGE_PCT">Stock Day Change %</option>
                    <option value="PORTFOLIO_DAILY_LOSS">Portfolio Daily Loss %</option>
                    <option value="PORTFOLIO_DAILY_GAIN">Portfolio Daily Gain %</option>
                  </select>
                </div>

                {newType.startsWith('STOCK_') && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target Ticker</label>
                    <select
                      value={newSymbol}
                      onChange={(e) => setNewSymbol(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono"
                    >
                      {holdings.map((h) => (
                        <option key={h.id} value={h.symbol}>{h.symbol} - {h.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Threshold Value ({newType.includes('PCT') || newType.includes('LOSS') || newType.includes('GAIN') ? 'Percentage %' : 'Target Price $'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(parseFloat(e.target.value))}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Severity Style</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as AlertSeverity)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="gain">Gain Milestone (Emerald)</option>
                    <option value="warning">Warning Pullback (Amber)</option>
                    <option value="critical">Critical Drop (Red)</option>
                    <option value="info">Informational (Blue)</option>
                  </select>
                </div>

                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSound}
                      onChange={(e) => setNewSound(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-400 h-4 w-4"
                    />
                    <span>Play Chime Sound</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Rationale</label>
                <textarea
                  rows={2}
                  placeholder="Optional strategy notes..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm"
                >
                  Create Alert Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
