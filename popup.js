function updateButtonStatus(isClicking) {
  const button = document.getElementById('toggleButton');
  if (isClicking) {
    button.textContent = 'Stop Clicking';
    button.style.backgroundColor = '#ff4444';
  } else {
    button.textContent = 'Start Clicking';
    button.style.backgroundColor = '#4CAF50';
  }
}

function updateSiteField(site) {
  const siteInput = document.getElementById('targetSite');
  siteInput.value = site || '';
}

function getSiteInputValue() {
  return document.getElementById('targetSite').value.trim();
}

function saveSite(site) {
  chrome.storage.local.set({ targetSite: site });
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['targetSite'], (data) => {
    updateSiteField(data.targetSite || '');
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, (response) => {
      if (response) {
        updateButtonStatus(response.isClicking);
        if (response.targetSite) {
          updateSiteField(response.targetSite);
        }
      }
    });
  });
});

document.getElementById('targetSite').addEventListener('change', () => {
  saveSite(getSiteInputValue());
});

document.getElementById('toggleButton').addEventListener('click', () => {
  const targetSite = getSiteInputValue();
  saveSite(targetSite);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: 'toggleClicking', targetSite },
      (response) => {
        if (response) {
          updateButtonStatus(response.isClicking);
        }
      }
    );
  });
});
