const SEARCH_RESULT_DELAY_MS = 2200;
const TARGET_VISIT_MIN_MS = 60000;
const ENGAGEMENT_STEP_MS = 4000;

let returnToSearchTimeoutId = null;
let engagementIntervalId = null;

function normalizeSite(site) {
  return (site || '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .trim()
    .toLowerCase();
}

function isGoogleSearchPage() {
  return window.location.hostname.includes('google.') && window.location.pathname === '/search';
}

function isOnTargetSite(targetSite) {
  return normalizeSite(window.location.hostname).includes(normalizeSite(targetSite));
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

function findTargetSearchResult(targetSite) {
  const links = Array.from(document.querySelectorAll('a[href]'));
  const normalizedTarget = normalizeSite(targetSite);

  for (const link of links) {
    const destination = extractDestinationUrl(link.href);
    if (!destination) {
      continue;
    }

    try {
      const destinationHost = normalizeSite(new URL(destination).hostname);
      if (destinationHost.includes(normalizedTarget)) {
        return link;
      }
    } catch (error) {
      // Ignore malformed destinations.
    }
  }

  return null;
}

function navigateToGoogleSearch() {
  chrome.runtime.sendMessage({ type: 'NAVIGATE_ACTIVE_TAB_TO_SEARCH' });
}

function clickRandomInteractiveElement() {
  const candidates = Array.from(
    document.querySelectorAll('button, [role="button"], input[type="button"]')
  ).filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && !element.disabled;
  });

  if (candidates.length === 0) {
    return;
  }

  const candidate = candidates[Math.floor(Math.random() * candidates.length)];
  try {
    candidate.click();
  } catch (error) {
    // Ignore click failures and continue the session.
  }

  performEngagementStep();

  engagementIntervalId = setInterval(() => {
    performEngagementStep();
  }, ENGAGEMENT_STEP_MS);

  returnToSearchTimeoutId = setTimeout(() => {
    clearInterval(engagementIntervalId);
    engagementIntervalId = null;
    returnToSearchTimeoutId = null;
    navigateToGoogleSearch();
  }, TARGET_VISIT_MIN_MS);
}

function performEngagementStep() {
  console.log('[Google Click Runner] Engagement step on target site.');
  const maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const nextScrollTop = Math.floor(Math.random() * (maxScrollTop + 1));
  window.scrollTo({ top: nextScrollTop, behavior: 'smooth' });
  clickRandomInteractiveElement();
}

function startTargetEngagement() {
  if (engagementIntervalId !== null || returnToSearchTimeoutId !== null) {
    return;
  }

  performEngagementStep();

  engagementIntervalId = setInterval(() => {
    performEngagementStep();
  }, ENGAGEMENT_STEP_MS);

  returnToSearchTimeoutId = setTimeout(() => {
    clearInterval(engagementIntervalId);
    engagementIntervalId = null;
    returnToSearchTimeoutId = null;
    navigateToGoogleSearch();
  }, TARGET_VISIT_MIN_MS);
}

function runPageStep(state) {
  if (!state?.enabled || !state.targetSite) {
    return;
  }

  if (isGoogleSearchPage()) {
    const targetResult = findTargetSearchResult(state.targetSite);

    if (targetResult) {
      setTimeout(() => {
        targetResult.click();
      }, SEARCH_RESULT_DELAY_MS);
      return;
    }

    setTimeout(() => {
      navigateToGoogleSearch();
    }, SEARCH_RESULT_DELAY_MS);
    return;
  }

  if (isOnTargetSite(state.targetSite)) {
    startTargetEngagement();
    return;
  }

  navigateToGoogleSearch();
}

function initializeAutomation() {
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
    if (chrome.runtime.lastError) {
      return;
    }
    runPageStep(state);
  });
}

window.addEventListener('load', initializeAutomation);
