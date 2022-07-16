import terminfo from "terminfo";

const trm = terminfo();

export function enterAlternateScreen(tty: NodeJS.WriteStream): void {
  tty.write(trm.enterCaMode ?? "");
}

export function exitAlternateScreen(tty: NodeJS.WriteStream): void {
  tty.write(trm.exitCaMode ?? "");
}

export function makeCursorInvisible(tty: NodeJS.WriteStream): void {
  tty.write(trm.cursorInvisible ?? "");
}

export function makeCursorVisible(tty: NodeJS.WriteStream): void {
  tty.write(trm.cursorVisible ?? "");
}

export function setScrollRegion(
  tty: NodeJS.WriteStream,
  top: number,
  bottom: number
) {
  tty.write(
    (trm.changeScrollRegion ?? "")
      .replace("%i%p1%d", top.toString())
      .replace("%p2%d", bottom.toString())
  );
}

export function setCursorPosition(
  tty: NodeJS.WriteStream,
  row: number,
  column: number
) {
  tty.cursorTo(column, row);
}
