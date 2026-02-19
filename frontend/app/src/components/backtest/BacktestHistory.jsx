import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getHistory, getHistoryDetail } from '../../lib/api';
import { Clock, TrendingUp, TrendingDown, RefreshCcw, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const BacktestHistory = ({ onLoadHistory }) => {
  const { isAuthenticated, user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  const fetchHistory = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await getHistory();
      setHistory(data);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    
    // Set up an interval to refresh history periodically or listen to events
    // For now, simple poll every 30s
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const handleLoad = async (item) => {
    setLoadingId(item.id);
    try {
      // 1. Fetch full details (re-run simulation on backend)
      const result = await getHistoryDetail(item.id);
      
      // 2. Pass data to parent to update Workspace
      onLoadHistory(item, result);
    } catch (error) {
      console.error("Failed to load history details:", error);
    } finally {
      setLoadingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-xs text-center px-4">
        <p>Connect wallet to view history</p>
      </div>
    );
  }

  if (loading && history.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-xs text-center px-4">
        <Clock className="w-8 h-8 mb-2 opacity-50" />
        <p>No backtests run yet.</p>
        <p>Create your first strategy!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {history.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="group relative bg-gray-50 hover:bg-white border border-gray-100 hover:border-blue-200 rounded-xl p-3 transition-all cursor-pointer shadow-sm hover:shadow-md"
            onClick={() => handleLoad(item)}
          >
            <div className="flex justify-between items-start mb-2">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-white font-semibold">
                {item.type}
              </Badge>
              <span className="text-[10px] text-gray-400 font-medium">
                {formatDate(item.timestamp)}
              </span>
            </div>
            
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-medium">PnL</p>
                <div className={`text-sm font-bold flex items-center gap-1 ${item.summary.final_pnl_usd >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {item.summary.final_pnl_usd >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  ${Math.abs(item.summary.final_pnl_usd).toFixed(2)}
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase font-medium">ROI</p>
                <p className={`text-xs font-bold ${item.summary.roi_percentage >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {item.summary.roi_percentage > 0 ? '+' : ''}{item.summary.roi_percentage.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Loading Overlay */}
            {loadingId === item.id && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-10">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
