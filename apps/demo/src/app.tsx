import { GithubIcon } from "@vine/ui";
import { ShanghaiDemo } from "./components/examples/shanghai-demo";
import { TokyoDemo } from "./components/examples/tokyo-demo";
import { StylesDemo } from "./components/examples/styles-demo";
import { EmbedDemo } from "./components/examples/embed-demo";

const REPO_URL = "https://github.com/xiongjia/vine";

const App = () => (
  <div className="min-h-screen w-full">
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold">Vine Maps Demo</span>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="GitHub repository"
        >
          <GithubIcon />
        </a>
      </div>
    </header>

    <main className="mx-auto max-w-5xl space-y-14 px-4 py-10">
      <ShanghaiDemo />
      <TokyoDemo />
      <StylesDemo />
      <EmbedDemo />
    </main>
  </div>
);

export default App;
