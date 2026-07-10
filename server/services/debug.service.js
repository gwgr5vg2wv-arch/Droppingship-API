let state = {
  lastUrl: '',
  lastError: '',
  lastResponseTimeMs: 0,
  lastRequestAt: '',
  lastResultCount: 0,
  lastMode: ''
};

export function saveDebugInfo(info = {}) {
  state = {
    ...state,
    ...info,
    lastRequestAt: info.lastRequestAt || state.lastRequestAt || new Date().toISOString()
  };
  return state;
}

export function getDebugInfo() {
  return { ...state };
}

export function clearDebugInfo() {
  state = {
    lastUrl: '',
    lastError: '',
    lastResponseTimeMs: 0,
    lastRequestAt: '',
    lastResultCount: 0,
    lastMode: ''
  };
  return state;
}
