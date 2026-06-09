/**
 * UniversalLink stub - 替代 @lark-apaas/client-toolkit/components/UniversalLink
 */
import React from 'react';

interface UniversalLinkProps {
  to?: string;
  href?: string;
  children?: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  [key: string]: unknown;
}

export const UniversalLink: React.FC<UniversalLinkProps> = ({
  to,
  href,
  children,
  className,
  target,
  rel,
  ...rest
}) => {
  return (
    <a href={to || href || '#'} className={className} target={target} rel={rel} {...rest}>
      {children}
    </a>
  );
};

export default UniversalLink;
