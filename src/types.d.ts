declare module "terminfo" {
  function terminfo(term?: string): Record<string, string>;

  export = terminfo;
}
