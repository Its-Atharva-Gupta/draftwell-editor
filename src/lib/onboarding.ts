export const ONBOARDING_STORAGE_KEY = "draftwell.onboarding.completed.v1";

export function hasCompletedOnboarding() {
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function completeOnboarding() {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  } catch {
    // The tutorial can still close when storage is unavailable.
  }
}
