import { useCallback, useState } from 'react';

/**
 * Keeps a form's topic consistent with its area (spec §5.4): choosing a topic
 * sets the area to the topic's; moving the area away from the topic's clears
 * the topic and raises the "Topic cleared" hint.
 *
 * @param areaId - The form's current area (null for Auto / None).
 * @param setAreaId - The form's area setter.
 */
export const useTopicSelection = (areaId: number | null, setAreaId: (id: number | null) => void) => {
  const [topicId, setTopicId] = useState<number | null>(null);
  const [topicAreaId, setTopicAreaId] = useState<number | null>(null);
  const [cleared, setCleared] = useState(false);

  const selectTopic = useCallback(
    (nextTopicId: number | null, nextTopicAreaId: number | null) => {
      setTopicId(nextTopicId);
      setTopicAreaId(nextTopicId === null ? null : nextTopicAreaId);
      setCleared(false);
      if (nextTopicId !== null && nextTopicAreaId !== null && nextTopicAreaId !== areaId) {
        setAreaId(nextTopicAreaId);
      }
    },
    [areaId, setAreaId]
  );

  const changeArea = useCallback(
    (nextAreaId: number | null) => {
      setAreaId(nextAreaId);
      if (topicId !== null && nextAreaId !== topicAreaId) {
        setTopicId(null);
        setTopicAreaId(null);
        setCleared(true);
      }
    },
    [setAreaId, topicId, topicAreaId]
  );

  const reset = useCallback((nextTopicId: number | null, nextTopicAreaId: number | null) => {
    setTopicId(nextTopicId);
    setTopicAreaId(nextTopicId === null ? null : nextTopicAreaId);
    setCleared(false);
  }, []);

  return { topicId, cleared, selectTopic, changeArea, reset };
};
