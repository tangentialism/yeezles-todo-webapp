import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AreaManagementModal from '../AreaManagementModal';
import * as AreaContextModule from '../../contexts/AreaContext';
import { areaContextValue, makeArea } from '../../test/topicFactories';

vi.mock('../../contexts/AreaContext');

describe('AreaManagementModal: refused delete', () => {
  it('stays open when the delete is refused', async () => {
    const area = makeArea({ id: 2, name: 'Work', is_default: false });
    const deleteArea = vi.fn().mockResolvedValue(false);
    vi.spyOn(AreaContextModule, 'useArea').mockReturnValue(
      areaContextValue({ areas: [area], deleteArea, availableColors: ['#43A047'] })
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onClose = vi.fn();
    render(<AreaManagementModal isOpen onClose={onClose} editingArea={area} />);
    await userEvent.click(screen.getByRole('button', { name: /Delete/ }));
    expect(deleteArea).toHaveBeenCalledWith(2);
    expect(onClose).not.toHaveBeenCalled();
  });
});
