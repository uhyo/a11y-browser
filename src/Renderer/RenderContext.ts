import chalk from "chalk";
import { RenderingTheme } from "./RenderingTheme.js";

export type RenderContext = {
  theme: RenderingTheme;
  /**
   * Indent that should prefix each line.
   */
  blockIndent: string;
  /**
   * Flag on whether separator between blocks should be printed.
   */
  shouldPrintBlockSeparator: boolean;
};

export function createDefaultContext(): RenderContext {
  return {
    theme: {
      link: chalk.blueBright.underline,
      heading: chalk.cyan.bold,
      button: chalk.gray,
      image: chalk.yellowBright,
    },
    blockIndent: "",
    shouldPrintBlockSeparator: false,
  };
}
