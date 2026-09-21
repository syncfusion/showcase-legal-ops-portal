// Demo persona switcher. Client-only; does not call the server.
import {
  createContext, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';

export type Persona = 'manager' | 'attorney';

interface PersonaContextValue {
  persona: Persona;
  setPersona: (p: Persona) => void;
  /** True when the persona can approve past Internal Approval. */
  canApprove: boolean;
}

const STORAGE_KEY = 'mlp:persona';

const PersonaContext = createContext<PersonaContextValue | undefined>(undefined);

function getInitialPersona(): Persona {
  if (typeof window === 'undefined') return 'manager';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'manager' || stored === 'attorney') return stored;
  } catch {
    /* localStorage unavailable — fall through */
  }
  return 'manager';
}

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersona] = useState<Persona>(getInitialPersona);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, persona);
    } catch {
      /* ignore persistence failures */
    }
  }, [persona]);

  const value = useMemo<PersonaContextValue>(
    () => ({
      persona,
      setPersona,
      // Only the manager persona can clear VP sign-off and move past InternalApproval.
      canApprove: persona === 'manager',
    }),
    [persona],
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used within a PersonaProvider');
  return ctx;
}
