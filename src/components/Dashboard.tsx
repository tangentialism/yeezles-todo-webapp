import React, { useCallback, useEffect, useState } from 'react';
import { TopicNavigationContext } from '../hooks/useOpenTopic';
import { PersonNavigationContext } from '../hooks/useOpenPerson';
import Navigation from './Navigation';
import ViewContainer from './ViewContainer';
import AddTodoModal from './AddTodoModal';
import PasskeyManagementModal from './PasskeyManagementModal';
import AccessTokenManagementModal from './AccessTokenManagementModal';
import AccountMenu from './AccountMenu';
import PhoneTabBar from './PhoneTabBar';
import { usePendingProposalCount, useTodayOpenCount } from '../hooks/useNavCounts';
import { useTopicsHandoff } from '../hooks/useTopicsHandoff';
import type { TopicsHandoff } from '../hooks/useTopicsHandoff';
import { PlusIcon } from './ui/Icons';
import { primaryButton } from './ui/styles';
import { NEW_AREA_HIGHLIGHT_MS, VIEW_TRANSITION_DURATION_MS } from '../constants';
import Wordmark from './ui/Wordmark';

/**
 * Main authenticated layout: a single header (wordmark, view tabs, area
 * switcher, New button, account menu) above the multi-view container.
 * Manages view switching with a fade transition, owns the topic open in the
 * Topics view and the person open in the People view (chips open them through
 * TopicNavigationContext and PersonNavigationContext), and coordinates the
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
  const todayCount = useTodayOpenCount();

  const [openTopicId, setOpenTopicId] = useState<number | null>(null);

  const handleViewChange = useCallback((newView: string) => {
    if (newView !== currentView) {
      setIsViewTransitioning(true);

      // Immediate view change with smooth transition
      setCurrentView(newView);

      // End transition after animation completes
      setTimeout(() => {
        setIsViewTransitioning(false);
      }, VIEW_TRANSITION_DURATION_MS); // Match ViewContainer transition duration
    }
  }, [currentView]);

  // A topic chip anywhere in the dashboard opens that topic in the Topics view,
  // through the same path as a tab click (fade transition, scroll save)
  const openTopic = useCallback((topicId: number) => {
    setOpenTopicId(topicId);
    handleViewChange('topics');
  }, [handleViewChange]);

  const [openPersonId, setOpenPersonId] = useState<number | null>(null);

  // A person chip anywhere in the dashboard opens that person in the People view
  const openPerson = useCallback((personId: number) => {
    setOpenPersonId(personId);
    handleViewChange('people');
  }, [handleViewChange]);

  const topicsCount = usePendingProposalCount();
  const [highlightTopicIds, setHighlightTopicIds] = useState<number[]>([]);

  // Back from a proposal review: Topics tab, the proposal's area, new topics lit
  const arriveAtTopics = useCallback((handoff: TopicsHandoff) => {
    setOpenTopicId(null);
    setCurrentView('topics');
    setHighlightTopicIds(handoff.highlightTopicIds ?? []);
  }, []);
  useTopicsHandoff(arriveAtTopics);

  useEffect(() => {
    if (highlightTopicIds.length === 0) return;
    const timer = setTimeout(() => setHighlightTopicIds([]), NEW_AREA_HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlightTopicIds]);

  return (
    <div className="min-h-screen bg-paper">
      <TopicNavigationContext.Provider value={openTopic}>
      <PersonNavigationContext.Provider value={openPerson}>
      {/* Phones: wordmark, area dot and avatar only; views move to the tab bar, New to the round button */}
      <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur">
        <div className="max-w-[1120px] mx-auto pl-5 pr-3 pt-2.5 pb-1 sm:px-10 sm:py-4 flex items-center sm:gap-x-8">
          <Wordmark className="font-serif font-medium text-xl sm:text-[22px] tracking-[-0.01em] text-ink" />

          <div className="flex flex-1 min-w-0">
            <Navigation
              currentView={currentView}
              onViewChange={handleViewChange}
              todayCount={todayCount}
              topicsCount={topicsCount}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className={`${primaryButton} pl-3.5 hidden sm:inline-flex`}
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

      {/* Main content (views pad their own scroll above the phone tab bar) */}
      <main className="max-w-[1120px] mx-auto px-5 sm:px-10 pt-4 sm:pt-6 pb-24">
        <ViewContainer
          currentView={currentView}
          isTransitioning={isViewTransitioning}
          refreshTrigger={refreshTrigger}
          newTodoId={newTodoId}
          onNewTodoAnimationComplete={() => setNewTodoId(null)}
          openTopicId={openTopicId}
          onOpenTopic={openTopic}
          onCloseTopic={() => setOpenTopicId(null)}
          highlightTopicIds={highlightTopicIds}
          openPersonId={openPersonId}
          onOpenPerson={openPerson}
          onClosePerson={() => setOpenPersonId(null)}
        />
      </main>

      {/* Phones only: round New button above the tab bar */}
      <button
        type="button"
        onClick={() => setIsAddModalOpen(true)}
        aria-label="New todo"
        className="sm:hidden fixed right-5 z-20 w-14 h-14 rounded-full bg-ink text-paper inline-flex items-center justify-center shadow-fab hover:bg-ink-2 transition-colors"
        style={{ bottom: 'calc(74px + max(10px, env(safe-area-inset-bottom)))' }}
      >
        <PlusIcon className="w-[22px] h-[22px]" />
      </button>

      <PhoneTabBar
        currentView={currentView}
        onViewChange={handleViewChange}
        todayCount={todayCount}
        topicsCount={topicsCount}
      />
      </PersonNavigationContext.Provider>
      </TopicNavigationContext.Provider>

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
