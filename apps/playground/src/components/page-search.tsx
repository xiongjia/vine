import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Input, useHashRoute } from "@vine/ui";
import { pagesMeta, type PageMeta } from "../lib/registry";

const useClickOutside = (
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void,
) => {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler();
      }
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
};

const filterPages = (query: string): PageMeta[] => {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return pagesMeta.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q),
  );
};

const PageSearch = () => {
  const [, navigate] = useHashRoute();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const placeholder = useMemo(() => {
    const isMac =
      typeof navigator !== "undefined" &&
      /Mac|iPod|iPhone|iPad/.test(navigator.platform ?? "");
    return isMac
      ? "Search components... (⌘K)"
      : "Search components... (Ctrl+K)";
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = filterPages(query);

  useEffect(() => {
    const focused = document.activeElement === inputRef.current;
    setOpen(focused && query.trim().length > 0);
  }, [query]);

  const handleFocus = useCallback(() => {
    if (query.trim().length > 0) {
      setOpen(true);
    }
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setSelectedIndex(-1);
  }, []);

  const selectPage = useCallback(
    (slug: string) => {
      navigate(slug);
      setQuery("");
      close();
      inputRef.current?.blur();
    },
    [navigate, close],
  );

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", listener, { capture: true });
    return () =>
      document.removeEventListener("keydown", listener, { capture: true });
  }, []);

  useClickOutside(containerRef, close);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  useEffect(() => {
    if (selectedIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[selectedIndex] as
      HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (e.key === "ArrowDown" && results.length > 0) {
        e.preventDefault();
        setOpen(true);
        setSelectedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev,
        );
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      }
      case "Enter": {
        e.preventDefault();
        const slug = results[selectedIndex]?.slug;
        if (slug) selectPage(slug);
        break;
      }
      case "Escape": {
        e.preventDefault();
        close();
        setQuery("");
        inputRef.current?.blur();
        break;
      }
    }
  };

  return (
    <div ref={containerRef} className="relative ml-4 w-64">
      <Input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className="h-8 text-xs"
      />
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {results.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">
              No results found
            </li>
          ) : (
            results.map((page, i) => (
              <li
                key={page.slug}
                role="option"
                aria-selected={i === selectedIndex}
                className={
                  i === selectedIndex
                    ? "flex items-center gap-2 rounded-sm bg-accent px-2 py-1.5 text-sm text-accent-foreground"
                    : "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
                }
                onClick={() => selectPage(page.slug)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <page.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{page.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {page.description}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export { PageSearch };
