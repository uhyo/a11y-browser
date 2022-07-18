export type BrowserState = {
  /**
   * Height of the browser window.
   */
  height: number;
  /**
   * Y offset of the screen.
   */
  scrollY: number;
};

export function createDefaultBrowserState(): BrowserState {
  return {
    height: 0,
    scrollY: 0,
  };
}
