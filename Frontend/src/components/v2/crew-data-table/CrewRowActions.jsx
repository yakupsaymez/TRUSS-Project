import React from 'react';
import { KeyRound, Link2, Lock } from 'lucide-react';
import { ROLES } from '@/components/v2/channelAccess';
import { Button } from '@/components/ui/button';

export default function CrewRowActions({
  member,
  access,
  onPermissionsClick,
  onResetPasswordClick,
  onAssignClick,
}) {
  const isDriver = (member.role || ROLES.DRIVER) === ROLES.DRIVER;

  const permsEnabled = typeof onPermissionsClick === 'function';
  const permsTitle = access.readOnly
    ? access.lockMessage
    : permsEnabled
      ? 'Yetkileri düzenle'
      : "S11'de etkinleştirilecek";

  const resetEnabled = !access.readOnly && typeof onResetPasswordClick === 'function';
  const resetTitle = access.readOnly
    ? access.lockMessage
    : typeof onResetPasswordClick === 'function'
      ? 'Şifreyi sıfırla'
      : undefined;

  const assignEnabled = Boolean(isDriver && typeof onAssignClick === 'function');
  const assignTitle = assignEnabled ? 'Araç zimmetle' : "S11'de etkinleştirilecek";

  return (
    <div className="flex items-center justify-end gap-1.5">
      <span title={permsTitle} className="inline-flex">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!permsEnabled}
          onClick={permsEnabled ? () => onPermissionsClick(member) : undefined}
          title={permsTitle}
          className="h-8 gap-1.5 px-2.5 text-xs"
        >
          {access.readOnly ? (
            <Lock className="size-3.5" aria-hidden="true" />
          ) : (
            <KeyRound className="size-3.5" aria-hidden="true" />
          )}
          <span>Yetkiler</span>
        </Button>
      </span>

      <span title={resetTitle} className="inline-flex">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!resetEnabled}
          onClick={resetEnabled ? () => onResetPasswordClick(member) : undefined}
          title={resetTitle}
          className="h-8 gap-1.5 px-2.5 text-xs"
        >
          {access.readOnly ? (
            <Lock className="size-3.5" aria-hidden="true" />
          ) : (
            <KeyRound className="size-3.5" aria-hidden="true" />
          )}
          <span>Şifre Sıfırla</span>
        </Button>
      </span>

      {isDriver && (
        <span title={assignTitle} className="inline-flex">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!assignEnabled}
            onClick={assignEnabled ? () => onAssignClick(member) : undefined}
            title={assignTitle}
            className="h-8 gap-1.5 px-2.5 text-xs"
          >
            <Link2 className="size-3.5" aria-hidden="true" />
            <span>Zimmetle</span>
          </Button>
        </span>
      )}
    </div>
  );
}
