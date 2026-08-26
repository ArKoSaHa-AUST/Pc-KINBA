import { useState } from 'react';
import ChatWorkspace from './ChatWorkspace';
import BuildPreviewHUD from './BuildPreviewHUD';
import type { BuildComponentItem } from './BuildPreviewHUD';
import './TonimaWorkspace.css';

interface TonimaWorkspaceProps {
  initialPrompt?: string;
  initialBudget?: number;
  className?: string;
}

const INITIAL_BUILD: BuildComponentItem[] = [
  {
    category: 'CPU',
    name: 'AMD Ryzen 7 7800X3D',
    priceBDT: 46500,
    retailer: 'Star Tech',
    inStock: true,
  },
  {
    category: 'GPU',
    name: 'MSI RTX 4070 Ti Super 16G Gaming X',
    priceBDT: 68500,
    retailer: 'Tech Land',
    inStock: true,
  },
  {
    category: 'Motherboard',
    name: 'ASUS TUF Gaming B650-PLUS WIFI',
    priceBDT: 24500,
    retailer: 'Ryans Computers',
    inStock: true,
  },
  {
    category: 'RAM',
    name: 'Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz',
    priceBDT: 13500,
    retailer: 'Star Tech',
    inStock: true,
  },
  {
    category: 'Storage',
    name: 'Samsung 990 Pro 1TB PCIe 4.0 NVMe M.2',
    priceBDT: 12800,
    retailer: 'PC House',
    inStock: true,
  },
  {
    category: 'Cooler',
    name: 'DeepCool LT720 360mm Liquid Cooler',
    priceBDT: 11500,
    retailer: 'Custom Mac BD',
    inStock: true,
  },
  {
    category: 'Power Supply',
    name: 'Corsair RM750e 750W 80 Plus Gold ATX 3.0',
    priceBDT: 11200,
    retailer: 'Star Tech',
    inStock: true,
  },
  {
    category: 'Case',
    name: 'Lian Li O11 Dynamic EVO White',
    priceBDT: 16500,
    retailer: 'Tech Land',
    inStock: true,
  },
];

export default function TonimaWorkspace({
  initialPrompt = '',
  className = '',
}: TonimaWorkspaceProps) {
  const [components, setComponents] = useState<BuildComponentItem[]>(INITIAL_BUILD);
  const [compatibilityScore, setCompatibilityScore] = useState<number>(98);
  const [estimatedWattage, setEstimatedWattage] = useState<number>(435);
  const [psuWattage] = useState<number>(750);
  const [priceDiff, setPriceDiff] = useState<number | undefined>(undefined);

  // Stage 4 Refinement Handler
  const handleRefineBuild = (
    action:
      | 'downgrade_ram'
      | 'swap_gpu_4060'
      | 'swap_gpu_4080'
      | 'upgrade_ram_64'
      | 'swap_cooler_aio'
      | 'custom',
  ) => {
    setComponents((prev) => {
      const updated = [...prev];

      if (action === 'downgrade_ram') {
        const ramIdx = updated.findIndex((c) => c.category === 'RAM');
        if (ramIdx !== -1) {
          updated[ramIdx] = {
            category: 'RAM',
            name: 'Corsair Vengeance 16GB (2x8GB) DDR5 5200MHz',
            priceBDT: 8500,
            retailer: 'Star Tech',
            inStock: true,
          };
          setPriceDiff(-5000);
          setEstimatedWattage(425);
        }
      } else if (action === 'swap_gpu_4060') {
        const gpuIdx = updated.findIndex((c) => c.category === 'GPU');
        if (gpuIdx !== -1) {
          updated[gpuIdx] = {
            category: 'GPU',
            name: 'MSI RTX 4060 Ventus 2X Black 8GB OC',
            priceBDT: 40000,
            retailer: 'Tech Land',
            inStock: true,
          };
          setPriceDiff(-28500);
          setEstimatedWattage(340);
        }
      } else if (action === 'swap_gpu_4080') {
        const gpuIdx = updated.findIndex((c) => c.category === 'GPU');
        if (gpuIdx !== -1) {
          updated[gpuIdx] = {
            category: 'GPU',
            name: 'ZOTAC Gaming RTX 4080 Super Trinity OC 16GB',
            priceBDT: 113500,
            retailer: 'Star Tech',
            inStock: true,
          };
          setPriceDiff(45000);
          setEstimatedWattage(580);
          setCompatibilityScore(99);
        }
      } else if (action === 'upgrade_ram_64') {
        const ramIdx = updated.findIndex((c) => c.category === 'RAM');
        if (ramIdx !== -1) {
          updated[ramIdx] = {
            category: 'RAM',
            name: 'G.Skill Trident Z5 RGB 64GB (2x32GB) DDR5 6000MHz',
            priceBDT: 26000,
            retailer: 'Ryans Computers',
            inStock: true,
          };
          setPriceDiff(12500);
          setEstimatedWattage(445);
        }
      } else if (action === 'swap_cooler_aio') {
        const coolerIdx = updated.findIndex((c) => c.category === 'Cooler');
        if (coolerIdx !== -1) {
          updated[coolerIdx] = {
            category: 'Cooler',
            name: 'DeepCool LT720 360mm High-Performance Liquid Cooler',
            priceBDT: 11500,
            retailer: 'Custom Mac BD',
            inStock: true,
          };
          setPriceDiff(0);
        }
      }

      return updated;
    });
  };

  const handleResetSession = () => {
    setComponents(INITIAL_BUILD);
    setCompatibilityScore(98);
    setEstimatedWattage(435);
    setPriceDiff(undefined);
  };

  return (
    <section className={`tonima-workspace-section ${className}`} id="tonima-workspace">
      <div className="tonima-workspace-container">
        {/* Left Column: 60% Chat Workspace */}
        <ChatWorkspace
          initialPrompt={initialPrompt}
          onRefineBuild={handleRefineBuild}
          onResetSession={handleResetSession}
          className="tonima-workspace-chat"
        />

        {/* Right Column: 40% Sticky 3D Preview HUD */}
        <BuildPreviewHUD
          components={components}
          compatibilityScore={compatibilityScore}
          estimatedWattage={estimatedWattage}
          psuWattage={psuWattage}
          priceDiff={priceDiff}
          className="tonima-workspace-hud"
        />
      </div>
    </section>
  );
}
