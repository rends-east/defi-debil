import React from 'react';
import { Sidebar } from './Sidebar';
import { Workspace } from './Workspace';

export const MainLayout = ({
  currentView,
  portfolio,
  strategies,
  onNewBacktest,
  onAddAsset,
  onRemoveAsset,
  onAssetBalanceChange,
  onAddStrategy,
  onRemoveStrategy,
  onAllocationChange,
  onStrategyAssetChange,
  onStrategyConfigChange,
  onToggleLock,
  onRunBacktest,
}) => {
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      <Sidebar onNewBacktest={onNewBacktest} />
      <div className="flex-1 h-full overflow-hidden relative">
        <Workspace
          currentView={currentView}
          portfolio={portfolio}
          strategies={strategies}
          onAddAsset={onAddAsset}
          onRemoveAsset={onRemoveAsset}
          onAssetBalanceChange={onAssetBalanceChange}
          onAddStrategy={onAddStrategy}
          onRemoveStrategy={onRemoveStrategy}
          onAllocationChange={onAllocationChange}
          onStrategyAssetChange={onStrategyAssetChange}
          onStrategyConfigChange={onStrategyConfigChange}
          onToggleLock={onToggleLock}
          onRunBacktest={onRunBacktest}
        />
      </div>
    </div>
  );
};
