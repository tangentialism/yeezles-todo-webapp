import React from 'react';
import type { PersonWithCounts } from '../../types/person';

/** Props for {@link LinkPeoplerDialog}. */
export interface LinkPeoplerDialogProps {
  person: PersonWithCounts;
  /** `relink` when the existing link is stale. */
  mode: 'link' | 'relink';
  onClose: () => void;
  /** Called with the holder's id when the user chooses to merge into the person already linked. */
  onMergeInto: (holderId: number) => void;
}

/** Placeholder: Task 6 fills in the Peopler search dialog. */
const LinkPeoplerDialog: React.FC<LinkPeoplerDialogProps> = () => null;

export default LinkPeoplerDialog;
