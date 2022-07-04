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
};

type TextUINode = {
  type: "text";
  value: string;
};

type GenericWrapperUINode = {
  type: "generic" | "listitem";
};

type NamedUINode = {
  type: "section" | "link" | "list";
  name: string;
};

type HeadingUINode = {
  type: "heading";
  level: number;
  name: string;
};

type ReplacedUINode = {
  type: "button" | "image";
  name: string;
};

type InputFieldUINode = {
  type: "input";
  name: string;
  hasPopup: boolean;
};

export type UINode = UINodeBase &
  (
    | TextUINode
    | GenericWrapperUINode
    | NamedUINode
    | HeadingUINode
    | ReplacedUINode
    | InputFieldUINode
  );
export type UINodeInTree = UINodeInTreeBase & UINode;
