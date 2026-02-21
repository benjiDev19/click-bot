let isClicking = false;
let originalUrl = '';
let targetSite = '';
let googleSearchUrl = '';

const SEARCH_RESULT_DELAY_MS = 2500;
const TARGET_PAGE_DELAY_MS = 5000;

function normalizeSite(site) {
  return site
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .trim()
    .toLowerCase();
}

function buildGoogleSearchUrl(site) {
  return `https://www.google.com/search?q=${encodeURIComponent(site)}`;
}

function extractDestinationUrl(resultHref) {
  try {
    const url = new URL(resultHref, window.location.origin);
    if (url.hostname.includes('google.') && url.pathname === '/url') {
      return url.searchParams.get('q') || '';
    }
    return url.href;
  } catch (error) {
    return '';
  }
}

function findTargetSearchResult() {
  const links = Array.from(document.querySelectorAll('a[href]'));
  for (const link of links) {
    const destination = extractDestinationUrl(link.href);
    if (!destination) {
      continue;
    }

    try {
      const destinationHost = normalizeSite(new URL(destination).hostname);
      if (destinationHost.includes(targetSite)) {
        return link;
      }
    } catch (error) {
      // Ignore URLs that cannot be parsed.
    }
  }

  return null;
}

function continueLoop() {
  if (!isClicking) {
    return;
  }

  const isGoogleSearchPage =
    window.location.hostname.includes('google.') && window.location.pathname === '/search';
  const onTargetSite = normalizeSite(window.location.hostname).includes(targetSite);

  if (isGoogleSearchPage) {
    const targetResult = findTargetSearchResult();

    if (targetResult) {
      console.log(`Clicking Google result for ${targetSite}:`, targetResult.href);
      setTimeout(() => {
        if (isClicking) {
          targetResult.click();
        }
      }, SEARCH_RESULT_DELAY_MS);
      return;
    }

    console.log(`No Google result found for ${targetSite}. Refreshing search.`);
    setTimeout(() => {
      if (isClicking) {
        window.location.href = googleSearchUrl;
      }
    }, SEARCH_RESULT_DELAY_MS);
    return;
  }

  if (onTargetSite) {
    console.log(`Visited ${targetSite}. Returning to Google results.`);
    setTimeout(() => {
      if (isClicking) {
        window.location.href = googleSearchUrl;
      }
    }, TARGET_PAGE_DELAY_MS);
    return;
  }

  console.log('Navigating to Google search page.');
  window.location.href = googleSearchUrl;
}

function startClicking(siteInput) {
  isClicking = true;
  originalUrl = window.location.href;
  targetSite = normalizeSite(siteInput || window.location.hostname);

  if (!targetSite) {
    console.log('No target site provided. Stopping click loop.');
    isClicking = false;
    return;
  }

  googleSearchUrl = buildGoogleSearchUrl(targetSite);
  continueLoop();
}

function stopClicking() {
  isClicking = false;
  console.log('Clicking stopped.');
  if (window.location.href !== originalUrl) {
    window.location.href = originalUrl;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleClicking') {
    if (!isClicking) {
      startClicking(request.targetSite);
    } else {
      stopClicking();
    }
    sendResponse({ isClicking, targetSite });
  } else if (request.action === 'getStatus') {
    sendResponse({ isClicking, targetSite });
  }

  return true;
});

window.addEventListener('load', () => {
  continueLoop();
});
