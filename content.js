let isClicking = false;
let originalUrl = '';

function getClickableLinks() {
  return Array.from(document.getElementsByTagName('a')).filter(link =>
    link.offsetWidth > 0 && link.offsetHeight > 0 && !link.href.startsWith('javascript:')
  );
}

function clickRandomLink() {
  if (!isClicking) return;

  const links = getClickableLinks();
  if (links.length === 0) {
    console.log("No clickable links found. Refreshing the page.");
    location.reload();
    setTimeout(clickRandomLink, 5000);
    return;
  }

  const randomLink = links[Math.floor(Math.random() * links.length)];
  console.log(`Clicking link: ${randomLink.textContent || randomLink.href}`);

  // Instead of directly clicking, we'll navigate to the href
  window.location.href = randomLink.href;

  // Set a timeout to go back and click again
  setTimeout(() => {
    if (isClicking) {
      console.log("Navigating back to previous page.");
      history.go(-1);

      // Wait for the page to load before clicking again
      setTimeout(clickRandomLink, 5000);
    }
  }, 5000);
}

function startClicking() {
  isClicking = true;
  originalUrl = window.location.href;
  clickRandomLink();
}

function stopClicking() {
  isClicking = false;
  console.log("Clicking stopped.");
  // Navigate back to the original URL
  if (window.location.href !== originalUrl) {
    window.location.href = originalUrl;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleClicking") {
    if (!isClicking) {
      startClicking();
    } else {
      stopClicking();
    }
    sendResponse({isClicking: isClicking});
  } else if (request.action === "getStatus") {
    sendResponse({isClicking: isClicking});
  }
  return true;  // Indicates that the response is sent asynchronously
});