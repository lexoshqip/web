import { useEffect, useState } from "react";
import { getEpochs } from "@/lib/data";
import type { Epoch } from "@/lib/types";
import { EpochCard } from "@/components/Cards";
import { SectionTitle } from "@/components/ui";

export default function Epochs() {
  const [epochs, setEpochs] = useState<Epoch[]>([]);
  useEffect(() => {
    getEpochs().then(setEpochs).catch(console.error);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionTitle
        title="Epokat e letërsisë shqipe"
        subtitle="Katër shekuj shkrimi, nga 1555 deri sot"
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {epochs.map((e) => (
          <EpochCard key={e.id} epoch={e} />
        ))}
      </div>
    </div>
  );
}
