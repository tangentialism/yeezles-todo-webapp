import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useSearchShortcut } from '../useSearchShortcut';

const press = (target: Element | Document, init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useSearchShortcut', () => {
  it('opens on "/" from the body and prevents the default', () => {
    const onOpen = vi.fn();
    renderHook(() => useSearchShortcut(onOpen, true));
    const event = press(document.body, { key: '/' });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it.each([
    ['Meta', { metaKey: true }],
    ['Control', { ctrlKey: true }],
  ])('opens on %s+k from anywhere, including inside an input', (_n, mod) => {
    const onOpen = vi.fn();
    renderHook(() => useSearchShortcut(onOpen, true));
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    const event = press(input, { key: 'k', ...mod });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    press(document.body, { key: 'K', ...mod });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it('ignores "/" typed into an input, textarea, select or contenteditable', () => {
    const onOpen = vi.fn();
    renderHook(() => useSearchShortcut(onOpen, true));
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    // jsdom does not implement isContentEditable; mirror the browser.
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    const els = [
      document.createElement('input'),
      document.createElement('textarea'),
      document.createElement('select'),
      editable,
    ];
    for (const el of els) {
      document.body.appendChild(el);
      const event = press(el, { key: '/' });
      expect(event.defaultPrevented).toBe(false);
    }
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('ignores "/" with a modifier, when already handled, or while composing', () => {
    const onOpen = vi.fn();
    renderHook(() => useSearchShortcut(onOpen, true));
    press(document.body, { key: '/', ctrlKey: true });
    press(document.body, { key: '/', metaKey: true });
    press(document.body, { key: '/', altKey: true });
    press(document.body, { key: '/', isComposing: true });
    const handled = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    document.addEventListener('keydown', (e) => e.preventDefault(), { once: true, capture: true });
    document.body.dispatchEvent(handled);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    const onOpen = vi.fn();
    renderHook(() => useSearchShortcut(onOpen, false));
    press(document.body, { key: '/' });
    press(document.body, { key: 'k', metaKey: true });
    fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
    expect(onOpen).not.toHaveBeenCalled();
  });
});
