export default function Footer() {
  return (
    <footer className="px-6 py-14 sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
        <div>
          <p className="font-display text-xl tracking-tight">SynapseX</p>
          <p className="mt-2 max-w-xs text-sm text-faint">
            Connected intelligence and multi-agent collaboration. Open
            source, MIT licensed.
          </p>
        </div>

        <div className="flex gap-8 font-mono text-sm text-dim">
          <a href="#features" className="link-underline hover:text-accent">
            Features
          </a>
          <a href="#" className="link-underline hover:text-accent">
            Docs
          </a>
          <a href="#" className="link-underline hover:text-accent">
            GitHub
          </a>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-6xl text-xs text-faint">
        © 2026 SynapseX. All rights reserved.
      </p>
    </footer>
  );
}
