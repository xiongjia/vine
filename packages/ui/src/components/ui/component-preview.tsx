import * as React from "react";
import { cn } from "../../lib/utils";
import { CodeBlock } from "./code-block";

interface ComponentPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  code?: string;
  codeTitle?: string;
}

const ComponentPreview = React.forwardRef<
  HTMLDivElement,
  ComponentPreviewProps
>(({ children, code, codeTitle, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "not-prose grid gap-4",
      code ? "grid-cols-2" : "grid-cols-1",
      className,
    )}
    {...props}
  >
    <div className="flex min-h-[100px] items-center justify-center rounded-lg border p-6">
      {children}
    </div>
    {code && <CodeBlock code={code} title={codeTitle} />}
  </div>
));
ComponentPreview.displayName = "ComponentPreview";

export { ComponentPreview };
