/**
 * Константы для панели организатора
 */

export const SCROLLBAR_STYLES = `
  .task-blocks-scroll::-webkit-scrollbar {
    height: 0;
    display: none;
  }
  .task-blocks-scroll::-webkit-scrollbar-track {
    display: none;
  }
  .task-blocks-scroll::-webkit-scrollbar-thumb {
    display: none;
  }
  .task-blocks-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .task-column-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .task-column-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .task-column-scroll::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.25);
    border-radius: 4px;
  }
  .task-column-scroll::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.4);
  }
`;

export const DEFAULT_TASK_GROUP_COLOR = '#ffffff';

export const VIEW_MODES = {
  TASKS: 'tasks',
  WEDDINGS: 'weddings',
  WEDDING_DETAILS: 'wedding-details',
} as const;

export type ViewMode = typeof VIEW_MODES[keyof typeof VIEW_MODES];

