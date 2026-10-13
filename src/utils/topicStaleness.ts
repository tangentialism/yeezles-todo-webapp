import type { TopicWithCounts } from '../types/topic';
import { TOPIC_STALE_DAYS } from '../constants';

const DAY_MS = 86_400_000;

/**
 * A topic is stale when it still has open todos and its status note was last
 * updated more than {@link TOPIC_STALE_DAYS} days ago. A topic with no note
 * is never stale; the card says "No status note yet" instead.
 */
export const isStale = (
  topic: Pick<TopicWithCounts, 'open_count' | 'status_note' | 'status_note_updated_at'>,
  now: Date
): boolean => {
  if (topic.open_count <= 0 || !topic.status_note || !topic.status_note_updated_at) return false;
  const updated = new Date(topic.status_note_updated_at).getTime();
  if (Number.isNaN(updated)) return false;
  return now.getTime() - updated > TOPIC_STALE_DAYS * DAY_MS;
};
