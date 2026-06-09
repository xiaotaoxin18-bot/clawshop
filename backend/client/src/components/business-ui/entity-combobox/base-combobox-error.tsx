'use client';

import { cn } from '@/lib/utils';
import { Button } from '@client/src/components/ui/button';

export type BaseComboboxErrorProps = {
  onRetry?: () => void;
  className?: string;
};

export const BaseComboboxError = ({
  onRetry,
  className,
}: BaseComboboxErrorProps) => {
  return (
    <div
      className={cn(
        'flex gap-2 px-2 pt-4 text-sm leading-normal text-muted-foreground',
        className,
      )}
    >
      <div className="max-w-full truncate text-muted-foreground">
        加载失败，请检查网络后重试
      </div>
      <Button
        variant="link"
        size="sm"
        onClick={onRetry}
        className="h-auto p-0 text-primary not-disabled:hover:no-underline"
      >
        刷新
      </Button>
    </div>
  );
};
