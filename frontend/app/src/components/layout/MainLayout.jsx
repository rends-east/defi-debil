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
  historyMode,
  historyResult,
  onLoadHistory,
  workspaceKey,
}) => {
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      <Sidebar onNewBacktest={onNewBacktest} onLoadHistory={onLoadHistory} />
      <div className="flex-1 h-full overflow-hidden relative">
        <Workspace
          key={workspaceKey}
          currentView={currentView}
          portfolio={portfolio}
          strategies={strategies}
          historyMode={historyMode}
          historyResult={historyResult}
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
