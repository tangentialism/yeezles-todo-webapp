import React, { useState } from 'react';
import { useArea } from '../../contexts/AreaContext';
import { useTopics } from '../../hooks/useTopicStore';
import type { TopicRef } from '../../types/topic';
import { fieldHint, fieldInput, fieldLabel, fieldOptional } from '../ui/styles';
import NewTopicDialog from './NewTopicDialog';

/** Props for {@link TopicPicker}. */
interface TopicPickerProps {
  id: string;
  /** The form's area; null (Auto / None) lists every area's topics, grouped. */
  areaId: number | null;
  value: number | null;
  /** Reports the topic and its area; (null, null) for None. */
  onChange: (topicId: number | null, topicAreaId: number | null) => void;
  /** The todo's current topic, kept listed even if archived (edit form). */
  currentTopic?: TopicRef | null;
  /** Show "Topic cleared: topics belong to one area." */
  showCleared?: boolean;
  disabled?: boolean;
}

const NONE = '';
const NEW = '__new__';

/**
 * The topic field on todo forms (spec §5.4): a native select, so phones get
 * their own picker. With an area: None, that area's active topics, New
 * topic…. Without: every active topic in an optgroup per area.
 */
const TopicPicker: React.FC<TopicPickerProps> = ({ id, areaId, value, onChange, currentTopic, showCleared = false, disabled }) => {
  const { areas } = useArea();
  const { data: topics = [] } = useTopics({ areaId: null, includeArchived: false });
  const [isCreating, setIsCreating] = useState(false);

  const areaOf = new Map(topics.map((t) => [t.id, t.area_id]));
  const inArea = (aid: number) => topics.filter((t) => t.area_id === aid);
  const listed = areaId === null ? topics : inArea(areaId);
  const extra = currentTopic && value === currentTopic.id && !listed.some((t) => t.id === currentTopic.id) ? currentTopic : null;

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = event.target.value;
    if (raw === NEW) {
      setIsCreating(true);
      return;
    }
    if (raw === NONE) {
      onChange(null, null);
      return;
    }
    const topicId = Number(raw);
    onChange(topicId, areaOf.get(topicId) ?? areaId);
  };

  return (
    <div>
      {/* "optional" sits beside the label, not inside it, so the control's accessible name is just "Topic". */}
      <div className={fieldLabel}>
        <label htmlFor={id}>Topic</label> <span className={fieldOptional}>optional</span>
      </div>
      <select id={id} value={value === null ? NONE : String(value)} onChange={handleChange} disabled={disabled} className={fieldInput}>
        <option value={NONE}>None</option>
        {extra && <option value={String(extra.id)}>{`${extra.name} (archived)`}</option>}
        {areaId === null
          ? areas
              .filter((area) => inArea(area.id).length > 0)
              .map((area) => (
                <optgroup key={area.id} label={area.name}>
                  {inArea(area.id).map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              ))
          : listed.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
        <option value={NEW}>New topic…</option>
      </select>
      {showCleared && <p className={fieldHint}>Topic cleared: topics belong to one area.</p>}
      {isCreating && (
        <NewTopicDialog
          defaultAreaId={areaId}
          onClose={() => setIsCreating(false)}
          onCreated={(topic) => {
            setIsCreating(false);
            onChange(topic.id, topic.area_id);
          }}
        />
      )}
    </div>
  );
};

export default TopicPicker;
