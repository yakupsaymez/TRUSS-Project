import React from 'react';
import { Info, Loader2, TriangleAlert } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Onayla',
  cancelLabel = 'Vazgeç',
  variant = 'destructive',
  icon,
  loading = false,
  onConfirm,
  className,
}) {
  const isDestructive = variant === 'destructive';
  const DefaultIcon = isDestructive ? TriangleAlert : Info;

  const renderIcon = () => {
    const iconClass = cn(
      'size-6',
      isDestructive ? 'text-destructive' : 'text-primary'
    );

    if (React.isValidElement(icon)) {
      return React.cloneElement(icon, {
        className: cn(iconClass, icon.props?.className),
      });
    }

    if (typeof icon === 'function' || (icon && typeof icon === 'object')) {
      const IconComponent = icon;
      return <IconComponent className={iconClass} />;
    }

    return <DefaultIcon className={iconClass} />;
  };

  const handleOpenChange = (nextOpen) => {
    if (loading && !nextOpen) return;
    onOpenChange?.(nextOpen);
  };

  const preventWhileLoading = (event) => {
    if (loading) {
      event.preventDefault();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!loading}
        onPointerDownOutside={preventWhileLoading}
        onInteractOutside={preventWhileLoading}
        onEscapeKeyDown={preventWhileLoading}
        className={cn(
          'border border-border bg-card sm:max-w-md [&>[data-slot=dialog-close]>svg]:size-4',
          className
        )}
      >
        <DialogHeader className="items-center gap-4 text-center">
          <Avatar
            className={cn(
              'size-14 border p-2',
              isDestructive
                ? 'border-destructive/30 bg-destructive/10'
                : 'border-primary/30 bg-primary/10'
            )}
          >
            <AvatarFallback className="bg-transparent">
              <div className="flex items-center justify-center">{renderIcon()}</div>
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2 text-center">
            <DialogTitle className="text-lg leading-7 font-semibold text-foreground">
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription className="mx-auto max-w-sm text-sm text-muted-foreground">
                {description}
              </DialogDescription>
            ) : (
              <DialogDescription className="sr-only">{title}</DialogDescription>
            )}
          </div>
        </DialogHeader>

        <div className="flex flex-col-reverse justify-center gap-2 sm:flex-row sm:gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => handleOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={isDestructive ? 'destructive' : 'default'}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            <span>{confirmLabel}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
