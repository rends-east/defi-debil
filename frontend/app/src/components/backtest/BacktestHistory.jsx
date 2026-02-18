import React from 'react';
import { History } from 'lucide-react';

export const BacktestHistory = () => {
  // TODO: In the future, this will fetch from backend
  // const [history, setHistory] = useState([]);
  // const [isLoading, setIsLoading] = useState(true);

  // For now, always show empty state
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <History className="h-8 w-8 mb-2 opacity-50" />
      <p className="text-sm text-center">History is empty</p>
      <p className="text-xs text-center mt-1">Create your first backtest</p>
    </div>
  );
};
