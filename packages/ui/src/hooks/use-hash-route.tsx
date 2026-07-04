import { useState, useEffect, useCallback } from "react";

const useHashRoute = (
  defaultSlug = "overview",
): [string, (slug: string) => void] => {
  const [slug, setSlug] = useState(() => {
    if (typeof window === "undefined") return defaultSlug;
    const hash = window.location.hash.replace("#/", "");
    return hash || defaultSlug;
  });

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace("#/", "");
      setSlug(hash || defaultSlug);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [defaultSlug]);

  const navigate = useCallback((slug: string) => {
    window.location.hash = `#/${slug}`;
  }, []);

  return [slug, navigate];
};

export { useHashRoute };
