import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, RefreshCw, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { NewsArticle } from '../types';

interface MarketNewsFeedProps {
  portfolioSymbols: string[];
}

export const MarketNewsFeed: React.FC<MarketNewsFeedProps> = ({ portfolioSymbols }) => {
  const uniqueSymbols = Array.from(new Set(portfolioSymbols.filter(Boolean)));
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSymbol, setActiveSymbol] = useState<string>(uniqueSymbols[0] || 'SPY');

  // Keep activeSymbol updated if portfolio changes and activeSymbol is no longer present
  useEffect(() => {
    if (uniqueSymbols.length > 0 && !uniqueSymbols.includes(activeSymbol)) {
      setActiveSymbol(uniqueSymbols[0]);
    } else if (uniqueSymbols.length === 0) {
      setActiveSymbol('SPY');
    }
  }, [portfolioSymbols]);

  const fetchNews = (sym: string) => {
    if (!sym) return;
    setIsLoading(true);
    fetch(`/api/market/news?symbol=${encodeURIComponent(sym)}`)
      .then((res) => res.json())
      .then((data) => {
        setArticles(data.articles || []);
      })
      .catch((err) => console.error('Failed to fetch news:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (activeSymbol) {
      fetchNews(activeSymbol);
    }
  }, [activeSymbol]);

  return (
    <div className="theme-card bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm mb-6">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-indigo-600" /> Market Catalysts & Live News
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time news feed & AI catalyst sentiment analysis across all {uniqueSymbols.length} portfolio holdings
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchNews(activeSymbol)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh News"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* All Holdings Ticker Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Holdings:</span>
          {uniqueSymbols.map((sym) => (
            <button
              key={sym}
              onClick={() => setActiveSymbol(sym)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeSymbol === sym
                  ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
          <Sparkles className="h-4 w-4 text-indigo-500 animate-spin" />
          <span>Fetching market articles for {activeSymbol}...</span>
        </div>
      ) : articles.length === 0 ? (
        <div className="py-6 text-center text-slate-500 text-xs">
          No recent articles found for {activeSymbol}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {articles.map((article) => (
            <div
              key={article.id}
              className="p-4 bg-slate-50/90 hover:bg-slate-100/90 rounded-xl border border-slate-200/80 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                      {article.publisher}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">{article.publishedAt}</span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                      article.sentiment === 'bullish'
                        ? 'bg-emerald-100 text-emerald-800'
                        : article.sentiment === 'bearish'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {article.sentiment === 'bullish' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : article.sentiment === 'bearish' ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : null}
                    {article.sentiment?.toUpperCase()}
                  </span>
                </div>

                <a
                  href={article.link}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-slate-900 text-sm hover:text-indigo-600 line-clamp-2 transition-colors group flex items-start justify-between gap-2"
                >
                  <span className="leading-snug">{article.title}</span>
                  <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 shrink-0 mt-0.5" />
                </a>

                {article.summary && (
                  <p className="text-xs text-slate-600 mt-2.5 line-clamp-4 leading-relaxed">
                    {article.summary}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
