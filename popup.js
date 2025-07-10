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

  document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "getStatus" }, (response) => {
        if (response) {
          updateButtonStatus(response.isClicking);
        }
      });
    });
  });

  document.getElementById('toggleButton').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleClicking" }, (response) => {
        if (response) {
          updateButtonStatus(response.isClicking);
        }
      });
    });
  });