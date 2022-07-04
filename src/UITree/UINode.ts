export type UIFlow = "block" | "inline";

export type UINodeInTreeBase = {
  /**
   * Flow of child nodes.
   */
  intrinsicFlow: UIFlow;
  children: UINodeInTree[];
};

export type UINodeBase = {
  /**
   * Flow which this node prefers to be rendered with.
   */
  selfFlow: UIFlow;
  /**
   * Accessible name.
   */
  name: string | undefined;
};

type TextUINode = {
  type: "text";
  value: string;
};

type GenericWrapperUINode = {
  type:
    | "generic"
    | "listitem"
    | "section"
    | "link"
    | "list"
    | "navigation"
    | "complementary"
    | "banner"
    | "contentinfo";
};

type HeadingUINode = {
  type: "heading";
  level: number;
};

type ReplacedUINode = {
  type: "button" | "image";
};

type InputFieldUINode = {
  type: "input";
  hasPopup: boolean;
};

export type UINode = UINodeBase &
  (
    | TextUINode
    | GenericWrapperUINode
    | HeadingUINode
    | ReplacedUINode
    | InputFieldUINode
  );
export type UINodeInTree = UINodeInTreeBase & UINode;
