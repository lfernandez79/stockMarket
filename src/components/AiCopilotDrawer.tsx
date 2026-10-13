import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, User, HelpCircle, ChevronRight, MessageSquareText } from 'lucide-react';
import { CopilotMessage, Holding, PortfolioSummary } from '../types';

interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  summary: PortfolioSummary;
  holdings: Holding[];
}

export const AiCopilotDrawer: React.FC<AiCopilotDrawerProps> = ({
  isOpen,
  onClose,
  summary,
  holdings
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: `Hello! I am your AI Financial Copilot. I have full context of your $${summary.totalValue.toLocaleString()} portfolio (${holdings.length} holdings). How can I assist with risk analysis, dividend yield forecasting, or tax strategies today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        'What is my total annual dividend income?',
        'Analyze my top risk exposure',
        'Should I rebalance my cash holdings?'
      ]
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || input.trim();
    if (!query || isLoading) return;

    const userMsg: CopilotMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    fetch('/api/ai/copilot-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: query,
        portfolioContext: {
          totalValue: summary.totalValue,
          dayGain: summary.dayGainLoss,
          dayGainPct: summary.dayGainLossPct,
          holdings
        },
        chatHistory: messages.slice(-6)
      })
    })
      .then((res) => res.json())
      .then((data) => {
        const aiMsg: CopilotMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.reply || 'I analyzed your request against your portfolio holdings.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: data.suggestedActions || []
        };
        setMessages((prev) => [...prev, aiMsg]);
      })
      .catch((err) => {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'ai',
            text: 'I encountered a temporary connection error. Please try again.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-slide-left">
      {/* Drawer Header */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base">Gemini Portfolio Copilot</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                Live AI
              </span>
            </div>
            <p className="text-xs text-slate-400">Institutional Q&A, Tax Tips & Yield Analytics</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 font-semibold">
              {m.sender === 'user' ? (
                <>
                  <span>You</span>
                  <User className="h-3 w-3" />
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-600 font-bold">AI Copilot</span>
                </>
              )}
              <span>• {m.timestamp}</span>
            </div>

            <div
              className={`p-3.5 rounded-2xl max-w-[90%] text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-slate-900 text-white rounded-tr-none'
                  : 'bg-white text-slate-900 border border-slate-200 shadow-sm rounded-tl-none whitespace-pre-line'
              }`}
            >
              {m.text}
            </div>

            {/* Suggested Follow-up Actions */}
            {m.suggestedActions && m.suggestedActions.length > 0 && (
              <div className="mt-2.5 space-y-1.5 w-full pl-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Suggested Actions:
                </span>
                {m.suggestedActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(action)}
                    className="w-full text-left text-xs bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 p-2 rounded-xl border border-slate-200 hover:border-emerald-300 font-medium transition-all flex items-center justify-between group"
                  >
                    <span>{action}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 p-3 bg-white rounded-xl border border-slate-200 w-fit">
            <Sparkles className="h-4 w-4 text-emerald-500 animate-spin" />
            <span>Analyzing portfolio holdings & market metrics...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about NVDA, yield, risk, or rebalancing..."
            className="flex-1 bg-slate-100 text-slate-900 placeholder-slate-400 text-xs rounded-xl px-3.5 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
