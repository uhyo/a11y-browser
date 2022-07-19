export type BrowserState = {
  /**
   * width of the terminal window.
   */
  columns: number;
  /**
   * Height of the terminal window.
   */
  rows: number;
  /**
   * Y offset of the screen.
   */
  scrollY: number;
};

export function createDefaultBrowserState(): BrowserState {
  return {
    columns: 0,
    rows: 0,
    scrollY: 0,
  };
}
