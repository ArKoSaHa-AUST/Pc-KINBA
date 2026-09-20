# -*- coding: utf-8 -*-
"""Generates the `parity_cases` block in tests/fixtures/compatibility_fixtures.json.

The fixtures are declared in NEUTRAL terms (the shared `CompatPart` vocabulary) so
the parity test can project each one onto both product shapes -- `BuilderProduct`
for the React builder and a Supabase-style candidate for the Tonima validator --
and assert the two adapters reach the same verdict.
"""
import collections
import io
import json

# Run from the repo root: python scripts/gen_compat_parity_fixtures.py
PATH = 'tests/fixtures/compatibility_fixtures.json'


def part(pid, name, **kw):
    d = collections.OrderedDict([('id', pid), ('name', name)])
    d.update(kw)
    return d


def case(cid, desc, parts, expected, budget=None):
    c = collections.OrderedDict()
    c['id'] = cid
    c['description'] = desc
    if budget is not None:
        c['budgetBDT'] = budget
    c['parts'] = collections.OrderedDict(parts)
    c['expected'] = [collections.OrderedDict([('rule', r), ('severity', s)]) for r, s in expected]
    return c


# Reusable blocks. Every CPU/GPU carries an explicit TDP so the two adapters'
# differing "assume a default TDP" policy never influences these cases.
def CPU_AM5(**k):
    return part('cpu-am5', 'AMD Ryzen 7 7700', priceBDT=34000, socket='AM5', tdpWatts=65, **k)


def CPU_AM4(**k):
    return part('cpu-am4', 'AMD Ryzen 5 5600', priceBDT=16500, socket='AM4', tdpWatts=65, **k)


def CPU_1700(**k):
    return part('cpu-1700', 'Intel Core i5-12400', priceBDT=18000, socket='LGA1700', tdpWatts=65, **k)


def MB_AM5(**k):
    return part('mb-am5', 'MSI PRO B650M-A WIFI', priceBDT=18500, socket='AM5',
                memoryType='DDR5', formFactor='mATX', **k)


def MB_AM4(**k):
    return part('mb-am4', 'MSI B550M PRO-VDH', priceBDT=11000, socket='AM4',
                memoryType='DDR4', formFactor='mATX', **k)


def MB_1700(**k):
    return part('mb-1700', 'ASUS PRIME B760M-A', priceBDT=17000, socket='LGA1700',
                memoryType='DDR5', formFactor='mATX', **k)


def RAM_DDR5(**k):
    return part('ram-ddr5', 'Corsair Vengeance 32GB DDR5-5600', priceBDT=13500,
                memoryType='DDR5', **k)


def RAM_DDR4(**k):
    return part('ram-ddr4', 'Corsair Vengeance 32GB DDR4-3200', priceBDT=9500,
                memoryType='DDR4', **k)


def PSU(w, **k):
    return part('psu-%dw' % w, 'Corsair RM%de %dW 80 Plus Gold' % (w, w),
                priceBDT=11000, psuWatts=w, **k)


def CASE_ATX(**k):
    return part('case-atx', 'NZXT H5 Flow', priceBDT=9500, formFactor='ATX', **k)


def CASE_MATX(**k):
    return part('case-matx', 'Montech X3 Mesh', priceBDT=6500, formFactor='mATX', **k)


BASE_OK = [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
           ('form_factor', 'ok'), ('cooling_required', 'ok')]

cases = []

# --- 1-3: valid platforms --------------------------------------------------
cases.append(case('PARITY-AM5-VALID', 'Valid AM5 + DDR5, mATX board in an ATX case',
                  [('cpu', CPU_AM5()), ('motherboard', MB_AM5()), ('ram', RAM_DDR5()),
                   ('psu', PSU(650)), ('case', CASE_ATX())], BASE_OK))

cases.append(case('PARITY-AM4-VALID', 'Valid AM4 + DDR4 platform',
                  [('cpu', CPU_AM4()), ('motherboard', MB_AM4()), ('ram', RAM_DDR4()),
                   ('psu', PSU(650)), ('case', CASE_ATX())], BASE_OK))

cases.append(case('PARITY-LGA1700-VALID', 'Valid LGA1700 + DDR5 platform',
                  [('cpu', CPU_1700()), ('motherboard', MB_1700()), ('ram', RAM_DDR5()),
                   ('psu', PSU(650)), ('case', CASE_ATX())], BASE_OK))

# --- 4: socket mismatch ----------------------------------------------------
cases.append(case('PARITY-SOCKET-MISMATCH', 'AM5 CPU in an LGA1700 board',
                  [('cpu', CPU_AM5()), ('motherboard', MB_1700()), ('ram', RAM_DDR5()),
                   ('psu', PSU(650)), ('case', CASE_ATX())],
                  [('socket_mismatch', 'error'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('form_factor', 'ok'), ('cooling_required', 'ok')]))

# --- 5-6: memory generation ------------------------------------------------
cases.append(case('PARITY-DDR4-IN-DDR5-BOARD', 'DDR4 kit in a DDR5-only board',
                  [('cpu', CPU_AM5()), ('motherboard', MB_AM5()), ('ram', RAM_DDR4()),
                   ('psu', PSU(650)), ('case', CASE_ATX())],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'error'), ('psu_headroom', 'ok'),
                   ('form_factor', 'ok'), ('cooling_required', 'ok')]))

cases.append(case('PARITY-DDR5-IN-DDR4-BOARD', 'DDR5 kit in a DDR4-only board',
                  [('cpu', CPU_AM4()), ('motherboard', MB_AM4()), ('ram', RAM_DDR5()),
                   ('psu', PSU(650)), ('case', CASE_ATX())],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'error'), ('psu_headroom', 'ok'),
                   ('form_factor', 'ok'), ('cooling_required', 'ok')]))

# --- 7-11: PSU boundaries. Draw = 75 base + 65 CPU + 260 GPU = 400W --------
GPU_260 = part('gpu-260', 'RTX 4070 Ti Super 16G', priceBDT=95000, tdpWatts=260)


def psu_case(cid, watts, desc, rule, severity):
    return case(cid, desc,
                [('cpu', CPU_AM5()), ('motherboard', MB_AM5()), ('ram', RAM_DDR5()),
                 ('gpu', GPU_260), ('psu', PSU(watts)), ('case', CASE_ATX())],
                [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), (rule, severity),
                 ('form_factor', 'ok'), ('cooling_required', 'ok')])


cases.append(psu_case('PARITY-PSU-EXACT-DRAW', 400,
                      'PSU rated exactly at the 400W estimated draw', 'psu_headroom', 'warning'))
cases.append(psu_case('PARITY-PSU-124-PCT', 496,
                      'PSU at 1.24x draw, just under the 25% headroom bar', 'psu_headroom', 'warning'))
cases.append(psu_case('PARITY-PSU-125-PCT', 500,
                      'PSU at exactly 1.25x draw, meets the headroom bar', 'psu_headroom', 'ok'))
cases.append(psu_case('PARITY-PSU-200-PCT', 800,
                      'PSU at 2x draw, comfortable headroom', 'psu_headroom', 'ok'))
cases.append(psu_case('PARITY-PSU-INSUFFICIENT', 350,
                      'PSU rated below the estimated draw', 'psu_insufficient', 'error'))

# --- 12-14: form factor ----------------------------------------------------
MB_ATX = part('mb-atx', 'Gigabyte B650 AORUS ELITE AX', priceBDT=24000,
              socket='AM5', memoryType='DDR5', formFactor='ATX')
MB_EATX = part('mb-eatx', 'ASUS ROG Maximus Z790 EXTREME', priceBDT=95000,
               socket='LGA1700', memoryType='DDR5', formFactor='E-ATX')
MB_ITX = part('mb-itx', 'ASUS ROG STRIX B650E-I', priceBDT=32000,
              socket='AM5', memoryType='DDR5', formFactor='ITX')

cases.append(case('PARITY-FF-ATX-IN-MATX', 'ATX board in an mATX case',
                  [('cpu', CPU_AM5()), ('motherboard', MB_ATX), ('ram', RAM_DDR5()),
                   ('psu', PSU(650)), ('case', CASE_MATX())],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('form_factor', 'error'), ('cooling_required', 'ok')]))

cases.append(case('PARITY-FF-EATX-IN-ATX',
                  'E-ATX board in an ATX case: the size the builder table used to lack entirely',
                  [('cpu', CPU_1700()), ('motherboard', MB_EATX), ('ram', RAM_DDR5()),
                   ('psu', PSU(650)), ('case', CASE_ATX())],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('form_factor', 'error'), ('cooling_required', 'ok')]))

cases.append(case('PARITY-FF-ITX-IN-ATX', 'ITX board in an ATX case fits',
                  [('cpu', CPU_AM5()), ('motherboard', MB_ITX), ('ram', RAM_DDR5()),
                   ('psu', PSU(650)), ('case', CASE_ATX())],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('form_factor', 'ok'), ('cooling_required', 'ok')]))

# --- 15-16: GPU length clearance -------------------------------------------
CASE_GPU_330 = part('case-gpu330', 'Compact Mesh Tower', priceBDT=7000,
                    formFactor='ATX', maxGpuLengthMm=330)

cases.append(case('PARITY-GPU-1MM-TOO-LONG', 'GPU 1mm longer than the case allows',
                  [('cpu', CPU_AM5()), ('motherboard', MB_AM5()), ('ram', RAM_DDR5()),
                   ('gpu', part('gpu-331', 'RTX 4080 Super OC', priceBDT=150000,
                                tdpWatts=260, lengthMm=331)),
                   ('psu', PSU(800)), ('case', CASE_GPU_330)],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('form_factor', 'ok'), ('cooling_required', 'ok'), ('gpu_clearance', 'error')]))

cases.append(case('PARITY-GPU-14MM-SPARE', 'GPU with 14mm spare trips the tight-clearance warning',
                  [('cpu', CPU_AM5()), ('motherboard', MB_AM5()), ('ram', RAM_DDR5()),
                   ('gpu', part('gpu-316', 'RTX 4070 Ti Gaming X', priceBDT=120000,
                                tdpWatts=260, lengthMm=316)),
                   ('psu', PSU(800)), ('case', CASE_GPU_330)],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('form_factor', 'ok'), ('cooling_required', 'ok'), ('gpu_clearance', 'warning')]))

# --- 17-18: cooler clearance -----------------------------------------------
cases.append(case('PARITY-AIO-360-IN-240-CASE', '360mm AIO in a case that only mounts 240mm',
                  [('cpu', CPU_AM5()), ('motherboard', MB_AM5()), ('ram', RAM_DDR5()),
                   ('psu', PSU(650)),
                   ('cooler', part('cooler-360', 'DeepCool LT720 360mm', priceBDT=11500, radiatorMm=360)),
                   ('case', part('case-rad240', 'Mini Mesh 240', priceBDT=6000,
                                 formFactor='mATX', radiatorSupportMm=[120, 240]))],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('form_factor', 'ok'), ('cooling_required', 'ok'), ('cooler_clearance', 'error')]))

cases.append(case('PARITY-TOWER-COOLER-1MM-OVER', 'Tower cooler 1mm over the case clearance',
                  [('cpu', CPU_AM5()), ('motherboard', MB_AM5()), ('ram', RAM_DDR5()),
                   ('psu', PSU(650)),
                   ('cooler', part('cooler-166', 'Thermalright Peerless Assassin', priceBDT=5500, heightMm=166)),
                   ('case', part('case-cool165', 'NZXT H5 Flow', priceBDT=9500,
                                 formFactor='ATX', maxCoolerHeightMm=165))],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('form_factor', 'ok'), ('cooling_required', 'ok'), ('cooler_clearance', 'error')]))

# --- 19: cooler socket bracket ---------------------------------------------
cases.append(case('PARITY-COOLER-NO-BRACKET', 'Cooler ships no bracket for the CPU socket',
                  [('cpu', CPU_AM5()), ('motherboard', MB_AM5()), ('ram', RAM_DDR5()),
                   ('psu', PSU(650)), ('case', CASE_ATX()),
                   ('cooler', part('cooler-intel', 'Intel-only Tower Cooler', priceBDT=4000,
                                   heightMm=150, coolerSockets=['LGA1700', 'LGA1200']))],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('form_factor', 'ok'), ('cooling_required', 'ok'), ('cooler_socket', 'error')]))

# --- 20-22: PSU connectors -------------------------------------------------
cases.append(case('PARITY-12VHPWR-ADAPTER', '12VHPWR GPU on a non-ATX-3.0 PSU that has enough 8-pins',
                  [('cpu', CPU_AM5()), ('motherboard', MB_AM5()), ('ram', RAM_DDR5()),
                   ('gpu', part('gpu-4080', 'RTX 4080 Super', priceBDT=150000, tdpWatts=320,
                                gpuPower={'type': '12vhpwr', 'pcie8pin': 3})),
                   ('psu', PSU(850, pcie8pin=4, has12vhpwr=False, sataPower=4)),
                   ('case', CASE_ATX())],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('form_factor', 'ok'), ('cooling_required', 'ok'), ('psu_connectors', 'warning')]))

cases.append(case('PARITY-12VHPWR-TOO-FEW-PINS', '12VHPWR GPU on a PSU without enough 8-pins for the adapter',
                  [('cpu', CPU_AM5()), ('motherboard', MB_AM5()), ('ram', RAM_DDR5()),
                   ('gpu', part('gpu-4090', 'RTX 4090', priceBDT=250000, tdpWatts=450,
                                gpuPower={'type': '12vhpwr', 'pcie8pin': 4})),
                   ('psu', PSU(1000, pcie8pin=2, has12vhpwr=False, sataPower=4)),
                   ('case', CASE_ATX())],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('form_factor', 'ok'), ('cooling_required', 'ok'), ('psu_connectors', 'error')]))

cases.append(case('PARITY-SATA-NO-POWER', 'SATA drive with a PSU that has no SATA power connector',
                  [('cpu', CPU_AM5()), ('motherboard', MB_AM5()), ('ram', RAM_DDR5()),
                   ('psu', PSU(650, pcie8pin=2, sataPower=0)),
                   ('storage', part('ssd-sata', 'Crucial BX500 1TB SATA', priceBDT=6500,
                                    storageInterface='sata')),
                   ('case', CASE_ATX())],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('form_factor', 'ok'), ('cooling_required', 'ok'), ('psu_connectors', 'error')]))

# --- 23-24: cooling requirement threshold ----------------------------------
cases.append(case('PARITY-CPU-105W-NO-COOLER', 'CPU at exactly 105W TDP needs no dedicated cooler',
                  [('cpu', part('cpu-105', 'Ryzen 7 5800X', priceBDT=30000, socket='AM4', tdpWatts=105)),
                   ('motherboard', MB_AM4()), ('ram', RAM_DDR4()),
                   ('psu', PSU(650)), ('case', CASE_ATX())],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('form_factor', 'ok'), ('cooling_required', 'ok')]))

cases.append(case('PARITY-CPU-106W-NO-COOLER', 'CPU one watt over the threshold warns about cooling',
                  [('cpu', part('cpu-106', 'Ryzen 9 5900X', priceBDT=40000, socket='AM4', tdpWatts=106)),
                   ('motherboard', MB_AM4()), ('ram', RAM_DDR4()),
                   ('psu', PSU(650)), ('case', CASE_ATX())],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('form_factor', 'ok'), ('cooling_required', 'warning')]))

# --- 25: BIOS age ----------------------------------------------------------
cases.append(case('PARITY-BIOS-CPU-NEWER', 'CPU released after the board may need a BIOS flash',
                  [('cpu', CPU_AM5(releasedYearMonth='2024-01')),
                   ('motherboard', MB_AM5(releasedYearMonth='2022-09')),
                   ('ram', RAM_DDR5()), ('psu', PSU(650)), ('case', CASE_ATX())],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('form_factor', 'ok'), ('cooling_required', 'ok'), ('bios_support', 'warning')]))

# --- 26-28: budget ---------------------------------------------------------
# Parts total 86,500 BDT: cpu 34000 + mb 18500 + ram 13500 + psu 11000 + case 9500.
BUDGET_PARTS = [('cpu', CPU_AM5()), ('motherboard', MB_AM5()), ('ram', RAM_DDR5()),
                ('psu', PSU(650)), ('case', CASE_ATX())]

cases.append(case('PARITY-BUDGET-EXACTLY-MET', 'Build total exactly equals the stated budget',
                  BUDGET_PARTS,
                  BASE_OK + [('budget_exceeded', 'ok')], budget=86500))

cases.append(case('PARITY-BUDGET-OVER-BY-1',
                  'Build 1 BDT over budget still passes: the validator has always allowed a 3% tolerance',
                  BUDGET_PARTS,
                  BASE_OK + [('budget_exceeded', 'ok')], budget=86499))

cases.append(case('PARITY-BUDGET-OVER-CEILING', 'Build above the 3% tolerance ceiling is flagged',
                  BUDGET_PARTS,
                  BASE_OK + [('budget_exceeded', 'error')], budget=80000))

# --- 29-30: missing inputs must yield no verdict ---------------------------
cases.append(case('PARITY-UNKNOWN-SOCKET',
                  'Board with no known socket: the socket rule must decline to judge, not pass',
                  [('cpu', CPU_AM5()),
                   ('motherboard', part('mb-unknown', 'Generic Mainboard', priceBDT=9000,
                                        memoryType='DDR5', formFactor='mATX')),
                   ('ram', RAM_DDR5()), ('psu', PSU(650)), ('case', CASE_ATX())],
                  [('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('form_factor', 'ok'), ('cooling_required', 'ok')]))

cases.append(case('PARITY-UNKNOWN-CASE-FORM-FACTOR',
                  'Case with no known form factor: the fit rule must decline to judge',
                  [('cpu', CPU_AM5()), ('motherboard', MB_AM5()), ('ram', RAM_DDR5()),
                   ('psu', PSU(650)),
                   ('case', part('case-unknown', 'Generic Chassis', priceBDT=4000))],
                  [('socket_mismatch', 'ok'), ('ram_mismatch', 'ok'), ('psu_headroom', 'ok'),
                   ('cooling_required', 'ok')]))

data = json.load(io.open(PATH, encoding='utf-8'), object_pairs_hook=collections.OrderedDict)
data['parity_cases'] = cases
io.open(PATH, 'w', encoding='utf-8').write(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
print('wrote %d parity cases' % len(cases))
