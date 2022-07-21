import chalk from "chalk";
import { RenderingTheme } from "./RenderingTheme.js";

export type RenderContext = {
  theme: RenderingTheme;
  /**
   * Flag on whether separator between blocks should be printed.
   */
  shouldPrintBlockSeparator: boolean;
  /**
   * Get current line number. Starts at 0.
   */
  getLineNumber: () => number;
};

export function createDefaultContext(): RenderContext {
  return {
    theme: {
      link: chalk.blueBright.underline,
      heading: chalk.cyan.bold,
      button: chalk.gray,
      image: chalk.yellowBright,
      structure: chalk.green,
      supplemental: chalk.gray,
      focused: chalk.red.bold,
    },
    shouldPrintBlockSeparator: false,
    getLineNumber: () => 0,
  };
}
