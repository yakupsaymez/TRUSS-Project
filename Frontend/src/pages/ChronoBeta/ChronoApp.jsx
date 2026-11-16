import React, { useEffect, useRef, useState } from 'react';
import useVehicleStore from '@/store/useVehicleStore';
import useAuthStore from '@/store/useAuthStore';
import ChronoLayout from './ChronoLayout';
import TheLedger from './TheLedger';
import FleetHorizon from './FleetHorizon';
import TelemetryAnalytics from './TelemetryAnalytics';
import ComponentMatrix from './ComponentMatrix';
import CrewCommand from './CrewCommand';
import { canAccessChannel, DEFAULT_CHANNEL } from './channelAccess';

const REFRESH_THROTTLE_MS = 60 * 1000;

export default function ChronoApp() {
  const [activeChannel, setActiveChannel] = useState(DEFAULT_CHANNEL);
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const lastRefreshRef = useRef(0);
  const seciliAracId = useVehicleStore((s) => s.seciliAracId);
  const setSeciliAracId = useVehicleStore((s) => s.setSeciliAracId);

  // Canlı yetki senkronu: mount'ta + sekme görünür olunca (en fazla 60 sn'de bir)
  useEffect(() => {
    const syncUser = () => {
      lastRefreshRef.current = Date.now();
      refreshUser();
    };
    syncUser();

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastRefreshRef.current < REFRESH_THROTTLE_MS) return;
      syncUser();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refreshUser]);

  // State zorlansa veya rol/yetki değişse bile izinsiz kanalda kalınmaz.
  useEffect(() => {
    if (!canAccessChannel(user, activeChannel)) {
      setActiveChannel(DEFAULT_CHANNEL);
    }
  }, [user, activeChannel]);

  const handleFocusLedgerForVehicle = (aracId) => {
    setSeciliAracId(aracId);
    setActiveChannel('ledger');
  };

  const renderActiveChannel = () => {
    // Render guard: yetkisiz bileşen tek kare bile mount edilmez.
    const channel = canAccessChannel(user, activeChannel) ? activeChannel : DEFAULT_CHANNEL;

    switch (channel) {
      case 'horizon':
        return (
          <FleetHorizon
            seciliAracId={seciliAracId}
            onFocusLedger={handleFocusLedgerForVehicle}
          />
        );
      case 'analytics':
        return <TelemetryAnalytics seciliAracId={seciliAracId} />;
      case 'components':
        return <ComponentMatrix seciliAracId={seciliAracId} />;
      case 'crew':
        return <CrewCommand />;
      case 'ledger':
      default:
        return <TheLedger seciliAracId={seciliAracId} />;
    }
  };

  const effectiveChannel = canAccessChannel(user, activeChannel) ? activeChannel : DEFAULT_CHANNEL;

  return (
    <ChronoLayout
      activeChannel={effectiveChannel}
      onSelectChannel={setActiveChannel}
      seciliAracId={seciliAracId}
      onSelectArac={setSeciliAracId}
    >
      {renderActiveChannel()}
    </ChronoLayout>
  );
}
