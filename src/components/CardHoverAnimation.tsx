import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

export interface CardHoverAnimationProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  scale?: number;
  hoverShadow?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  id?: string;
  title?: string;
}

export const CardHoverAnimation: React.FC<CardHoverAnimationProps> = ({
  children,
  className = '',
  scale = 1.02,
  hoverShadow = 'hover:shadow-lg',
  onClick,
  id,
  title,
  ...props
}) => {
  return (
    <motion.div
      id={id}
      title={title}
      onClick={onClick}
      whileHover={{ 
        scale,
        transition: { type: 'spring', stiffness: 350, damping: 25 }
      }}
      whileTap={{ scale: 0.99 }}
      className={`transition-shadow duration-200 ${hoverShadow} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default CardHoverAnimation;
