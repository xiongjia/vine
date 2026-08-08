import { Suspense } from "react";
import { useHashRoute } from "@vine/ui";
import { getPage } from "./lib/registry";
import { AppLayout } from "./layouts/app-layout";

const App = () => {
  const [slug] = useHashRoute();
  const page = getPage(slug);
  const PageComponent = page?.Component;

  return (
    <AppLayout slug={slug}>
      <Suspense
        fallback={<div className="text-muted-foreground">Loading...</div>}
      >
        {PageComponent ? <PageComponent /> : <div>Page not found: {slug}</div>}
      </Suspense>
    </AppLayout>
  );
};

export default App;
