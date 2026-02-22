function getElements() {
  return {
    targetSiteInput: document.getElementById('targetSite'),
    toggleButton: document.getElementById('toggleButton'),
    statusText: document.getElementById('statusText')
  };
}

function setButtonState(enabled) {
  const { toggleButton } = getElements();
  toggleButton.textContent = enabled ? 'Stop' : 'Start';
  toggleButton.style.backgroundColor = enabled ? '#d93025' : '#188038';
}

function setStatus(message, isError = false) {
  const { statusText } = getElements();
  statusText.textContent = message;
  statusText.style.color = isError ? '#d93025' : '#444';
}

function normalizeSite(site) {
  return (site || '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .trim()
    .toLowerCase();
}

function withActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    callback(tabs?.[0] || null);
  });
}

function loadState() {
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
    if (chrome.runtime.lastError || !state) {
      setStatus('Unable to load extension state.', true);
      return;
    }

    getElements().targetSiteInput.value = state.targetSite || '';
    setButtonState(state.enabled);
    setStatus(state.enabled ? `Running for ${state.targetSite}` : 'Stopped');
  });
}

function toggleAutomation() {
  const { targetSiteInput } = getElements();
  const targetSite = normalizeSite(targetSiteInput.value);

  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
    if (chrome.runtime.lastError || !state) {
      setStatus('Unable to read extension state.', true);
      return;
    }

    if (state.enabled) {
      chrome.runtime.sendMessage({ type: 'STOP_AUTOMATION' }, (response) => {
        if (!response?.ok) {
          setStatus('Failed to stop automation.', true);
          return;
        }
        setButtonState(false);
        setStatus('Stopped');
      });
      return;
    }

    withActiveTab((tab) => {
      chrome.runtime.sendMessage(
        { type: 'START_AUTOMATION', targetSite, tabId: tab?.id },
        (response) => {
          if (!response?.ok) {
            setStatus(response?.error || 'Failed to start automation.', true);
            return;
          }

          setButtonState(true);
          setStatus(`Running for ${response.state.targetSite}`);
        }
      );
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  getElements().toggleButton.addEventListener('click', toggleAutomation);
});
