import { useEffect, useRef } from 'react';

export function usePolling(callback: () => void | Promise<void>, intervalMs: number): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    // Immediate first fetch
    void callbackRef.current();

    const interval = setInterval(() => {
      void callbackRef.current();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);
}
