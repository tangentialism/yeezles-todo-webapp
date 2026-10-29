import { createContext, useContext } from 'react';

/**
 * Opens a person in the People tab. Provided by Dashboard; absent elsewhere
 * (external-create pages, tests), where chips render as plain text.
 */
export const PersonNavigationContext = createContext<((personId: number) => void) | null>(null);

/** The dashboard's "open this person" action, or null outside the dashboard. */
export const useOpenPerson = () => useContext(PersonNavigationContext);
