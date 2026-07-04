import * as React from "react";
import { cn } from "../../lib/utils";

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  children?: React.ReactNode;
  start?: React.ReactNode;
  end?: React.ReactNode;
}

const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ title, start, children, end, className, ...props }, ref) => (
    <header
      ref={ref}
      className={cn(
        "flex items-center gap-3 border-b px-6 py-3 bg-card",
        className,
      )}
      {...props}
    >
      {start && <div className="flex items-center gap-2">{start}</div>}
      <h1 className="text-lg font-semibold">{title}</h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
      {end && <div className="flex items-center gap-2 ml-auto">{end}</div>}
    </header>
  ),
);
Header.displayName = "Header";

export { Header };
