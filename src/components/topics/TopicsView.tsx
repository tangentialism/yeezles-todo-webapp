import React, { useMemo, useState } from 'react';
import { useArea } from '../../contexts/AreaContext';
import { useTopics } from '../../hooks/useTopicStore';
import { isStale } from '../../utils/topicStaleness';
import type { TopicWithCounts } from '../../types/topic';
import type { Area } from '../../types/area';
import { ViewEmpty, ViewError, ViewHeader, ViewLoading } from '../ViewChrome';
import { ChevronDownIcon, PlusIcon } from '../ui/Icons';
import { outlineButton, sectionCap } from '../ui/styles';
import TopicCard from './TopicCard';
import TopicDetail from './TopicDetail';
import NewTopicDialog from './NewTopicDialog';

/** Props for {@link TopicsView}. */
export interface TopicsViewProps {
  /** The topic shown in detail, or null for the list. */
  openTopicId: number | null;
  onOpenTopic: (id: number) => void;
  onCloseTopic: () => void;
}

const GRID = 'grid grid-cols-1 sm:grid-cols-2 gap-3';

/**
 * The Topics tab (spec §5.1). For one area: a card grid of active topics. On
 * All areas: one section per area that has topics. Archived topics sit in a
 * collapsed section. Detail replaces the list in place and loads by id, so it
 * survives an area switch.
 */
const TopicsView: React.FC<TopicsViewProps> = ({ openTopicId, onOpenTopic, onCloseTopic }) => {
  const { areas, currentArea } = useArea();
  const { data: topics = [], isLoading, error, refetch, isRefetching } = useTopics({
    areaId: currentArea?.id ?? null,
    includeArchived: true,
  });
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const now = new Date();

  const areaById = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);
  // A specific area shows only its own topics; the query already scopes by
  // area, this keeps the view correct regardless of what the cache holds.
  const inScope = currentArea ? topics.filter((t) => t.area_id === currentArea.id) : topics;
  const active = inScope.filter((t) => !t.archived);
  const archived = inScope.filter((t) => t.archived);
  const staleCount = active.filter((t) => isStale(t, now)).length;

  if (openTopicId !== null) {
    return <TopicDetail topicId={openTopicId} onBack={onCloseTopic} />;
  }

  const card = (topic: TopicWithCounts) => (
    <TopicCard key={topic.id} topic={topic} color={areaById.get(topic.area_id)?.color} now={now} onOpen={onOpenTopic} />
  );

  const sections: Array<{ area: Area; topics: TopicWithCounts[] }> = currentArea
    ? []
    : areas.map((area) => ({ area, topics: active.filter((t) => t.area_id === area.id) })).filter((s) => s.topics.length > 0);

  return (
    <div>
      <ViewHeader
        title="Topics"
        dotColor={currentArea?.color}
        totals={[
          { value: active.length, label: 'active' },
          { value: staleCount, label: 'stale', tone: staleCount ? 'accent' : undefined },
        ]}
        onRefresh={() => refetch()}
        isRefreshing={isRefetching}
        refreshLabel="Refresh topics"
      />

      <div className="flex justify-end pt-4">
        <button type="button" onClick={() => setIsNewOpen(true)} className={outlineButton}>
          <PlusIcon className="w-4 h-4" />
          New topic
        </button>
      </div>

      {isLoading ? (
        <ViewLoading label="Loading topics..." />
      ) : error ? (
        <ViewError title="Error loading topics" message={error instanceof Error ? error.message : 'Please try again.'} onRetry={() => refetch()} />
      ) : active.length === 0 && archived.length === 0 ? (
        <ViewEmpty title="No topics yet." message="Create one, or ask Claude to propose some." />
      ) : (
        <div className="pt-4 flex flex-col gap-7">
          {currentArea ? (
            <div className={GRID}>{active.map(card)}</div>
          ) : (
            sections.map(({ area, topics: inArea }) => (
              <section key={area.id} aria-label={area.name}>
                <h2 className={`${sectionCap} flex items-center gap-2 mb-2.5`}>
                  <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ backgroundColor: area.color }} />
                  {area.name}
                </h2>
                <div className={GRID}>{inArea.map(card)}</div>
              </section>
            ))
          )}

          {archived.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                aria-expanded={showArchived}
                className={`${sectionCap} inline-flex items-center gap-1.5`}
              >
                {`Archived (${archived.length})`}
                <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${showArchived ? 'rotate-180' : ''}`} />
              </button>
              {showArchived && <div className={`${GRID} mt-2.5 opacity-70`}>{archived.map(card)}</div>}
            </section>
          )}
        </div>
      )}

      {isNewOpen && (
        <NewTopicDialog
          defaultAreaId={currentArea?.id ?? null}
          onClose={() => setIsNewOpen(false)}
          onCreated={() => setIsNewOpen(false)}
        />
      )}
    </div>
  );
};

export default TopicsView;
