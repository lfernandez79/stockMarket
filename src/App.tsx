import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { PortfolioOverview } from './components/PortfolioOverview';
import { PerformanceChart } from './components/PerformanceChart';
import { HoldingsTable } from './components/HoldingsTable';
import { AllocationChart } from './components/AllocationChart';
import { AlertsManager } from './components/AlertsManager';
import { FidelityImporter } from './components/FidelityImporter';
import { AddEditPositionModal } from './components/AddEditPositionModal';
import { LiveToastContainer } from './components/LiveToastContainer';
import { AiPortfolioInsights } from './components/AiPortfolioInsights';
import { AiCopilotDrawer } from './components/AiCopilotDrawer';
import { StockDetailModal } from './components/StockDetailModal';

import { MarketNewsFeed } from './components/MarketNewsFeed';
import { WelcomeModal } from './components/WelcomeModal';

import { Holding, AlertRule, TriggeredAlert, ThemeMode } from './types';
import { INITIAL_HOLDINGS, INITIAL_ALERT_RULES, GENERATE_HISTORICAL_DATA } from './data/initialPortfolio';
import { generateRandomSampleHoldings } from './utils/sampleGenerator';
import { calculatePortfolioSummary, simulateMarketTick, evaluateAlertRules, fetchLiveMarketQuotes, calculateForwardYield, getKnownDividendRate, getKnownDividendYield } from './utils/marketEngine';
import { playAlertChime } from './utils/audioChime';
import { useLiveTicks, LiveTick } from './hooks/useLiveTicks';

export default function App() {
  // Holdings state with localStorage persistence and automatic dividend migration
  const [holdings, setHoldings] = useState<Holding[]>(() => {
    const saved = localStorage.getItem('fidelity_holdings');
    if (!saved) return [];
    try {
      const parsed: Holding[] = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return [];
      return parsed.map((h) => {
        const annualRate = h.annualDividendRate ?? getKnownDividendRate(h.symbol, h.currentPrice, h.assetType);
        const divYield = calculateForwardYield(annualRate, h.currentPrice, h.symbol, h.assetType);
        return {
          ...h,
          annualDividendRate: annualRate,
          dividendYield: divYield,
          extendedMetrics: h.extendedMetrics ? {
            ...h.extendedMetrics,
            yieldPct: divYield
          } : undefined
        };
      });
    } catch {
      return [];
    }
  });

  // Alert Rules state
  const [alertRules, setAlertRules] = useState<AlertRule[]>(() => {
    const saved = localStorage.getItem('fidelity_alert_rules');
    return saved ? JSON.parse(saved) : INITIAL_ALERT_RULES;
  });

  // Triggered Alerts Feed state
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>(() => {
    const saved = localStorage.getItem('fidelity_triggered_alerts');
    return saved ? JSON.parse(saved) : [];
  });

  const holdingsRef = useRef<Holding[]>(holdings);
  const alertRulesRef = useRef<AlertRule[]>(alertRules);
  const triggeredAlertsRef = useRef<TriggeredAlert[]>(triggeredAlerts);

  // Live Toast Notifications Stack
  const [activeToasts, setActiveToasts] = useState<TriggeredAlert[]>([]);

  // Historical data points
  const [historicalData, setHistoricalData] = useState(GENERATE_HISTORICAL_DATA(0));

  // Welcome / First Time User Onboarding Modal
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(() => {
    const saved = localStorage.getItem('fidelity_holdings');
    return !saved || saved === '[]';
  });

  // Real-time market tick engine settings & Data Provider
  const [isLiveUpdating, setIsLiveUpdating] = useState(true);
  const [dataProvider, setDataProvider] = useState<'yahoo' | 'simulated'>('yahoo');
  const [updateInterval, setUpdateInterval] = useState(5000);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(new Date().toLocaleTimeString());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [isAiInsightsOpen, setIsAiInsightsOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [selectedStockDetail, setSelectedStockDetail] = useState<Holding | null>(null);

  // Keep stock detail modal reactive to live tick updates
  const activeStockDetail = selectedStockDetail 
    ? (holdings.find((h) => h.symbol === selectedStockDetail.symbol) || selectedStockDetail)
    : null;

  // Active view section ('dashboard' vs 'alerts')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'alerts'>('dashboard');

  // Theme selection state with localStorage persistence
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('fidelity_theme');
    return (saved as ThemeMode) || 'slate';
  });

  useEffect(() => {
    localStorage.setItem('fidelity_theme', theme);
    const root = document.documentElement;
    root.classList.remove('theme-slate', 'theme-dark', 'theme-emerald', 'theme-midnight', 'theme-editorial');
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  // Save to localStorage & update ref
  useEffect(() => {
    holdingsRef.current = holdings;
    localStorage.setItem('fidelity_holdings', JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    alertRulesRef.current = alertRules;
    localStorage.setItem('fidelity_alert_rules', JSON.stringify(alertRules));
  }, [alertRules]);

  useEffect(() => {
    triggeredAlertsRef.current = triggeredAlerts;
    localStorage.setItem('fidelity_triggered_alerts', JSON.stringify(triggeredAlerts));
  }, [triggeredAlerts]);

  const fetchLiveQuotesNow = async (overrideHoldings?: Holding[]) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const targetHoldings = overrideHoldings || holdingsRef.current;
      if (!targetHoldings || targetHoldings.length === 0) return;

      const res = await fetchLiveMarketQuotes(targetHoldings);
      setLastSyncTime(new Date().toLocaleTimeString());

      setHoldings((latestHoldings) => {
        // If overrideHoldings was explicitly provided (e.g. fresh CSV import), set directly
        if (overrideHoldings) {
          return res.updatedHoldings;
        }
        // Otherwise, map live price updates onto current holdings so we never drop newly added/imported stocks
        return latestHoldings.map((h) => {
          const updated = res.updatedHoldings.find((u) => u.id === h.id || u.symbol.toUpperCase() === h.symbol.toUpperCase());
          if (!updated) return h;
          return {
            ...h,
            currentPrice: updated.currentPrice,
            previousClose: updated.previousClose,
            dayHigh: updated.dayHigh,
            dayLow: updated.dayLow,
            '52WeekHigh': updated['52WeekHigh'],
            '52WeekLow': updated['52WeekLow'],
            volume: updated.volume,
            dividendYield: updated.dividendYield ?? h.dividendYield ?? getKnownDividendYield(h.symbol, h.assetType),
            lastTickDirection: updated.lastTickDirection,
            sparkline: updated.sparkline
          };
        });
      });

      // Evaluate alert rules against new tick using latest refs
      const newlyTriggered = evaluateAlertRules(
        res.updatedHoldings,
        alertRulesRef.current,
        triggeredAlertsRef.current
      );
      if (newlyTriggered.length > 0) {
        if (soundEnabled) {
          newlyTriggered.forEach((trig) => playAlertChime(trig.severity));
        }
        setTriggeredAlerts((prevHistory) => {
          const combined = [...newlyTriggered, ...prevHistory];
          triggeredAlertsRef.current = combined;
          return combined;
        });
        setActiveToasts((prevToasts) => [...newlyTriggered, ...prevToasts]);
      }
    } catch (err) {
      console.error('Failed to update live quotes:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial live market fetch on mount
  useEffect(() => {
    if (dataProvider === 'yahoo') {
      fetchLiveQuotesNow();
    }
  }, []);

  // Apply real-time trade ticks (WebSocket streaming) onto holdings.
  // Ticks carry price only — full quote fields still come from the REST poll.
  const applyTicks = useCallback((ticks: LiveTick[]) => {
    if (ticks.length === 0) return;
    const bySymbol = new Map(ticks.map((t) => [t.symbol.toUpperCase(), t]));
    setHoldings((prev) =>
      prev.map((h) => {
        const tick = bySymbol.get(h.symbol.toUpperCase());
        if (!tick) return h;
        const prevPrice = h.currentPrice;
        return {
          ...h,
          currentPrice: tick.price,
          dayHigh: h.dayHigh != null ? Math.max(h.dayHigh, tick.price) : tick.price,
          dayLow: h.dayLow != null ? Math.min(h.dayLow, tick.price) : tick.price,
          lastTickDirection:
            tick.price > prevPrice ? 'up' : tick.price < prevPrice ? 'down' : h.lastTickDirection,
          sparkline: [...h.sparkline.slice(-29), tick.price],
        };
      })
    );
    setLastSyncTime(new Date().toLocaleTimeString());
  }, []);

  const holdingSymbols = holdings.map((h) => h.symbol);
  const streamState = useLiveTicks(
    holdingSymbols,
    isLiveUpdating && dataProvider === 'yahoo',
    applyTicks
  );

  // Compute overall summary
  const summary = calculatePortfolioSummary(holdings);

  // Live Market Auto Refresh Loop
  // When streaming, REST polling slows to 60s (ticks carry prices; the poll
  // refreshes everything else and covers non-streamed symbols like mutual funds).
  useEffect(() => {
    if (!isLiveUpdating) return;

    const pollInterval = streamState === 'streaming' ? 60000 : updateInterval;
    const timer = setInterval(() => {
      if (dataProvider === 'yahoo') {
        fetchLiveQuotesNow();
      } else {
        setHoldings((prevHoldings) => {
          const nextHoldings = simulateMarketTick(prevHoldings);
          const newlyTriggered = evaluateAlertRules(
            nextHoldings,
            alertRulesRef.current,
            triggeredAlertsRef.current
          );

          if (newlyTriggered.length > 0) {
            if (soundEnabled) {
              newlyTriggered.forEach((trig) => playAlertChime(trig.severity));
            }
            setTriggeredAlerts((prevHistory) => {
              const combined = [...newlyTriggered, ...prevHistory];
              triggeredAlertsRef.current = combined;
              return combined;
            });
            setActiveToasts((prevToasts) => [...newlyTriggered, ...prevToasts]);
          }

          return nextHoldings;
        });
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    }, pollInterval);

    return () => clearInterval(timer);
  }, [isLiveUpdating, updateInterval, soundEnabled, dataProvider, streamState]);

  // Manual Refresh Handler
  const handleManualRefresh = () => {
    if (dataProvider === 'yahoo') {
      fetchLiveQuotesNow();
    } else {
      setHoldings((prev) => simulateMarketTick(prev));
      setLastSyncTime(new Date().toLocaleTimeString());
    }
  };

  // Holding CRUD Handlers
  const handleSavePosition = (positionData: Partial<Holding>) => {
    if (positionData.id) {
      // Edit existing
      setHoldings((prev) => prev.map((h) => {
        if (h.id !== positionData.id) return h;
        const divYield = positionData.dividendYield !== undefined && positionData.dividendYield !== null
          ? positionData.dividendYield
          : (h.dividendYield ?? getKnownDividendYield(positionData.symbol || h.symbol, positionData.assetType || h.assetType));
        return {
          ...h,
          ...positionData,
          dividendYield: divYield
        } as Holding;
      }));
    } else {
      // Add new
      const sym = (positionData.symbol || 'NVDA').toUpperCase();
      const aType = positionData.assetType || 'Stock';
      const divYield = positionData.dividendYield !== undefined && positionData.dividendYield !== null
        ? positionData.dividendYield
        : getKnownDividendYield(sym, aType);

      // Market fields stay null until the quote poller fills them from the
      // provider — never fall back to invented numbers.
      const newHolding: Holding = {
        id: `hold-${Date.now()}`,
        symbol: sym,
        name: positionData.name || sym,
        shares: positionData.shares || 10,
        costBasisPerShare: positionData.costBasisPerShare || 100,
        currentPrice: positionData.currentPrice || 100,
        previousClose: positionData.previousClose ?? null,
        dayHigh: positionData.dayHigh ?? null,
        dayLow: positionData.dayLow ?? null,
        '52WeekHigh': positionData['52WeekHigh'] ?? null,
        '52WeekLow': positionData['52WeekLow'] ?? null,
        volume: positionData.volume ?? null,
        marketCap: positionData.marketCap ?? null,
        dividendYield: divYield,
        accountType: positionData.accountType || 'Fidelity Individual Brokerage',
        assetType: aType,
        purchaseDate: positionData.purchaseDate || new Date().toISOString().split('T')[0],
        sparkline: positionData.sparkline ?? [],
        lastTickDirection: 'up'
      };
      setHoldings((prev) => [newHolding, ...prev]);
    }
  };

  const handleDeleteHolding = (id: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  };

  const handleImportHoldings = (imported: Holding[]) => {
    holdingsRef.current = imported;
    setHoldings(imported);
    localStorage.setItem('fidelity_holdings', JSON.stringify(imported));
    setIsImportModalOpen(false);
    setIsWelcomeModalOpen(false);
    fetchLiveQuotesNow(imported);
  };

  const handleLoadSampleData = () => {
    const randomized = generateRandomSampleHoldings();
    holdingsRef.current = randomized;
    setHoldings(randomized);
    localStorage.setItem('fidelity_holdings', JSON.stringify(randomized));
    setIsWelcomeModalOpen(false);
    fetchLiveQuotesNow(randomized);
  };

  const handleResetData = () => {
    if (window.confirm('Wipe and reset all portfolio data? This will clear all holdings and alert logs so you can start fresh.')) {
      holdingsRef.current = [];
      setHoldings([]);
      localStorage.removeItem('fidelity_holdings');
      localStorage.removeItem('fidelity_alert_rules');
      localStorage.removeItem('fidelity_triggered_alerts');
      setTriggeredAlerts([]);
      setIsWelcomeModalOpen(true);
    }
  };

  // Rule Handlers
  const handleAddRule = (newRule: Omit<AlertRule, 'id' | 'createdDate'>) => {
    const created: AlertRule = {
      ...newRule,
      id: `rule-${Date.now()}`,
      createdDate: new Date().toISOString().split('T')[0]
    };
    setAlertRules((prev) => [created, ...prev]);
  };

  const handleToggleRule = (ruleId: string) => {
    setAlertRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)));
  };

  const handleDeleteRule = (ruleId: string) => {
    setAlertRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  // Triggered Alerts Feed Handlers
  const handleMarkAlertRead = (alertId: string) => {
    setTriggeredAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)));
  };

  const handleClearAlert = (alertId: string) => {
    setTriggeredAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const handleClearAllAlerts = () => {
    setTriggeredAlerts([]);
  };

  // Create alert rule specifically for a stock from Holdings table
  const handleCreateStockAlert = (holding: Holding) => {
    const createdRule: AlertRule = {
      id: `rule-${Date.now()}`,
      title: `${holding.symbol} Target Price Watch`,
      type: 'STOCK_PRICE_HIGH',
      symbol: holding.symbol,
      thresholdValue: Number((holding.currentPrice * 1.05).toFixed(2)),
      enabled: true,
      severity: 'gain',
      createdDate: new Date().toISOString().split('T')[0],
      soundEnabled: true,
      notes: `Alert when ${holding.symbol} gains 5% above current price ($${holding.currentPrice.toFixed(2)}).`
    };
    setAlertRules((prev) => [createdRule, ...prev]);
    setActiveTab('alerts');
  };

  // Test Trigger Rule
  const handleTestTriggerAlert = (rule: AlertRule) => {
    const testAlert: TriggeredAlert = {
      id: `trig-test-${Date.now()}`,
      ruleId: rule.id,
      title: `[TEST TRIGGER] ${rule.title}`,
      description: `Test alert for ${rule.symbol || 'Portfolio'}. Rule threshold (${rule.type.includes('PCT') ? `${rule.thresholdValue}%` : `$${rule.thresholdValue}`}) evaluated successfully.`,
      symbol: rule.symbol,
      triggeredPrice: rule.symbol ? holdings.find((h) => h.symbol === rule.symbol)?.currentPrice : undefined,
      severity: rule.severity,
      triggeredAt: new Date().toISOString(),
      read: false
    };

    if (soundEnabled) playAlertChime(rule.severity);
    setTriggeredAlerts((prev) => [testAlert, ...prev]);
    setActiveToasts((prev) => [testAlert, ...prev]);
  };

  // Explain alert using Gemini AI endpoint
  const handleExplainAlertWithAi = async (alertItem: TriggeredAlert) => {
    try {
      const res = await fetch('/api/ai/explain-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertTitle: alertItem.title,
          alertDescription: alertItem.description,
          symbol: alertItem.symbol,
          currentPrice: alertItem.triggeredPrice
        })
      });

      if (!res.ok) throw new Error('AI Server response error');

      const data = await res.json();
      const explanation = data.explanation || 'Catalyst analysis completed.';

      setTriggeredAlerts((prev) =>
        prev.map((a) => (a.id === alertItem.id ? { ...a, aiExplanation: explanation, read: true } : a))
      );
    } catch (err) {
      console.error('Error fetching AI alert explanation:', err);
      // Offline fallback explanation
      const fallback = `Market Catalyst Analysis for ${alertItem.symbol || 'Portfolio'}:\n\n1. Recent trading volume & tech momentum created price volatility breaking threshold.\n2. Long-term Fidelity outlook remains strong with dollar-cost averaging in index funds.\n3. Recommendation: Monitor stop loss levels and verify account allocation balances.`;
      setTriggeredAlerts((prev) =>
        prev.map((a) => (a.id === alertItem.id ? { ...a, aiExplanation: fallback, read: true } : a))
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Sticky Header */}
      <Header
        holdings={holdings}
        isLiveUpdating={isLiveUpdating}
        setIsLiveUpdating={setIsLiveUpdating}
        lastSyncTime={lastSyncTime}
        streamState={streamState}
        isRefreshing={isRefreshing}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        triggeredAlerts={triggeredAlerts}
        onOpenAlerts={() => setActiveTab('alerts')}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenAiInsights={() => setIsAiInsightsOpen(true)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onManualRefresh={handleManualRefresh}
        onOpenWelcomeModal={() => setIsWelcomeModalOpen(true)}
        onResetData={handleResetData}
      />

      {/* Primary Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition-all ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Portfolio Dashboard
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'alerts'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>Real-Time Alerts</span>
            {triggeredAlerts.filter((a) => !a.read).length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                {triggeredAlerts.filter((a) => !a.read).length}
              </span>
            )}
          </button>
        </div>

        {/* VIEW 1: Main Portfolio Dashboard */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Overview Metric Cards */}
            <PortfolioOverview summary={summary} holdingsCount={holdings.length} holdings={holdings} />

            {/* Performance Historical Area Chart */}
            <PerformanceChart 
              data={historicalData} 
              currentPortfolioValue={summary.totalValue} 
              dayGainLoss={summary.dayGainLoss}
              dayGainLossPct={summary.dayGainLossPct}
              totalCostBasis={summary.totalCostBasis}
            />

            {/* Owned Holdings Table */}
            <HoldingsTable
              holdings={holdings}
              totalPortfolioValue={summary.totalValue}
              onEditHolding={(h) => {
                setEditingHolding(h);
                setIsAddEditModalOpen(true);
              }}
              onDeleteHolding={handleDeleteHolding}
              onCreateStockAlert={handleCreateStockAlert}
              onOpenAddModal={() => {
                setEditingHolding(null);
                setIsAddEditModalOpen(true);
              }}
              onSelectStockDetail={(h) => setSelectedStockDetail(h)}
            />

            {/* Live Market Catalysts & News Feed */}
            <MarketNewsFeed portfolioSymbols={holdings.map((h) => h.symbol)} />

            {/* Allocation Donut Visualizer */}
            <AllocationChart holdings={holdings} totalValue={summary.totalValue} />
          </div>
        )}

        {/* VIEW 2: Real-Time Performance Alerts Center */}
        {activeTab === 'alerts' && (
          <AlertsManager
            rules={alertRules}
            triggeredAlerts={triggeredAlerts}
            holdings={holdings}
            onAddRule={handleAddRule}
            onToggleRule={handleToggleRule}
            onDeleteRule={handleDeleteRule}
            onMarkAlertRead={handleMarkAlertRead}
            onClearAlert={handleClearAlert}
            onClearAllAlerts={handleClearAllAlerts}
            onTestTriggerAlert={handleTestTriggerAlert}
            onExplainAlertWithAi={handleExplainAlertWithAi}
          />
        )}
      </main>

      {/* Modals & Dialogs */}
      <WelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
        onImportHoldings={handleImportHoldings}
        onLoadSampleData={handleLoadSampleData}
        onOpenAddModal={() => {
          setEditingHolding(null);
          setIsAddEditModalOpen(true);
        }}
      />

      <FidelityImporter
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportHoldings={handleImportHoldings}
      />

      <AddEditPositionModal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        onSave={handleSavePosition}
        initialHolding={editingHolding}
      />

      <AiPortfolioInsights
        isOpen={isAiInsightsOpen}
        onClose={() => setIsAiInsightsOpen(false)}
        holdings={holdings}
        summary={summary}
      />

      <AiCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        summary={summary}
        holdings={holdings}
      />

      {/* Stock / ETF Interactive Detail Modal */}
      {activeStockDetail && (
        <StockDetailModal
          holding={activeStockDetail}
          onClose={() => setSelectedStockDetail(null)}
        />
      )}

      {/* Floating Real-Time Alert Toasts */}
      <LiveToastContainer
        toasts={activeToasts}
        onCloseToast={(id) => setActiveToasts((prev) => prev.filter((t) => t.id !== id))}
        onExplainToast={(alertItem) => {
          handleExplainAlertWithAi(alertItem);
          setActiveTab('alerts');
        }}
      />
    </div>
  );
}
