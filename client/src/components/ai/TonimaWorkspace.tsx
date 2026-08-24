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
  const [components] = useState<BuildComponentItem[]>(INITIAL_BUILD);
  const [compatibilityScore] = useState<number>(98);
  const [estimatedWattage] = useState<number>(435);
  const [psuWattage] = useState<number>(750);

  return (
    <section className={`tonima-workspace-section ${className}`} id="tonima-workspace">
      <div className="tonima-workspace-container">
        {/* Left Column: 60% Chat Workspace */}
        <ChatWorkspace initialPrompt={initialPrompt} className="tonima-workspace-chat" />

        {/* Right Column: 40% Sticky 3D Preview HUD */}
        <BuildPreviewHUD
          components={components}
          compatibilityScore={compatibilityScore}
          estimatedWattage={estimatedWattage}
          psuWattage={psuWattage}
          className="tonima-workspace-hud"
        />
      </div>
    </section>
  );
}
