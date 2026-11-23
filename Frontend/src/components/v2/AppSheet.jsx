import React, { useEffect, useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import ConfirmDialog from '@/components/v2/ConfirmDialog';
import { cn } from '@/lib/utils';

export function SheetFormSection({ title, description, children, className }) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-2">
          <div className="space-y-0.5">
            {title && (
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <Separator />
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function SheetFormGrid({ columns = 2, children, className }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4',
        columns === 2 ? 'sm:grid-cols-2' : '',
        className
      )}
    >
      {children}
    </div>
  );
}

export function SheetField({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  children,
  className,
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label
          htmlFor={htmlFor}
          className="text-xs font-medium text-foreground"
        >
          <span>{label}</span>
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          )}
        </Label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export default function AppSheet({
  open,
  onOpenChange,
  title,
  description,
  badge,
  formId,
  onSubmit,
  submitLabel = 'Kaydet',
  cancelLabel = 'İptal',
  isSubmitting = false,
  submitDisabled = false,
  isDirty = false,
  footer,
  children,
  className,
}) {
  const autoFormId = useId();
  const resolvedFormId = formId || `app-sheet-form-${autoFormId}`;
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setDiscardConfirmOpen(false);
    }
  }, [open]);

  const requestClose = () => {
    if (isSubmitting) return;
    if (isDirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    onOpenChange?.(false);
  };

  const handleOpenChange = (nextOpen) => {
    if (nextOpen) {
      onOpenChange?.(true);
      return;
    }
    requestClose();
  };

  const handleConfirmDiscard = () => {
    setDiscardConfirmOpen(false);
    onOpenChange?.(false);
  };

  const preventCloseIfBlocked = (event) => {
    if (isSubmitting || discardConfirmOpen) {
      event.preventDefault();
      return;
    }
    const target = event?.target;
    if (
      target instanceof Element &&
      (target.closest('[data-slot="popover-content"]') ||
        target.closest('[data-radix-popper-content-wrapper]'))
    ) {
      event.preventDefault();
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          showCloseButton={!isSubmitting}
          onPointerDownOutside={preventCloseIfBlocked}
          onInteractOutside={preventCloseIfBlocked}
          onEscapeKeyDown={preventCloseIfBlocked}
          className={cn(
            'flex w-full flex-col gap-0 border-l border-border bg-card p-0 sm:max-w-lg data-[side=right]:w-full data-[side=right]:sm:max-w-lg',
            className
          )}
        >
          <SheetHeader className="border-b border-border px-6 py-4 pr-14">
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle className="text-base leading-6 font-semibold text-foreground">
                {title}
              </SheetTitle>
              {badge !== undefined && badge !== null && (
                typeof badge === 'string' ? (
                  <Badge variant="outline" className="text-xs">
                    {badge}
                  </Badge>
                ) : (
                  badge
                )
              )}
            </div>
            {description ? (
              <SheetDescription className="text-xs text-muted-foreground">
                {description}
              </SheetDescription>
            ) : (
              <SheetDescription className="sr-only">{title}</SheetDescription>
            )}
          </SheetHeader>

          <form
            id={resolvedFormId}
            onSubmit={onSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {children}
            </div>

            <SheetFooter className="mt-0 flex-row items-center justify-end gap-2 border-t border-border px-6 py-4">
              {footer !== undefined ? (
                footer
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={requestClose}
                  >
                    {cancelLabel}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || submitDisabled}
                  >
                    {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                    <span>{submitLabel}</span>
                  </Button>
                </>
              )}
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={discardConfirmOpen}
        onOpenChange={setDiscardConfirmOpen}
        title="Kaydedilmemiş değişiklikler var"
        description="Kapatırsanız yaptığınız değişiklikler kaybolacak."
        confirmLabel="Değişiklikleri sil"
        cancelLabel="Düzenlemeye dön"
        variant="destructive"
        onConfirm={handleConfirmDiscard}
      />
    </>
  );
}
