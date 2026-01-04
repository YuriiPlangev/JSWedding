import React from 'react';
import { SCROLLBAR_STYLES } from '../../constants/organizer';

/**
 * Компонент для инъекции стилей скроллбаров
 */
export const ScrollbarStyles: React.FC = () => {
  return <style>{SCROLLBAR_STYLES}</style>;
};

