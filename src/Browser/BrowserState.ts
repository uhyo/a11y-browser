export type BrowserState = {
  /**
   * Y offset of the screen.
   */
  scrollY: number;
};

export function createDefaultBrowserState(): BrowserState {
  return {
    scrollY: 0,
  };
}
