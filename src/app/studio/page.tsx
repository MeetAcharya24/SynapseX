"use client";

import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import Sidebar from "@/components/studio/Sidebar";
import Canvas from "@/components/studio/Canvas";
import ConfigPanel from "@/components/studio/ConfigPanel";
import Playground from "@/components/studio/Playground";
import ApiKeysModal from "@/components/studio/ApiKeysModal";

export default function StudioPage() {
  const [keysOpen, setKeysOpen] = useState(false);

  return (
    <ReactFlowProvider>
      <div className="flex h-full w-full bg-[color:var(--color-bg)] text-[color:var(--color-text)]">
        <Sidebar onOpenKeys={() => setKeysOpen(true)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <Canvas />
          </div>
          <Playground />
        </div>

        <ConfigPanel />
      </div>

      {keysOpen && <ApiKeysModal onClose={() => setKeysOpen(false)} />}
    </ReactFlowProvider>
  );
}
