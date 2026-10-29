import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneTabBar from '../PhoneTabBar';

describe('PhoneTabBar', () => {
  it('renders five views and marks the current one', () => {
    render(<PhoneTabBar currentView="today" onViewChange={vi.fn()} />);

    expect(screen.getByRole('navigation', { name: 'Views' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Done' })).not.toHaveAttribute('aria-current');
  });

  it('lists All, Today, Topics, People, Done in order; People switches view', async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    render(<PhoneTabBar currentView="people" onViewChange={onViewChange} />);
    const tabs = screen.getByRole('navigation', { name: 'Views' }).querySelectorAll('button');
    expect(Array.from(tabs).map((b) => b.textContent)).toEqual(['All', 'Today', 'Topics', 'People', 'Done']);
    expect(screen.getByRole('button', { name: 'People' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('button', { name: 'People' }));
    expect(onViewChange).toHaveBeenCalledWith('people');
  });

  it('has a Topics tab', () => {
    render(<PhoneTabBar currentView="topics" onViewChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Topics/ })).toHaveAttribute('aria-current', 'page');
  });

  it('switches view on tap', async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    render(<PhoneTabBar currentView="all" onViewChange={onViewChange} />);

    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onViewChange).toHaveBeenCalledWith('accomplishments');
  });

  it('shows the open count beside Today', () => {
    render(<PhoneTabBar currentView="all" onViewChange={vi.fn()} todayCount={3} />);

    expect(screen.getByRole('button', { name: 'Today (3 open)' })).toBeInTheDocument();
  });

  it('shows the pending-proposal count on the Topics tab', () => {
    render(<PhoneTabBar currentView="all" onViewChange={vi.fn()} topicsCount={3} />);
    expect(screen.getByRole('button', { name: /Topics.*\(3 pending\)/ })).toBeInTheDocument();
  });
});
