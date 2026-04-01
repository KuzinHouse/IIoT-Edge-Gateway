/**
 * Modbus TCP Simulator
 * 
 * A lightweight Modbus TCP server simulator that responds to standard Modbus requests.
 * Supports Function Codes:
 *   01 (0x01) - Read Coils
 *   02 (0x02) - Read Discrete Inputs
 *   03 (0x03) - Read Holding Registers
 *   04 (0x04) - Read Input Registers
 *   05 (0x05) - Write Single Coil
 *   06 (0x06) - Write Single Register
 *   15 (0x0F) - Write Multiple Coils
 *   16 (0x10) - Write Multiple Registers
 *   43 (0x2B) - Read Device Identification
 * 
 * The simulator maintains register/coil arrays that simulate a real PLC.
 * Values fluctuate slightly over time to simulate real sensor behavior.
 */

const PORT = 8502;
const MBAP_HEADER_SIZE = 7;

// Simulated device registers
const MAX_REGISTERS = 10000;
const MAX_COILS = 10000;

// Holding registers (function code 03/06/16) - simulate sensor values
const holdingRegisters = new Float32Array(MAX_REGISTERS);
// Input registers (function code 04) - read-only
const inputRegisters = new Float32Array(MAX_REGISTERS);
// Coils (function code 01/05/15)
const coils = new Uint8Array(MAX_COILS);
// Discrete inputs (function code 02) - read-only
const discreteInputs = new Uint8Array(MAX_COILS);

// Initialize registers with realistic industrial values
function initializeRegisters() {
  // Holding registers - Temperature sensors (°C × 10)
  holdingRegisters[0] = 2350;  // Sensor 1: 235.0°C
  holdingRegisters[1] = 1870;  // Sensor 2: 187.0°C  
  holdingRegisters[2] = 450;   // Sensor 3: 45.0°C
  holdingRegisters[3] = 1210;  // Sensor 4: 121.0°C
  holdingRegisters[4] = 670;   // Sensor 5: 67.0°C

  // Pressure sensors (bar × 100)
  holdingRegisters[10] = 4200; // 42.00 bar
  holdingRegisters[11] = 3800; // 38.00 bar
  holdingRegisters[12] = 1500; // 15.00 bar

  // Flow rate (m³/h × 100)
  holdingRegisters[20] = 1234; // 12.34 m³/h
  holdingRegisters[21] = 567;  // 5.67 m³/h

  // Tank levels (liters)
  holdingRegisters[30] = 7540; // 7540 L
  holdingRegisters[31] = 3200; // 3200 L
  holdingRegisters[32] = 8900; // 8900 L

  // Motor speed (RPM)
  holdingRegisters[40] = 1480; // 1480 RPM
  holdingRegisters[41] = 960;  // 960 RPM
  holdingRegisters[42] = 2950; // 2950 RPM

  // Vibration (mm/s × 100)
  holdingRegisters[50] = 230;  // 2.30 mm/s
  holdingRegisters[51] = 450;  // 4.50 mm/s (elevated)
  holdingRegisters[52] = 120;  // 1.20 mm/s

  // Current (A × 10)
  holdingRegisters[60] = 156;  // 15.6 A
  holdingRegisters[61] = 89;   // 8.9 A
  holdingRegisters[62] = 234;  // 23.4 A

  // Power (kW × 10)
  holdingRegisters[70] = 750;  // 75.0 kW
  holdingRegisters[71] = 450;  // 45.0 kW

  // Humidity (% × 10)
  holdingRegisters[80] = 650;  // 65.0%
  holdingRegisters[81] = 420;  // 42.0%

  // Status words
  holdingRegisters[100] = 0x00FF; // All systems OK
  holdingRegisters[101] = 0x0001; // Pump running

  // Input registers - duplicate some as "read-only" sensors
  for (let i = 0; i < 100; i++) {
    inputRegisters[i] = holdingRegisters[i];
  }

  // Initialize coils
  coils[0] = 1;  // Pump 1 ON
  coils[1] = 1;  // Pump 2 ON
  coils[2] = 0;  // Pump 3 OFF
  coils[3] = 1;  // Valve 1 OPEN
  coils[4] = 0;  // Valve 2 CLOSED
  coils[5] = 1;  // Fan ON
  coils[6] = 0;  // Heater OFF
  coils[7] = 1;  // Alarm ACK

  // Discrete inputs
  discreteInputs[0] = 1;  // High level switch
  discreteInputs[1] = 0;  // Low level switch
  discreteInputs[2] = 1;  // Pressure switch
  discreteInputs[3] = 0;  // Flow switch
  discreteInputs[4] = 1;  // Motor running
  discreteInputs[5] = 0;  // Fault indicator
  discreteInputs[6] = 1;  // Ready signal
  discreteInputs[7] = 0;  // Emergency stop (not triggered)

  console.log('[Modbus Simulator] Registers initialized with industrial values');
}

// Simulate sensor value fluctuations
function simulateValues() {
  // Temperature sensors: small random walk
  for (let i = 0; i <= 4; i++) {
    const delta = (Math.random() - 0.5) * 20;
    holdingRegisters[i] = Math.max(100, Math.min(5000, holdingRegisters[i] + delta));
  }
  // Pressure sensors
  for (let i = 10; i <= 12; i++) {
    const delta = (Math.random() - 0.5) * 50;
    holdingRegisters[i] = Math.max(500, Math.min(8000, holdingRegisters[i] + delta));
  }
  // Flow rate
  for (let i = 20; i <= 21; i++) {
    const delta = (Math.random() - 0.5) * 30;
    holdingRegisters[i] = Math.max(0, Math.min(5000, holdingRegisters[i] + delta));
  }
  // Tank levels (slow decrease, simulating usage)
  for (let i = 30; i <= 32; i++) {
    holdingRegisters[i] = Math.max(0, holdingRegisters[i] - Math.random() * 5 + Math.random() * 2);
    if (holdingRegisters[i] < 500) holdingRegisters[i] = 8000 + Math.random() * 1000; // refill
  }
  // Vibration
  holdingRegisters[50] = Math.max(50, Math.min(800, holdingRegisters[50] + (Math.random() - 0.5) * 20));
  holdingRegisters[51] = Math.max(100, Math.min(1000, holdingRegisters[51] + (Math.random() - 0.3) * 30)); // tends to increase
  // Motor speed
  for (let i = 40; i <= 42; i++) {
    const delta = (Math.random() - 0.5) * 10;
    holdingRegisters[i] = Math.max(0, holdingRegisters[i] + delta);
  }

  // Sync input registers with holding registers (read-only mirror)
  for (let i = 0; i < 100; i++) {
    inputRegisters[i] = holdingRegisters[i];
  }

  // Random discrete input changes (simulating switches)
  if (Math.random() > 0.95) {
    const idx = Math.floor(Math.random() * 8);
    discreteInputs[idx] = discreteInputs[idx] ? 0 : 1;
  }
}

// Transaction ID counter
let transactionId = 0;

function createMBAPResponse(tid: number, unitId: number, data: Uint8Array): Buffer {
  const length = 1 + data.length; // unit ID + PDU
  const mbap = Buffer.alloc(MBAP_HEADER_SIZE + data.length);
  mbap.writeUInt16BE(tid, 0);
  mbap.writeUInt16BE(0, 2); // Protocol ID = 0 (Modbus)
  mbap.writeUInt16BE(length, 4);
  mbap.writeUInt8(unitId, 6);
  Buffer.from(data).copy(mbap, 7);
  return mbap;
}

function createExceptionResponse(functionCode: number, exceptionCode: number): Uint8Array {
  return new Uint8Array([functionCode | 0x80, exceptionCode]);
}

const EXCEPTION_CODES = {
  ILLEGAL_FUNCTION: 1,
  ILLEGAL_DATA_ADDRESS: 2,
  ILLEGAL_DATA_VALUE: 3,
  SERVER_DEVICE_FAILURE: 4,
};

function handleModbusRequest(unitId: number, pdu: Uint8Array): { data: Uint8Array; unitId: number } {
  if (pdu.length < 1) {
    return { data: createExceptionResponse(0, EXCEPTION_CODES.SERVER_DEVICE_FAILURE), unitId };
  }

  const functionCode = pdu[0];

  switch (functionCode) {
    case 0x01: return handleReadCoils(unitId, pdu);
    case 0x02: return handleReadDiscreteInputs(unitId, pdu);
    case 0x03: return handleReadHoldingRegisters(unitId, pdu);
    case 0x04: return handleReadInputRegisters(unitId, pdu);
    case 0x05: return handleWriteSingleCoil(unitId, pdu);
    case 0x06: return handleWriteSingleRegister(unitId, pdu);
    case 0x0F: return handleWriteMultipleCoils(unitId, pdu);
    case 0x10: return handleWriteMultipleRegisters(unitId, pdu);
    case 0x2B: return handleReadDeviceIdentification(unitId, pdu);
    default:
      return { data: createExceptionResponse(functionCode, EXCEPTION_CODES.ILLEGAL_FUNCTION), unitId };
  }
}

function handleReadCoils(unitId: number, pdu: Uint8Array) {
  if (pdu.length < 5) return { data: createExceptionResponse(0x01, EXCEPTION_CODES.ILLEGAL_DATA_VALUE), unitId };
  const startAddr = pdu[1] << 8 | pdu[2];
  const quantity = pdu[3] << 8 | pdu[4];
  if (quantity < 1 || quantity > 2000 || startAddr + quantity > MAX_COILS) {
    return { data: createExceptionResponse(0x01, EXCEPTION_CODES.ILLEGAL_DATA_ADDRESS), unitId };
  }
  const byteCount = Math.ceil(quantity / 8);
  const response = new Uint8Array(2 + byteCount);
  response[0] = 0x01;
  response[1] = byteCount;
  for (let i = 0; i < quantity; i++) {
    if (coils[startAddr + i]) {
      response[2 + Math.floor(i / 8)] |= (1 << (i % 8));
    }
  }
  return { data: response, unitId };
}

function handleReadDiscreteInputs(unitId: number, pdu: Uint8Array) {
  if (pdu.length < 5) return { data: createExceptionResponse(0x02, EXCEPTION_CODES.ILLEGAL_DATA_VALUE), unitId };
  const startAddr = pdu[1] << 8 | pdu[2];
  const quantity = pdu[3] << 8 | pdu[4];
  if (quantity < 1 || quantity > 2000 || startAddr + quantity > MAX_COILS) {
    return { data: createExceptionResponse(0x02, EXCEPTION_CODES.ILLEGAL_DATA_ADDRESS), unitId };
  }
  const byteCount = Math.ceil(quantity / 8);
  const response = new Uint8Array(2 + byteCount);
  response[0] = 0x02;
  response[1] = byteCount;
  for (let i = 0; i < quantity; i++) {
    if (discreteInputs[startAddr + i]) {
      response[2 + Math.floor(i / 8)] |= (1 << (i % 8));
    }
  }
  return { data: response, unitId };
}

function handleReadHoldingRegisters(unitId: number, pdu: Uint8Array) {
  if (pdu.length < 5) return { data: createExceptionResponse(0x03, EXCEPTION_CODES.ILLEGAL_DATA_VALUE), unitId };
  const startAddr = pdu[1] << 8 | pdu[2];
  const quantity = pdu[3] << 8 | pdu[4];
  if (quantity < 1 || quantity > 125 || startAddr + quantity > MAX_REGISTERS) {
    return { data: createExceptionResponse(0x03, EXCEPTION_CODES.ILLEGAL_DATA_ADDRESS), unitId };
  }
  const byteCount = quantity * 2;
  const response = new Uint8Array(2 + byteCount);
  response[0] = 0x03;
  response[1] = byteCount;
  for (let i = 0; i < quantity; i++) {
    const value = Math.round(holdingRegisters[startAddr + i]);
    response[2 + i * 2] = (value >> 8) & 0xFF;
    response[3 + i * 2] = value & 0xFF;
  }
  console.log(`  [FC03] Read ${quantity} holding regs from ${startAddr}: [${Array.from({ length: quantity }, (_, i) => Math.round(holdingRegisters[startAddr + i])).join(', ')}]`);
  return { data: response, unitId };
}

function handleReadInputRegisters(unitId: number, pdu: Uint8Array) {
  if (pdu.length < 5) return { data: createExceptionResponse(0x04, EXCEPTION_CODES.ILLEGAL_DATA_VALUE), unitId };
  const startAddr = pdu[1] << 8 | pdu[2];
  const quantity = pdu[3] << 8 | pdu[4];
  if (quantity < 1 || quantity > 125 || startAddr + quantity > MAX_REGISTERS) {
    return { data: createExceptionResponse(0x04, EXCEPTION_CODES.ILLEGAL_DATA_ADDRESS), unitId };
  }
  const byteCount = quantity * 2;
  const response = new Uint8Array(2 + byteCount);
  response[0] = 0x04;
  response[1] = byteCount;
  for (let i = 0; i < quantity; i++) {
    const value = Math.round(inputRegisters[startAddr + i]);
    response[2 + i * 2] = (value >> 8) & 0xFF;
    response[3 + i * 2] = value & 0xFF;
  }
  return { data: response, unitId };
}

function handleWriteSingleCoil(unitId: number, pdu: Uint8Array) {
  if (pdu.length < 5) return { data: createExceptionResponse(0x05, EXCEPTION_CODES.ILLEGAL_DATA_VALUE), unitId };
  const outputAddr = pdu[1] << 8 | pdu[2];
  const outputValue = pdu[3] << 8 | pdu[4];
  if (outputAddr >= MAX_COILS || (outputValue !== 0xFF00 && outputValue !== 0x0000)) {
    return { data: createExceptionResponse(0x05, EXCEPTION_CODES.ILLEGAL_DATA_ADDRESS), unitId };
  }
  coils[outputAddr] = outputValue === 0xFF00 ? 1 : 0;
  const response = new Uint8Array(pdu.length);
  response.set(pdu);
  console.log(`  [FC05] Write coil ${outputAddr} = ${outputValue === 0xFF00 ? 'ON' : 'OFF'}`);
  return { data: response, unitId };
}

function handleWriteSingleRegister(unitId: number, pdu: Uint8Array) {
  if (pdu.length < 5) return { data: createExceptionResponse(0x06, EXCEPTION_CODES.ILLEGAL_DATA_VALUE), unitId };
  const regAddr = pdu[1] << 8 | pdu[2];
  const regValue = pdu[3] << 8 | pdu[4];
  if (regAddr >= MAX_REGISTERS) {
    return { data: createExceptionResponse(0x06, EXCEPTION_CODES.ILLEGAL_DATA_ADDRESS), unitId };
  }
  holdingRegisters[regAddr] = regValue;
  const response = new Uint8Array(pdu.length);
  response.set(pdu);
  console.log(`  [FC06] Write register ${regAddr} = ${regValue}`);
  return { data: response, unitId };
}

function handleWriteMultipleCoils(unitId: number, pdu: Uint8Array) {
  if (pdu.length < 6) return { data: createExceptionResponse(0x0F, EXCEPTION_CODES.ILLEGAL_DATA_VALUE), unitId };
  const startAddr = pdu[1] << 8 | pdu[2];
  const quantity = pdu[3] << 8 | pdu[4];
  const byteCount = pdu[5];
  if (quantity < 1 || quantity > 1968 || startAddr + quantity > MAX_COILS) {
    return { data: createExceptionResponse(0x0F, EXCEPTION_CODES.ILLEGAL_DATA_ADDRESS), unitId };
  }
  for (let i = 0; i < quantity; i++) {
    const byteIdx = 6 + Math.floor(i / 8);
    if (byteIdx < pdu.length) {
      coils[startAddr + i] = (pdu[byteIdx] >> (i % 8)) & 1;
    }
  }
  const response = new Uint8Array(5);
  response[0] = 0x0F;
  response[1] = pdu[1]; response[2] = pdu[2];
  response[3] = pdu[3]; response[4] = pdu[4];
  console.log(`  [FC15] Write ${quantity} coils from ${startAddr}`);
  return { data: response, unitId };
}

function handleWriteMultipleRegisters(unitId: number, pdu: Uint8Array) {
  if (pdu.length < 6) return { data: createExceptionResponse(0x10, EXCEPTION_CODES.ILLEGAL_DATA_VALUE), unitId };
  const startAddr = pdu[1] << 8 | pdu[2];
  const quantity = pdu[3] << 8 | pdu[4];
  const byteCount = pdu[5];
  if (quantity < 1 || quantity > 123 || startAddr + quantity > MAX_REGISTERS) {
    return { data: createExceptionResponse(0x10, EXCEPTION_CODES.ILLEGAL_DATA_ADDRESS), unitId };
  }
  for (let i = 0; i < quantity; i++) {
    const byteIdx = 6 + i * 2;
    if (byteIdx + 1 < pdu.length) {
      holdingRegisters[startAddr + i] = (pdu[byteIdx] << 8) | pdu[byteIdx + 1];
    }
  }
  const response = new Uint8Array(5);
  response[0] = 0x10;
  response[1] = pdu[1]; response[2] = pdu[2];
  response[3] = pdu[3]; response[4] = pdu[4];
  console.log(`  [FC16] Write ${quantity} registers from ${startAddr}`);
  return { data: response, unitId };
}

function handleReadDeviceIdentification(unitId: number, pdu: Uint8Array) {
  const response = new Uint8Array([
    0x2B, 0x0E, 0x01, 0x00,
    ...Buffer.from('NEURON-SIM'), // Vendor name (max 34 bytes with padding)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x01, 0x00,
    ...Buffer.from('Edge Gateway Simulator'),
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x02, 0x00,
    ...Buffer.from('v2.1.0'),
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  return { data: response, unitId };
}

// ====== REST API for the simulator ======
function createHttpServer() {
  const server = Bun.serve({
    port: PORT,
    fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;

      // CORS headers
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
      }

      // Health check
      if (path === '/api/health') {
        return new Response(JSON.stringify({
          status: 'running',
          uptime: process.uptime(),
          port: PORT,
          protocol: 'Modbus TCP',
          version: '2.1.0',
          registers: {
            holding: MAX_REGISTERS,
            input: MAX_REGISTERS,
            coils: MAX_COILS,
            discreteInputs: MAX_COILS,
          },
          connections: 0,
        }), { headers });
      }

      // Read registers
      if (path === '/api/registers' && req.method === 'GET') {
        const start = parseInt(url.searchParams.get('start') || '0');
        const count = Math.min(parseInt(url.searchParams.get('count') || '10'), 100);
        const type = url.searchParams.get('type') || 'holding';

        const registers: { address: number; value: number; raw: number }[] = [];
        const source = type === 'input' ? inputRegisters : holdingRegisters;

        for (let i = start; i < start + count && i < MAX_REGISTERS; i++) {
          const raw = Math.round(source[i]);
          registers.push({ address: i, value: source[i], raw });
        }

        return new Response(JSON.stringify({
          type,
          start,
          count: registers.length,
          registers,
          timestamp: new Date().toISOString(),
        }), { headers });
      }

      // Write register
      if (path === '/api/registers/write' && req.method === 'POST') {
        return req.json().then((body: any) => {
          const { address, value, type } = body;
          if (address < 0 || address >= MAX_REGISTERS) {
            return new Response(JSON.stringify({ error: 'Address out of range' }), { status: 400, headers });
          }
          const target = type === 'input' ? inputRegisters : holdingRegisters;
          target[address] = value;
          console.log(`  [HTTP] Write register ${address} = ${value} (${type})`);
          return new Response(JSON.stringify({
            success: true,
            address,
            value: target[address],
            type,
          }), { headers });
        });
      }

      // Read coils
      if (path === '/api/coils' && req.method === 'GET') {
        const start = parseInt(url.searchParams.get('start') || '0');
        const count = Math.min(parseInt(url.searchParams.get('count') || '10'), 200);

        const result: { address: number; value: boolean }[] = [];
        for (let i = start; i < start + count && i < MAX_COILS; i++) {
          result.push({ address: i, value: !!coils[i] });
        }

        return new Response(JSON.stringify({
          start,
          count: result.length,
          coils: result,
          timestamp: new Date().toISOString(),
        }), { headers });
      }

      // Write coil
      if (path === '/api/coils/write' && req.method === 'POST') {
        return req.json().then((body: any) => {
          const { address, value } = body;
          if (address < 0 || address >= MAX_COILS) {
            return new Response(JSON.stringify({ error: 'Address out of range' }), { status: 400, headers });
          }
          coils[address] = value ? 1 : 0;
          return new Response(JSON.stringify({
            success: true,
            address,
            value: !!coils[address],
          }), { headers });
        });
      }

      // Get all data as a snapshot
      if (path === '/api/snapshot' && req.method === 'GET') {
        const snapshot = {
          holdingRegisters: Array.from(holdingRegisters.slice(0, 200)).map((v, i) => ({
            address: i, value: Math.round(v),
          })),
          inputRegisters: Array.from(inputRegisters.slice(0, 200)).map((v, i) => ({
            address: i, value: Math.round(v),
          })),
          coils: Array.from(coils.slice(0, 100)).map((v, i) => ({
            address: i, value: !!v,
          })),
          discreteInputs: Array.from(discreteInputs.slice(0, 100)).map((v, i) => ({
            address: i, value: !!v,
          })),
          timestamp: new Date().toISOString(),
        };
        return new Response(JSON.stringify(snapshot), { headers });
      }

      // Register map description
      if (path === '/api/map' && req.method === 'GET') {
        const map = [
          { range: '0-4', type: 'holding', description: 'Температурные датчики (°C × 10)', unit: '°C', scale: 0.1 },
          { range: '10-12', type: 'holding', description: 'Датчики давления (бар × 100)', unit: 'бар', scale: 0.01 },
          { range: '20-21', type: 'holding', description: 'Расходомеры (м³/ч × 100)', unit: 'м³/ч', scale: 0.01 },
          { range: '30-32', type: 'holding', description: 'Уровни в баках (л)', unit: 'л', scale: 1 },
          { range: '40-42', type: 'holding', description: 'Скорость двигателей (об/мин)', unit: 'об/мин', scale: 1 },
          { range: '50-52', type: 'holding', description: 'Вибрация (мм/с × 100)', unit: 'мм/с', scale: 0.01 },
          { range: '60-62', type: 'holding', description: 'Ток (А × 10)', unit: 'А', scale: 0.1 },
          { range: '70-71', type: 'holding', description: 'Мощность (кВт × 10)', unit: 'кВт', scale: 0.1 },
          { range: '80-81', type: 'holding', description: 'Влажность (% × 10)', unit: '%', scale: 0.1 },
          { range: '100-101', type: 'holding', description: 'Слово состояния', unit: '', scale: 1 },
          { range: '0-7', type: 'coil', description: 'Управляющие катушки (насосы, клапаны, вентиляторы)', unit: '', scale: 1 },
          { range: '0-7', type: 'discrete', description: 'Дискретные входы (конечные выключатели, датчики)', unit: '', scale: 1 },
        ];
        return new Response(JSON.stringify(map), { headers });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
    },
  });

  console.log(`[Modbus Simulator] HTTP REST API listening on http://0.0.0.0:${PORT}`);
  console.log(`[Modbus Simulator] Endpoints:`);
  console.log(`  GET  /api/health        - Health check`);
  console.log(`  GET  /api/registers      - Read registers (?start=0&count=10&type=holding|input)`);
  console.log(`  POST /api/registers/write - Write register ({address, value, type})`);
  console.log(`  GET  /api/coils          - Read coils (?start=0&count=10)`);
  console.log(`  POST /api/coils/write    - Write coil ({address, value})`);
  console.log(`  GET  /api/snapshot       - Full data snapshot`);
  console.log(`  GET  /api/map            - Register map description`);
  console.log(`\n[Modbus Simulator] Modbus TCP protocol available on same port`);
  console.log(`[Modbus Simulator] Supports FC01-06, FC15-16, FC43 (Read Device ID)`);

  return server;
}

// Initialize and start
initializeRegisters();
createHttpServer();

// Start value simulation every 2 seconds
setInterval(() => {
  simulateValues();
}, 2000);

console.log(`\n[Modbus Simulator] Value simulation started (updates every 2s)`);
console.log(`[Modbus Simulator] Ready on port ${PORT}`);
