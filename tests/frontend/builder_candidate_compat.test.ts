import { describe, expect, it } from 'vitest';

import {
  checkCompatibility,
  type BuildSelection,
} from '../../client/src/components/builder/compatibility';
import type { BuilderProduct } from '../../client/src/components/builder/builderCatalog';

/**
 * Candidate-vs-build checks when a catalog product has specs the scraper could not parse.
 *
 * Retailer titles routinely omit the memory generation ("ASRock B650M PG Lightning WiFi
 * AM5 Micro ATX Motherboard" never says DDR5), which left `ramType` undefined. The
 * per-slot checks compared that undefined against a known value, found them unequal, and
 * reported the build incompatible — printing the word "undefined" back at the user:
 * "undefined board, DDR5 RAM selected". Unknown is not a conflict.
 */

const product = (p: Partial<BuilderProduct> & Pick<BuilderProduct, 'id' | 'category' | 'name'>) =>
  ({
    brand: 'Test',
    price: 10000,
    keySpec: '',
    popularity: 50,
    performanceScore: 50,
    ...p,
  }) as BuilderProduct;

const DDR5_RAM = product({
  id: 'ram-ddr5',
  category: 'ram',
  name: 'Corsair VENGEANCE 16GB DDR5 5600MHz',
  ramType: 'DDR5',
});

const DDR4_RAM = product({
  id: 'ram-ddr4',
  category: 'ram',
  name: 'Corsair VENGEANCE 16GB DDR4 3200MHz',
  ramType: 'DDR4',
});

/** A board whose title never spells out its memory generation. */
const BOARD_UNKNOWN_RAM = product({
  id: 'mobo-unknown',
  category: 'motherboard',
  name: 'ASRock B650M PG Lightning WiFi AM5 Micro ATX Motherboard',
  socket: 'AM5',
  formFactor: 'mATX',
});

const BOARD_DDR5 = product({
  id: 'mobo-ddr5',
  category: 'motherboard',
  name: 'ASRock B650M PG Lightning DDR5',
  socket: 'AM5',
  ramType: 'DDR5',
  formFactor: 'mATX',
});

const BOARD_DDR4 = product({
  id: 'mobo-ddr4',
  category: 'motherboard',
  name: 'MSI B450M PRO-VDH MAX DDR4',
  socket: 'AM4',
  ramType: 'DDR4',
  formFactor: 'mATX',
});

const CPU_AM5 = product({
  id: 'cpu-am5',
  category: 'cpu',
  name: 'AMD Ryzen 7 7800X3D',
  socket: 'AM5',
  tdp: 120,
});

/** A processor the catalog could not resolve a socket for. */
const CPU_UNKNOWN_SOCKET = product({
  id: 'cpu-unknown',
  category: 'cpu',
  name: 'Some Unlisted Processor',
  tdp: 65,
});

describe('PC Builder candidate compatibility with unparsed specs', () => {
  it('FE-COMPAT-UNKNOWN-001: RAM against a board with no known memory type is not a conflict', () => {
    const build: BuildSelection = { motherboard: BOARD_UNKNOWN_RAM };
    const result = checkCompatibility(DDR5_RAM, build);

    expect(result.status).not.toBe('incompatible');
    expect(result.message).not.toMatch(/undefined/i);
  });

  it('FE-COMPAT-UNKNOWN-002: a board with no known memory type is not a conflict for selected RAM', () => {
    const build: BuildSelection = { ram: DDR5_RAM };
    const result = checkCompatibility(BOARD_UNKNOWN_RAM, build);

    expect(result.status).not.toBe('incompatible');
    expect(result.message).not.toMatch(/undefined/i);
  });

  it('FE-COMPAT-UNKNOWN-003: a CPU with no known socket is not a conflict for the board', () => {
    const build: BuildSelection = { motherboard: BOARD_DDR5 };
    const result = checkCompatibility(CPU_UNKNOWN_SOCKET, build);

    expect(result.status).not.toBe('incompatible');
    expect(result.message).not.toMatch(/undefined/i);
  });

  it('FE-COMPAT-UNKNOWN-004: no check anywhere renders the word "undefined" to the user', () => {
    const partials: BuildSelection[] = [
      { motherboard: BOARD_UNKNOWN_RAM },
      { ram: DDR5_RAM },
      { cpu: CPU_UNKNOWN_SOCKET },
      { cpu: CPU_AM5, motherboard: BOARD_UNKNOWN_RAM },
    ];
    const candidates = [DDR5_RAM, DDR4_RAM, BOARD_UNKNOWN_RAM, CPU_AM5, CPU_UNKNOWN_SOCKET];

    for (const build of partials) {
      for (const candidate of candidates) {
        const { message } = checkCompatibility(candidate, build);
        expect(message).not.toMatch(/undefined/i);
      }
    }
  });

  // The guard must not blunt the rule when both sides ARE known.
  it('FE-COMPAT-UNKNOWN-005: a genuine DDR generation mismatch is still reported', () => {
    expect(checkCompatibility(DDR5_RAM, { motherboard: BOARD_DDR4 }).status).toBe('incompatible');
    expect(checkCompatibility(DDR4_RAM, { motherboard: BOARD_DDR5 }).status).toBe('incompatible');
    expect(checkCompatibility(BOARD_DDR4, { ram: DDR5_RAM }).status).toBe('incompatible');
  });

  it('FE-COMPAT-UNKNOWN-006: a genuine socket mismatch is still reported', () => {
    expect(checkCompatibility(CPU_AM5, { motherboard: BOARD_DDR4 }).status).toBe('incompatible');
    expect(checkCompatibility(BOARD_DDR4, { cpu: CPU_AM5 }).status).toBe('incompatible');
  });

  it('FE-COMPAT-UNKNOWN-007: a fully matched AM5 + DDR5 pairing stays compatible', () => {
    expect(checkCompatibility(DDR5_RAM, { motherboard: BOARD_DDR5 }).status).not.toBe(
      'incompatible',
    );
    expect(checkCompatibility(CPU_AM5, { motherboard: BOARD_DDR5 }).status).not.toBe(
      'incompatible',
    );
  });
});
