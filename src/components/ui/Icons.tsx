import React from 'react';

/**
 * Stroke icon set used across the app. Icons inherit `currentColor` and are
 * decorative (`aria-hidden`); give the surrounding button an accessible name.
 */
type IconProps = { className?: string };

const Stroke: React.FC<IconProps & { children: React.ReactNode; strokeWidth?: number }> = ({
  className = 'w-4 h-4',
  strokeWidth = 1.8,
  children,
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const SunIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
  </Stroke>
);

/** Three ruled lines: the "All" list. */
export const ListIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M5 7h14M5 12h14M5 17h9" />
  </Stroke>
);

/** A folder: the Topics view. */
export const FolderIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M3.5 7.5a2 2 0 012-2h3.6l2 2h7.4a2 2 0 012 2v7a2 2 0 01-2 2h-13a2 2 0 01-2-2z" />
  </Stroke>
);

/** Tick in a circle: the "Done" view. */
export const CircleCheckIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l3 3 5-6" />
  </Stroke>
);

export const CheckIcon: React.FC<IconProps> = (p) => (
  <Stroke strokeWidth={3} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Stroke>
);

export const PlusIcon: React.FC<IconProps> = (p) => (
  <Stroke strokeWidth={2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Stroke>
);

export const ChevronDownIcon: React.FC<IconProps> = (p) => (
  <Stroke strokeWidth={2} {...p}>
    <path d="M6 9l6 6 6-6" />
  </Stroke>
);

export const CloseIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Stroke>
);

export const MoreIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5.5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="18.5" cy="12" r="1.6" />
  </svg>
);

export const ExternalLinkIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Stroke>
);

export const LinkIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Stroke>
);

export const CalendarIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </Stroke>
);

export const PencilIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
  </Stroke>
);

export const TrashIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Stroke>
);

export const UndoIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
  </Stroke>
);

export const KeyIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <circle cx="8" cy="15" r="4" />
    <path d="M10.8 12.2L20 3M17 6l3 3M15 8l2 2" />
  </Stroke>
);

export const ShieldIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />
  </Stroke>
);

export const SignOutIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M14 8l4 4-4 4M18 12H9" />
  </Stroke>
);

export const RefreshIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" />
  </Stroke>
);

export const Spinner: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const AlertTriangleIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M12 3.5l9.5 16.5h-19z" />
    <path d="M12 10v4.5M12 17.5v.01" />
  </Stroke>
);

export const AlertCircleIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5v.01" />
  </Stroke>
);

export const FileIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </Stroke>
);

export const CopyIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
  </Stroke>
);

/** Arrow curling back: "returns to" a host. */
export const ReturnIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </Stroke>
);

export const EyeIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Stroke>
);
