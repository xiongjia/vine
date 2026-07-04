import * as React from "react";

const MOBILE_BREAKPOINT = 768;

const MobileOverrideContext = React.createContext<boolean | null>(null);

export const MobileOverrideProvider = ({
  children,
  forceMobile,
}: {
  children: React.ReactNode;
  forceMobile: boolean | null;
}) => {
  return (
    <MobileOverrideContext.Provider value={forceMobile}>
      {children}
    </MobileOverrideContext.Provider>
  );
}

export const useIsMobile = () => {
  const override = React.useContext(MobileOverrideContext);
  const [isMobile, setIsMobile] = React.useState<boolean>(
    () => override ?? window.innerWidth < MOBILE_BREAKPOINT,
  );

  React.useEffect(() => {
    if (override !== null) {
      setIsMobile(override);
      return;
    }
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, [override]);

  return isMobile;
}
