const DEFAULT_STATE = {
  enabled: false,
  targetSite: ''
};

const STORAGE_KEY = 'automationState';

function normalizeSite(site) {
  return (site || '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .trim()
    .toLowerCase();
}

async function getState() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return { ...DEFAULT_STATE, ...(result[STORAGE_KEY] || {}) };
}

async function setState(nextState) {
  const state = { ...DEFAULT_STATE, ...nextState };
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
  return state;
}

function buildGoogleSearchUrl(targetSite) {
  return `https://www.google.com/search?q=${encodeURIComponent(targetSite)}`;
}

async function navigateTabToSearch(tabId, targetSite) {
  if (!tabId || !targetSite) {
    return false;
  }

  await chrome.tabs.update(tabId, {
    url: buildGoogleSearchUrl(targetSite)
  });
  return true;
}

chrome.runtime.onInstalled.addListener(async () => {
  const state = await getState();
  await setState(state);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    if (request.type === 'GET_STATE') {
      sendResponse(await getState());
      return;
    }

    if (request.type === 'START_AUTOMATION') {
      const targetSite = normalizeSite(request.targetSite);
      if (!targetSite) {
        sendResponse({ ok: false, error: 'Please provide a website domain (example.com).' });
        return;
      }

      const state = await setState({ enabled: true, targetSite });
      await navigateTabToSearch(request.tabId, targetSite);
      sendResponse({ ok: true, state });
      return;
    }

    if (request.type === 'STOP_AUTOMATION') {
      const state = await setState({ enabled: false });
      sendResponse({ ok: true, state });
      return;
    }

    if (request.type === 'NAVIGATE_ACTIVE_TAB_TO_SEARCH') {
      const state = await getState();
      if (!state.enabled || !state.targetSite || !sender.tab?.id) {
        sendResponse({ ok: false });
        return;
      }

      await navigateTabToSearch(sender.tab.id, state.targetSite);
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: 'Unknown action.' });
  })();

  return true;
});
