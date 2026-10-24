import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';

const STORAGE_KEY = 'lokkhyo-query-cache';
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

interface RestoreContextValue {
  isRestoring: boolean;
}

const RestoreContext = createContext<RestoreContextValue>({ isRestoring: true });

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes fresh window
        retry: 2,
        gcTime: MAX_AGE + 5 * 60 * 1000, // slightly longer than maxAge
        refetchOnWindowFocus: false, // Prevents request storms on AppState foreground / cold start in React Native
        refetchOnReconnect: false, // Prevents cold-start burst when NetInfo listener connects
      },
    },
  });
}

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: STORAGE_KEY,
  throttleTime: 1000,
});

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const [isRestoring, setIsRestoring] = useState(true);

  // Online/offline connectivity handling via NetInfo
  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const isOnline = Boolean(state.isConnected && (state.isInternetReachable ?? true));
      onlineManager.setOnline(isOnline);
    });
  }, []);

  // Focus management via AppState
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    });
    return () => subscription.remove();
  }, []);

  const persistOptions = useMemo(
    () => ({
      persister: asyncStoragePersister,
      maxAge: MAX_AGE,
      buster: '1.0.0',
      dehydrateOptions: {
        shouldDehydrateQuery: (query: any) =>
          query.state.status === 'success' && !query.queryKey[0]?.toString().startsWith('mutation'),
      },
    }),
    [],
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={() => setIsRestoring(false)}
    >
      <RestoreContext.Provider value={{ isRestoring }}>
        {children}
      </RestoreContext.Provider>
    </PersistQueryClientProvider>
  );
}

export function useIsRestoring(): boolean {
  return useContext(RestoreContext).isRestoring;
}
