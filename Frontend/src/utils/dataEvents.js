export const DATA_CHANGED_EVENT = 'truss:data-changed';

export const DATA_SCOPES = Object.freeze({
  VEHICLE: 'vehicle',
  MOVEMENT: 'movement',
  COMPONENT: 'component',
  BUDGET: 'budget',
  FUEL_ANOMALY: 'fuel-anomaly',
  WORK_ORDER: 'work-order',
});

const VALID_SCOPES = new Set(Object.values(DATA_SCOPES));

function assertValidScope(scope) {
  if (typeof scope !== 'string' || !VALID_SCOPES.has(scope)) {
    throw new Error(`Invalid data event scope: ${String(scope)}`);
  }
}

export function emitDataChanged(scope, detail = {}) {
  assertValidScope(scope);
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(DATA_CHANGED_EVENT, { detail: { ...detail, scope } })
  );
}

export function subscribeDataChanged(scopes, handler, { ignoreSource } = {}) {
  let scopeSet = null;
  if (scopes !== null) {
    const list = Array.isArray(scopes) ? scopes : [scopes];
    if (scopes === undefined || list.length === 0) {
      throw new Error('subscribeDataChanged requires non-empty scopes or null');
    }
    list.forEach(assertValidScope);
    scopeSet = new Set(list);
  }

  if (typeof window === 'undefined') return () => {};

  const listener = (event) => {
    if (ignoreSource && event?.detail?.source === ignoreSource) return;
    if (scopeSet) {
      const s = event?.detail?.scope;
      if (!s || !scopeSet.has(s)) return;
    }
    handler(event?.detail || {}, event);
  };

  window.addEventListener(DATA_CHANGED_EVENT, listener);
  return () => window.removeEventListener(DATA_CHANGED_EVENT, listener);
}
