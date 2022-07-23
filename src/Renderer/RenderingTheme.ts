type Theme = (str: string) => string;

export type RenderingTheme = {
  /**
   * Theme for link.
   */
  link: Theme;
  /**
   * Theme for heading.
   */
  heading: Theme;
  /**
   * Theme for button.
   */
  button: Theme;
  /**
   * Theme for image.
   */
  image: Theme;
  /**
   * Theme for generic page structure.
   */
  structure: Theme;
  /**
   * Theme for supplemental information.
   */
  supplemental: Theme;
  /**
   * Theme for focused marker.
   */
  focused: Theme;
  /**
   * Theme for code.
   */
  code: Theme;
  /**
   * Theme for URL.
   */
  url: Theme;
};
