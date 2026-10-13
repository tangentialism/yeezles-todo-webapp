import React, { useState } from 'react';
import Dialog from '../ui/Dialog';
import { Spinner } from '../ui/Icons';
import { fieldError, ghostButton, primaryButton } from '../ui/styles';
import { useTopicMutations } from '../../hooks/useTopicStore';
import type { TopicWithCounts } from '../../types/topic';

/** Props for {@link DeleteTopicDialog}. */
interface DeleteTopicDialogProps {
  topic: TopicWithCounts;
  onClose: () => void;
  onDeleted: () => void;
}

/** Confirms a topic delete; its todos survive without a topic. */
const DeleteTopicDialog: React.FC<DeleteTopicDialogProps> = ({ topic, onClose, onDeleted }) => {
  const { deleteTopic, isDeleting } = useTopicMutations();
  const [error, setError] = useState<string | null>(null);
  const todoCount = topic.open_count + topic.done_count;

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteTopic(topic.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the topic.');
    }
  };

  return (
    <Dialog title="Delete topic" onClose={onClose} closeDisabled={isDeleting}>
      <div className="px-7 pt-3 text-[14.5px] text-ink-2">
        {`Delete "${topic.name}"? Its ${todoCount} todos stay but lose their topic.`}
        {error && <p className={fieldError}>{error}</p>}
      </div>
      <div className="flex items-center justify-end gap-1.5 pl-7 pr-5 pt-5 pb-5">
        <button type="button" onClick={onClose} disabled={isDeleting} className={ghostButton}>
          Cancel
        </button>
        <button type="button" onClick={handleDelete} disabled={isDeleting} className={`${primaryButton} !bg-danger hover:!bg-danger/90`}>
          {isDeleting && <Spinner className="w-4 h-4" />}
          Delete topic
        </button>
      </div>
    </Dialog>
  );
};

export default DeleteTopicDialog;
