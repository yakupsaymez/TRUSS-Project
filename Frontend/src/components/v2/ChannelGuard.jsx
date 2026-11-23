import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import { canAccessChannel } from '@/components/v2/channelAccess';

export default function ChannelGuard({ channel, children }) {
  const user = useAuthStore((s) => s.user);

  if (!canAccessChannel(user, channel)) {
    return <Navigate to="/app" replace />;
  }

  return children;
}
