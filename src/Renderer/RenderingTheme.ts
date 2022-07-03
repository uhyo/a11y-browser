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
};
