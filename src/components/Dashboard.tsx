import React, { useState } from 'react';
import Navigation from './Navigation';
import ViewContainer from './ViewContainer';
import AddTodoModal from './AddTodoModal';
import PasskeyManagementModal from './PasskeyManagementModal';
import AccessTokenManagementModal from './AccessTokenManagementModal';
import AccountMenu from './AccountMenu';
import { PlusIcon } from './ui/Icons';
import { primaryButton } from './ui/styles';
import { VIEW_TRANSITION_DURATION_MS } from '../constants';

/**
 * Main authenticated layout: a single header (wordmark, view tabs, area
 * switcher, New button, account menu) above the multi-view container.
 * Manages view switching with a fade transition and coordinates the
 * "Add Todo" modal with entrance animation for new todos.
 */
const Dashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPasskeyModalOpen, setIsPasskeyModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [newTodoId, setNewTodoId] = useState<number | null>(null);
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);

  const handleViewChange = (newView: string) => {
    if (newView !== currentView) {
      setIsViewTransitioning(true);
      
      // Immediate view change with smooth transition
      setCurrentView(newView);
      
      // End transition after animation completes
      setTimeout(() => {
        setIsViewTransitioning(false);
      }, VIEW_TRANSITION_DURATION_MS); // Match ViewContainer transition duration
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-10 py-3 sm:py-4 flex flex-wrap items-center gap-x-8 gap-y-2">
          <span className="font-serif font-medium text-[22px] tracking-[-0.01em] text-ink">Yeezles</span>

          {/* Phones: tabs and area pill wrap to a second row under the wordmark and actions */}
          <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1 flex min-w-0">
            <Navigation currentView={currentView} onViewChange={handleViewChange} />
          </div>

          <div className="ml-auto sm:ml-0 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className={`${primaryButton} pl-3.5`}
            >
              <PlusIcon className="w-4 h-4" />
              New
            </button>

            <AccountMenu
              onManagePasskeys={() => setIsPasskeyModalOpen(true)}
              onManageTokens={() => setIsTokenModalOpen(true)}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1120px] mx-auto px-4 sm:px-10 pt-6 pb-24">
        <ViewContainer
          currentView={currentView}
          isTransitioning={isViewTransitioning}
          refreshTrigger={refreshTrigger}
          newTodoId={newTodoId}
          onNewTodoAnimationComplete={() => setNewTodoId(null)}
        />
      </main>

      {/* Add Todo Modal */}
      <AddTodoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTodoAdded={(newId) => {
          if (newId) {
            setNewTodoId(newId);
          }
          setRefreshTrigger(prev => prev + 1);
        }}
        currentView={currentView}
      />

      {/* Passkey Management Modal */}
      <PasskeyManagementModal
        isOpen={isPasskeyModalOpen}
        onClose={() => setIsPasskeyModalOpen(false)}
      />

      {/* Access Token Management Modal */}
      <AccessTokenManagementModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
