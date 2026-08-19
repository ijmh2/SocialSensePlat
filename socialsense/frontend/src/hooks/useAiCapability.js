import { useEffect, useState } from 'react';
import { demoApi } from '../utils/api';

const BUILD_ALLOWS_AI = import.meta.env.VITE_AI_ENABLED !== 'false';

export function useAiCapability() {
  const [aiEnabled, setAiEnabled] = useState(false);

  useEffect(() => {
    if (!BUILD_ALLOWS_AI) return undefined;

    let active = true;
    demoApi.getStatus()
      .then(({ data }) => {
        if (active) setAiEnabled(data?.status === 'ready');
      })
      .catch(() => {
        if (active) setAiEnabled(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return aiEnabled;
}
