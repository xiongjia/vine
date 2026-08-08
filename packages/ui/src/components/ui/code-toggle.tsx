import { useState } from "react";
import { CodeBlock } from "./code-block";

interface CodeToggleProps {
  /** Example code (JSX/TSX string) shown collapsed. */
  code: string;
}

/** Collapsible example code block: collapsed by default, expands on "View code". */
const CodeToggle = ({ code }: CodeToggleProps) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {open ? "Hide code" : "View code"}
      </button>
      {open && <CodeBlock code={code} className="mt-2" />}
    </div>
  );
};

export { CodeToggle };
export type { CodeToggleProps };
