/**
 * Comprehensive Protocol Registry
 * 
 * OPA-S (Open Platform Architecture - South) compliant protocol definitions.
 * Each protocol has:
 * - Basic connection settings (host, port, etc.)
 * - Advanced protocol-specific settings
 * - Serial settings (if applicable)
 * - Default tag templates
 * - Data type mappings
 * - OPA-S attribution (opaS, opaSCategory, opaSCompliance)
 */

export interface ProtocolField {
  key: string;
  label: string;
  labelEn: string;
  type: 'number' | 'string' | 'select' | 'boolean' | 'json';
  defaultValue: string | number | boolean;
  placeholder?: string;
  description?: string;
  descriptionEn?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  group?: string;
}

export type OpaSCategory =
  | 'industrial-plc'
  | 'building-automation'
  | 'process-automation'
  | 'energy'
  | 'iot-edge'
  | 'database'
  | 'cloud'
  | 'legacy';

export type OpaSCompliance = 'full' | 'partial' | 'planned';

export interface ProtocolDef {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  icon: string; // lucide icon name
  color: string; // tailwind color class
  transport: 'tcp' | 'serial' | 'udp' | 'tcp_udp';
  defaultPort: number;
  isSerial: boolean;
  description: string;
  descriptionEn: string;
  version: string;
  status: 'stable' | 'beta' | 'experimental';
  supportedFC?: number[]; // Modbus function codes
  fields: ProtocolField[];
  serialFields?: ProtocolField[];
  defaultTags?: { name: string; address: string; type: string; description: string }[];
  byteOrder?: string[];
  wordOrder?: string[];
  // OPA-S attribution
  opaS?: boolean;
  opaSCategory?: OpaSCategory;
  opaSCompliance?: OpaSCompliance;
}

export const OPA_S_CATEGORIES: { id: OpaSCategory; name: string; nameEn: string; icon: string; color: string }[] = [
  { id: 'industrial-plc', name: 'Промышленные ПЛК', nameEn: 'Industrial PLCs', icon: 'Factory', color: 'text-violet-600 dark:text-violet-400' },
  { id: 'building-automation', name: 'Автоматизация зданий', nameEn: 'Building Automation', icon: 'Building', color: 'text-pink-600 dark:text-pink-400' },
  { id: 'process-automation', name: 'Процессная автоматизация', nameEn: 'Process Automation', icon: 'Cpu', color: 'text-cyan-600 dark:text-cyan-400' },
  { id: 'energy', name: 'Энергетика', nameEn: 'Energy', icon: 'Zap', color: 'text-amber-600 dark:text-amber-400' },
  { id: 'iot-edge', name: 'IoT Edge', nameEn: 'IoT Edge', icon: 'Radio', color: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'database', name: 'Базы данных', nameEn: 'Database Sinks', icon: 'Database', color: 'text-orange-600 dark:text-orange-400' },
  { id: 'cloud', name: 'Облачные платформы', nameEn: 'Cloud Platforms', icon: 'Cloud', color: 'text-sky-600 dark:text-sky-400' },
  { id: 'legacy', name: 'Устаревшие протоколы', nameEn: 'Legacy Protocols', icon: 'FileText', color: 'text-zinc-500 dark:text-zinc-400' },
];

export const PROTOCOL_CATEGORIES = [
  { id: 'modbus', name: 'Modbus', nameEn: 'Modbus', icon: 'Cpu' },
  { id: 'opcua', name: 'OPC UA', nameEn: 'OPC UA', icon: 'Link' },
  { id: 'industrial', name: 'Промышленные', nameEn: 'Industrial', icon: 'Factory' },
  { id: 'building', name: 'Здания', nameEn: 'Building', icon: 'Building' },
  { id: 'power', name: 'Энергетика', nameEn: 'Power', icon: 'Zap' },
  { id: 'network', name: 'Сетевые', nameEn: 'Network', icon: 'Network' },
  { id: 'cloud', name: 'Облачные', nameEn: 'Cloud', icon: 'Cloud' },
  { id: 'custom', name: 'Пользовательские', nameEn: 'Custom', icon: 'Code' },
];

// ─── Shared field templates ────────────────────────────────────────────────────
const HOST_FIELD = (port: number) => ({ key: 'host' as const, label: 'Хост', labelEn: 'Host', type: 'string' as const, defaultValue: `192.168.1.${Math.min(port % 250, 250)}`, required: true, group: 'connection' });
const PORT_FIELD = (port: number, min = 1, max = 65535) => ({ key: 'port' as const, label: 'Порт', labelEn: 'Port', type: 'number' as const, defaultValue: port, min, max, group: 'connection' });
const TIMEOUT_FIELD = (def = 5000) => ({ key: 'timeout' as const, label: 'Таймаут (мс)', labelEn: 'Timeout (ms)', type: 'number' as const, defaultValue: def, min: 100, max: 60000, group: 'timing' });
const POLL_FIELD = (def = 1000) => ({ key: 'pollInterval' as const, label: 'Интервал опроса (мс)', labelEn: 'Poll Interval', type: 'number' as const, defaultValue: def, min: 50, max: 60000, group: 'timing' });
const RECONNECT_FIELD = { key: 'autoReconnect' as const, label: 'Авто-переподключение', labelEn: 'Auto Reconnect', type: 'boolean' as const, defaultValue: true, group: 'advanced' };

export const PROTOCOLS: ProtocolDef[] = [
  // ==================== MODBUS FAMILY ====================
  {
    id: 'modbus-tcp', name: 'Modbus TCP', nameEn: 'Modbus TCP',
    category: 'modbus', icon: 'Cpu', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    transport: 'tcp', defaultPort: 502, isSerial: false,
    description: 'Modbus TCP/IP — промышленный протокол обмена данными по TCP',
    descriptionEn: 'Modbus TCP/IP — industrial data communication over TCP',
    version: '3.2.1', status: 'stable', supportedFC: [1, 2, 3, 4, 5, 6, 15, 16, 43],
    byteOrder: ['big-endian', 'little-endian', 'big-endian-swap', 'little-endian-swap'],
    wordOrder: ['big-endian', 'little-endian'],
    opaS: true, opaSCategory: 'industrial-plc', opaSCompliance: 'full',
    fields: [
      { key: 'host', label: 'Хост', labelEn: 'Host', type: 'string', defaultValue: '192.168.1.10', placeholder: '192.168.1.10', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 502, min: 1, max: 65535, group: 'connection' },
      { key: 'slaveId', label: 'ID подчинённого', labelEn: 'Slave ID', type: 'number', defaultValue: 1, min: 1, max: 247, description: 'Modbus Unit ID', group: 'connection' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout (ms)', type: 'number', defaultValue: 5000, min: 100, max: 60000, group: 'timing' },
      { key: 'retries', label: 'Повторы', labelEn: 'Retries', type: 'number', defaultValue: 3, min: 0, max: 10, group: 'timing' },
      { key: 'pollInterval', label: 'Интервал опроса (мс)', labelEn: 'Poll Interval', type: 'number', defaultValue: 1000, min: 50, max: 60000, group: 'timing' },
      { key: 'byteOrder', label: 'Порядок байтов', labelEn: 'Byte Order', type: 'select', defaultValue: 'big-endian', group: 'advanced', options: [
        { value: 'big-endian', label: 'AB CD (Big Endian)' },
        { value: 'little-endian', label: 'DC BA (Little Endian)' },
        { value: 'big-endian-swap', label: 'CD AB (Big Endian Swap)' },
        { value: 'little-endian-swap', label: 'BA DC (Little Endian Swap)' },
      ]},
      { key: 'wordOrder', label: 'Порядок слов', labelEn: 'Word Order', type: 'select', defaultValue: 'big-endian', group: 'advanced', options: [
        { value: 'big-endian', label: 'AB CD (Big Endian)' },
        { value: 'little-endian', label: 'CD AB (Little Endian)' },
      ]},
      { key: 'autoReconnect', label: 'Авто-переподключение', labelEn: 'Auto Reconnect', type: 'boolean', defaultValue: true, group: 'advanced' },
      { key: 'reconnectInterval', label: 'Интервал переподключения (мс)', labelEn: 'Reconnect Interval', type: 'number', defaultValue: 5000, min: 1000, max: 60000, group: 'advanced' },
      { key: 'maxConcurrentRequests', label: 'Макс. параллельных запросов', labelEn: 'Max Concurrent', type: 'number', defaultValue: 3, min: 1, max: 20, group: 'advanced' },
      { key: 'stripLeadingZeros', label: 'Убирать ведущие нули', labelEn: 'Strip Leading Zeros', type: 'boolean', defaultValue: false, group: 'advanced' },
      { key: 'checkCrc', label: 'Проверять CRC', labelEn: 'Check CRC', type: 'boolean', defaultValue: true, group: 'advanced' },
    ],
    defaultTags: [
      { name: 'Датчик температуры 1', address: '40001', type: 'FLOAT', description: 'Температура (°C)' },
      { name: 'Датчик давления 1', address: '40003', type: 'FLOAT', description: 'Давление (бар)' },
      { name: 'Уровень бака', address: '40005', type: 'INT16', description: 'Уровень (л)' },
      { name: 'Состояние насоса', address: '00001', type: 'BOOL', description: 'ВКЛ/ВЫКЛ' },
      { name: 'Скорость двигателя', address: '40007', type: 'INT16', description: 'RPM' },
      { name: 'Ток фазы A', address: '40009', type: 'FLOAT', description: 'Ампер' },
    ],
  },
  {
    id: 'modbus-rtu', name: 'Modbus RTU', nameEn: 'Modbus RTU',
    category: 'modbus', icon: 'Cable', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    transport: 'serial', defaultPort: 0, isSerial: true,
    description: 'Modbus RTU через RS-232/RS-485/RS-422',
    descriptionEn: 'Modbus RTU over RS-232/RS-485/RS-422 serial line',
    version: '2.8.0', status: 'stable', supportedFC: [1, 2, 3, 4, 5, 6, 15, 16],
    byteOrder: ['big-endian', 'little-endian', 'big-endian-swap', 'little-endian-swap'],
    opaS: true, opaSCategory: 'industrial-plc', opaSCompliance: 'full',
    fields: [
      { key: 'slaveId', label: 'ID подчинённого', labelEn: 'Slave ID', type: 'number', defaultValue: 1, min: 1, max: 247, group: 'connection' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout (ms)', type: 'number', defaultValue: 3000, min: 100, max: 30000, group: 'timing' },
      { key: 'retries', label: 'Повторы', labelEn: 'Retries', type: 'number', defaultValue: 2, min: 0, max: 10, group: 'timing' },
      { key: 'pollInterval', label: 'Интервал опроса (мс)', labelEn: 'Poll Interval', type: 'number', defaultValue: 2000, min: 50, max: 60000, group: 'timing' },
      { key: 'byteOrder', label: 'Порядок байтов', labelEn: 'Byte Order', type: 'select', defaultValue: 'big-endian', group: 'advanced', options: [
        { value: 'big-endian', label: 'AB CD (Big Endian)' },
        { value: 'little-endian', label: 'DC BA (Little Endian)' },
      ]},
      { key: 'interFrameDelay', label: 'Межкадровая задержка (мс)', labelEn: 'Inter-frame Delay', type: 'number', defaultValue: 50, min: 10, max: 500, group: 'advanced' },
      { key: 'autoReconnect', label: 'Авто-переподключение', labelEn: 'Auto Reconnect', type: 'boolean', defaultValue: true, group: 'advanced' },
    ],
    serialFields: [
      { key: 'port', label: 'Последовательный порт', labelEn: 'Serial Port', type: 'select', defaultValue: '/dev/ttyUSB0', group: 'serial', required: true, options: [
        { value: '/dev/ttyUSB0', label: '/dev/ttyUSB0' }, { value: '/dev/ttyUSB1', label: '/dev/ttyUSB1' },
        { value: '/dev/ttyUSB2', label: '/dev/ttyUSB2' }, { value: '/dev/ttyS0', label: '/dev/ttyS0' },
        { value: '/dev/ttyS1', label: '/dev/ttyS1' }, { value: '/dev/ttyAMA0', label: '/dev/ttyAMA0 (Raspberry Pi)' },
        { value: 'COM1', label: 'COM1 (Windows)' }, { value: 'COM2', label: 'COM2 (Windows)' },
        { value: 'COM3', label: 'COM3 (Windows)' }, { value: 'COM4', label: 'COM4 (Windows)' },
      ]},
      { key: 'baudRate', label: 'Скорость (бод)', labelEn: 'Baud Rate', type: 'select', defaultValue: '9600', group: 'serial', options: [
        { value: '1200', label: '1200' }, { value: '2400', label: '2400' }, { value: '4800', label: '4800' },
        { value: '9600', label: '9600 (default)' }, { value: '19200', label: '19200' },
        { value: '38400', label: '38400' }, { value: '57600', label: '57600' },
        { value: '115200', label: '115200' }, { value: '230400', label: '230400' },
        { value: '460800', label: '460800' }, { value: '921600', label: '921600' },
      ]},
      { key: 'dataBits', label: 'Биты данных', labelEn: 'Data Bits', type: 'select', defaultValue: '8', group: 'serial', options: [
        { value: '7', label: '7' }, { value: '8', label: '8 (default)' },
      ]},
      { key: 'stopBits', label: 'Стоп-биты', labelEn: 'Stop Bits', type: 'select', defaultValue: '1', group: 'serial', options: [
        { value: '1', label: '1 (default)' }, { value: '2', label: '2' },
      ]},
      { key: 'parity', label: 'Чётность', labelEn: 'Parity', type: 'select', defaultValue: 'none', group: 'serial', options: [
        { value: 'none', label: 'Нет (None)' }, { value: 'even', label: 'Чёт (Even)' },
        { value: 'odd', label: 'Нечёт (Odd)' }, { value: 'mark', label: 'Маркер (Mark)' },
        { value: 'space', label: 'Пробел (Space)' },
      ]},
      { key: 'flowControl', label: 'Управление потоком', labelEn: 'Flow Control', type: 'select', defaultValue: 'none', group: 'serial', options: [
        { value: 'none', label: 'Нет' }, { value: 'hardware', label: 'Аппаратное (RTS/CTS)' },
        { value: 'software', label: 'Программное (XON/XOFF)' },
      ]},
    ],
  },
  {
    id: 'modbus-ascii', name: 'Modbus ASCII', nameEn: 'Modbus ASCII',
    category: 'modbus', icon: 'FileText', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    transport: 'serial', defaultPort: 0, isSerial: true,
    description: 'Modbus ASCII — текстовый режим для медленных линий',
    descriptionEn: 'Modbus ASCII — text mode for slow serial lines',
    version: '2.7.0', status: 'stable', supportedFC: [1, 2, 3, 4, 5, 6, 15, 16],
    opaS: true, opaSCategory: 'legacy', opaSCompliance: 'full',
    fields: [
      { key: 'slaveId', label: 'ID подчинённого', labelEn: 'Slave ID', type: 'number', defaultValue: 1, min: 1, max: 247, group: 'connection' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 5000, min: 100, max: 30000, group: 'timing' },
      { key: 'pollInterval', label: 'Интервал опроса (мс)', labelEn: 'Poll Interval', type: 'number', defaultValue: 3000, min: 100, max: 60000, group: 'timing' },
    ],
    serialFields: [
      { key: 'port', label: 'Последовательный порт', labelEn: 'Serial Port', type: 'select', defaultValue: '/dev/ttyUSB0', group: 'serial', options: [
        { value: '/dev/ttyUSB0', label: '/dev/ttyUSB0' }, { value: '/dev/ttyUSB1', label: '/dev/ttyUSB1' },
        { value: '/dev/ttyS0', label: '/dev/ttyS0' }, { value: 'COM1', label: 'COM1' },
      ]},
      { key: 'baudRate', label: 'Скорость (бод)', labelEn: 'Baud Rate', type: 'select', defaultValue: '9600', group: 'serial', options: [
        { value: '1200', label: '1200' }, { value: '2400', label: '2400' }, { value: '4800', label: '4800' },
        { value: '9600', label: '9600' }, { value: '19200', label: '19200' },
      ]},
      { key: 'dataBits', label: 'Биты данных', labelEn: 'Data Bits', type: 'select', defaultValue: '7', group: 'serial', options: [{ value: '7', label: '7' }, { value: '8', label: '8' }] },
      { key: 'parity', label: 'Чётность', labelEn: 'Parity', type: 'select', defaultValue: 'even', group: 'serial', options: [
        { value: 'none', label: 'Нет' }, { value: 'even', label: 'Чёт (Even)' }, { value: 'odd', label: 'Нечёт (Odd)' },
      ]},
      { key: 'stopBits', label: 'Стоп-биты', labelEn: 'Stop Bits', type: 'select', defaultValue: '1', group: 'serial', options: [{ value: '1', label: '1' }, { value: '2', label: '2' }] },
    ],
  },

  // ==================== OPC UA ====================
  {
    id: 'opcua', name: 'OPC UA', nameEn: 'OPC UA',
    category: 'opcua', icon: 'Link', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    transport: 'tcp', defaultPort: 4840, isSerial: false,
    description: 'OPC Unified Architecture — стандартный промышленный протокол',
    descriptionEn: 'OPC Unified Architecture — standard industrial protocol',
    version: '1.5.3', status: 'stable',
    opaS: true, opaSCategory: 'process-automation', opaSCompliance: 'full',
    fields: [
      { key: 'endpoint', label: 'Endpoint URL', labelEn: 'Endpoint URL', type: 'string', defaultValue: 'opc.tcp://192.168.1.100:4840', placeholder: 'opc.tcp://host:port', required: true, group: 'connection' },
      { key: 'securityMode', label: 'Режим безопасности', labelEn: 'Security Mode', type: 'select', defaultValue: 'SignAndEncrypt', group: 'security', options: [
        { value: 'None', label: 'Нет (None)' }, { value: 'Sign', label: 'Подпись (Sign)' },
        { value: 'SignAndEncrypt', label: 'Подпись + Шифрование (SignAndEncrypt)' },
      ]},
      { key: 'securityPolicy', label: 'Политика безопасности', labelEn: 'Security Policy', type: 'select', defaultValue: 'Basic256Sha256', group: 'security', options: [
        { value: 'None', label: 'None' }, { value: 'Basic128Rsa15', label: 'Basic128Rsa15' },
        { value: 'Basic256', label: 'Basic256' }, { value: 'Basic256Sha256', label: 'Basic256Sha256' },
        { value: 'Aes128Sha256RsaOaep', label: 'Aes128Sha256RsaOaep' },
        { value: 'Aes256Sha256RsaPss', label: 'Aes256Sha256RsaPss' },
      ]},
      { key: 'authMode', label: 'Режим аутентификации', labelEn: 'Auth Mode', type: 'select', defaultValue: 'anonymous', group: 'security', options: [
        { value: 'anonymous', label: 'Анонимный' }, { value: 'username', label: 'Имя пользователя/пароль' },
        { value: 'certificate', label: 'Сертификат' }, { value: 'token', label: 'JWT Token' },
      ]},
      { key: 'username', label: 'Имя пользователя', labelEn: 'Username', type: 'string', defaultValue: '', group: 'security' },
      { key: 'password', label: 'Пароль', labelEn: 'Password', type: 'string', defaultValue: '', group: 'security' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 10000, min: 1000, max: 60000, group: 'timing' },
      { key: 'sessionTimeout', label: 'Таймаут сессии (мс)', labelEn: 'Session Timeout', type: 'number', defaultValue: 60000, min: 10000, max: 600000, group: 'timing' },
      { key: 'pollInterval', label: 'Интервал подписки (мс)', labelEn: 'Subscription Interval', type: 'number', defaultValue: 500, min: 50, max: 30000, group: 'timing' },
      { key: 'keepAlive', label: 'Keep Alive (мс)', labelEn: 'Keep Alive', type: 'number', defaultValue: 10000, min: 1000, max: 120000, group: 'advanced' },
      { key: 'autoReconnect', label: 'Авто-переподключение', labelEn: 'Auto Reconnect', type: 'boolean', defaultValue: true, group: 'advanced' },
      { key: 'minSamplingInterval', label: 'Мин. интервал выборки (мс)', labelEn: 'Min Sampling', type: 'number', defaultValue: 100, min: 10, max: 60000, group: 'advanced' },
      { key: 'queueSize', label: 'Размер очереди', labelEn: 'Queue Size', type: 'number', defaultValue: 10, min: 1, max: 100, group: 'advanced' },
      { key: 'useBinaryEncoding', label: 'Бинарное кодирование', labelEn: 'Binary Encoding', type: 'boolean', defaultValue: true, group: 'advanced' },
    ],
    defaultTags: [
      { name: 'Температура', address: 'ns=2;s=Temperature', type: 'FLOAT', description: '°C' },
      { name: 'Давление', address: 'ns=2;s=Pressure', type: 'FLOAT', description: 'бар' },
      { name: 'Состояние', address: 'ns=2;s=Status', type: 'BOOL', description: '' },
    ],
  },

  // ==================== INDUSTRIAL PLCs ====================
  {
    id: 'siemens-s7', name: 'Siemens S7', nameEn: 'Siemens S7',
    category: 'industrial', icon: 'Factory', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    transport: 'tcp', defaultPort: 102, isSerial: false,
    description: 'Siemens S7-200/300/400/1200/1500 PLC',
    descriptionEn: 'Siemens S7-200/300/400/1200/1500 PLC communication',
    version: '2.0.0', status: 'stable',
    opaS: true, opaSCategory: 'industrial-plc', opaSCompliance: 'full',
    fields: [
      { key: 'host', label: 'IP адрес PLC', labelEn: 'PLC IP', type: 'string', defaultValue: '192.168.1.50', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 102, group: 'connection' },
      { key: 'plcType', label: 'Тип PLC', labelEn: 'PLC Type', type: 'select', defaultValue: 'S7-1200', group: 'connection', options: [
        { value: 'S7-200', label: 'S7-200' }, { value: 'S7-300', label: 'S7-300' },
        { value: 'S7-400', label: 'S7-400' }, { value: 'S7-1200', label: 'S7-1200' },
        { value: 'S7-1500', label: 'S7-1500' }, { value: 'Logo', label: 'LOGO!' },
      ]},
      { key: 'rack', label: 'Rack', labelEn: 'Rack', type: 'number', defaultValue: 0, min: 0, max: 16, group: 'connection' },
      { key: 'slot', label: 'Slot', labelEn: 'Slot', type: 'number', defaultValue: 1, min: 0, max: 31, group: 'connection' },
      { key: 'localTSAP', label: 'Локальный TSAP', labelEn: 'Local TSAP', type: 'string', defaultValue: '1.1', group: 'advanced' },
      { key: 'remoteTSAP', label: 'Удалённый TSAP', labelEn: 'Remote TSAP', type: 'string', defaultValue: '1.1', group: 'advanced' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 3000, min: 500, max: 30000, group: 'timing' },
      { key: 'pollInterval', label: 'Интервал опроса (мс)', labelEn: 'Poll Interval', type: 'number', defaultValue: 500, min: 50, max: 30000, group: 'timing' },
      { key: 'maxRequestsPerSecond', label: 'Макс. запросов/сек', labelEn: 'Max Requests/s', type: 'number', defaultValue: 20, min: 1, max: 100, group: 'advanced' },
      { key: 'autoReconnect', label: 'Авто-переподключение', labelEn: 'Auto Reconnect', type: 'boolean', defaultValue: true, group: 'advanced' },
    ],
    defaultTags: [
      { name: 'DB1.DBX0.0', address: 'DB1.DBX0.0', type: 'BOOL', description: 'Флаг 1' },
      { name: 'DB1.DBW2', address: 'DB1.DBW2', type: 'INT16', description: 'Слово данных' },
      { name: 'DB1.DBD4', address: 'DB1.DBD4', type: 'FLOAT', description: 'Двойное слово' },
    ],
  },
  {
    id: 'allen-bradley', name: 'Allen-Bradley EtherNet/IP', nameEn: 'Allen-Bradley EtherNet/IP',
    category: 'industrial', icon: 'Factory', color: 'bg-red-500/10 text-red-600 dark:text-red-400',
    transport: 'tcp', defaultPort: 44818, isSerial: false,
    description: 'EtherNet/IP для PLC Allen-Bradley (ControlLogix, CompactLogix)',
    descriptionEn: 'EtherNet/IP for Allen-Bradley PLCs (ControlLogix, CompactLogix)',
    version: '1.3.0', status: 'stable',
    opaS: true, opaSCategory: 'industrial-plc', opaSCompliance: 'full',
    fields: [
      { key: 'host', label: 'IP адрес PLC', labelEn: 'PLC IP', type: 'string', defaultValue: '192.168.1.20', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 44818, group: 'connection' },
      { key: 'plcType', label: 'Тип PLC', labelEn: 'PLC Type', type: 'select', defaultValue: 'ControlLogix', group: 'connection', options: [
        { value: 'ControlLogix', label: 'ControlLogix' }, { value: 'CompactLogix', label: 'CompactLogix' },
        { value: 'MicroLogix', label: 'MicroLogix' }, { value: 'PLC-5', label: 'PLC-5' },
        { value: 'SLC-500', label: 'SLC-500' },
      ]},
      { key: 'slot', label: 'Слот', labelEn: 'Slot', type: 'number', defaultValue: 0, min: 0, max: 16, group: 'connection' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 5000, min: 500, max: 30000, group: 'timing' },
      { key: 'pollInterval', label: 'Интервал опроса (мс)', labelEn: 'Poll Interval', type: 'number', defaultValue: 1000, min: 100, max: 30000, group: 'timing' },
    ],
  },
  {
    id: 'mitsubishi-mc', name: 'Mitsubishi MC Protocol', nameEn: 'Mitsubishi MC Protocol',
    category: 'industrial', icon: 'Factory', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    transport: 'tcp', defaultPort: 5000, isSerial: false,
    description: 'MELSEC Communication Protocol для PLC Mitsubishi',
    descriptionEn: 'MELSEC Communication Protocol for Mitsubishi PLCs',
    version: '1.0.0', status: 'stable',
    opaS: true, opaSCategory: 'industrial-plc', opaSCompliance: 'full',
    fields: [
      { key: 'host', label: 'IP адрес PLC', labelEn: 'PLC IP', type: 'string', defaultValue: '192.168.1.30', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 5000, group: 'connection' },
      { key: 'plcType', label: 'Тип PLC', labelEn: 'PLC Type', type: 'select', defaultValue: 'iQ-R', group: 'connection', options: [
        { value: 'iQ-R', label: 'iQ-R Series' }, { value: 'iQ-F', label: 'iQ-F Series' },
        { value: 'Q-Series', label: 'Q Series' }, { value: 'L-Series', label: 'L Series' },
        { value: 'FX-Series', label: 'FX Series' }, { value: 'A-Series', label: 'A Series' },
      ]},
      { key: 'network', label: 'Номер сети', labelEn: 'Network Number', type: 'number', defaultValue: 0, min: 0, max: 255, group: 'connection' },
      { key: 'station', label: 'Номер станции', labelEn: 'Station Number', type: 'number', defaultValue: 0, min: 0, max: 64, group: 'connection' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 3000, group: 'timing' },
      { key: 'pollInterval', label: 'Интервал опроса (мс)', labelEn: 'Poll Interval', type: 'number', defaultValue: 1000, group: 'timing' },
    ],
  },
  {
    id: 'beckhoff-twincat', name: 'Beckhoff TwinCAT ADS/AMS', nameEn: 'Beckhoff TwinCAT ADS/AMS',
    category: 'industrial', icon: 'Monitor', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    transport: 'tcp', defaultPort: 48898, isSerial: false,
    description: 'ADS/AMS протокол для Beckhoff TwinCAT',
    descriptionEn: 'ADS/AMS protocol for Beckhoff TwinCAT',
    version: '1.1.0', status: 'stable',
    opaS: true, opaSCategory: 'industrial-plc', opaSCompliance: 'partial',
    fields: [
      { key: 'host', label: 'IP адрес', labelEn: 'Host IP', type: 'string', defaultValue: '192.168.1.40', required: true, group: 'connection' },
      { key: 'port', label: 'AMS Net ID порт', labelEn: 'AMS Port', type: 'number', defaultValue: 48898, group: 'connection' },
      { key: 'amsNetId', label: 'AMS Net ID', labelEn: 'AMS Net ID', type: 'string', defaultValue: '192.168.1.40.1.1', group: 'connection' },
      { key: 'targetAmsPort', label: 'Целевой AMS порт', labelEn: 'Target AMS Port', type: 'number', defaultValue: 801, group: 'connection' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 5000, group: 'timing' },
    ],
  },
  {
    id: 'omron-fins', name: 'Omron FINS', nameEn: 'Omron FINS',
    category: 'industrial', icon: 'Factory', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    transport: 'tcp', defaultPort: 9600, isSerial: false,
    description: 'FINS protocol для PLC Omron CJ/NJ/NX Series',
    descriptionEn: 'FINS protocol for Omron CJ/NJ/NX Series PLCs',
    version: '1.0.0', status: 'stable',
    opaS: true, opaSCategory: 'industrial-plc', opaSCompliance: 'full',
    fields: [
      { key: 'host', label: 'IP адрес PLC', labelEn: 'PLC IP', type: 'string', defaultValue: '192.168.1.60', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 9600, group: 'connection' },
      { key: 'srcNode', label: 'Исходный узел', labelEn: 'Source Node', type: 'number', defaultValue: 0, min: 0, max: 254, group: 'connection' },
      { key: 'dstNode', label: 'Целевой узел', labelEn: 'Dest Node', type: 'number', defaultValue: 1, min: 0, max: 254, group: 'connection' },
      { key: 'dstSA1', label: 'SA1 целевого', labelEn: 'Dest SA1', type: 'number', defaultValue: 0, group: 'connection' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 3000, group: 'timing' },
    ],
  },

  // ==================== BUILDING AUTOMATION ====================
  {
    id: 'bacnet-ip', name: 'BACnet/IP', nameEn: 'BACnet/IP',
    category: 'building', icon: 'Building', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
    transport: 'udp', defaultPort: 47808, isSerial: false,
    description: 'BACnet/IP для систем ОВК (отопление, вентиляция, кондиционирование)',
    descriptionEn: 'BACnet/IP for HVAC (heating, ventilation, air conditioning)',
    version: '1.0.5', status: 'stable',
    opaS: true, opaSCategory: 'building-automation', opaSCompliance: 'full',
    fields: [
      { key: 'host', label: 'IP адрес устройства', labelEn: 'Device IP', type: 'string', defaultValue: '192.168.1.200', required: true, group: 'connection' },
      { key: 'port', label: 'Порт (UDP)', labelEn: 'Port (UDP)', type: 'number', defaultValue: 47808, group: 'connection' },
      { key: 'deviceInstance', label: 'Instance ID устройства', labelEn: 'Device Instance', type: 'number', defaultValue: 1, min: 0, max: 4194303, group: 'connection' },
      { key: 'networkType', label: 'Тип сети', labelEn: 'Network Type', type: 'select', defaultValue: 'ip', group: 'connection', options: [
        { value: 'ip', label: 'BACnet/IP' }, { value: 'ethernet', label: 'BACnet Ethernet' },
        { value: 'mstp', label: 'BACnet MS/TP (RS-485)' }, { value: 'p2p', label: 'Point-to-Point' },
      ]},
      { key: 'bbmdEnabled', label: 'BBMD', labelEn: 'BBMD', type: 'boolean', defaultValue: false, group: 'advanced' },
      { key: 'bbmdAddress', label: 'BBMD адрес', labelEn: 'BBMD Address', type: 'string', defaultValue: '', group: 'advanced' },
      { key: 'apduTimeout', label: 'APDU таймаут (мс)', labelEn: 'APDU Timeout', type: 'number', defaultValue: 6000, group: 'timing' },
      { key: 'pollInterval', label: 'Интервал опроса (мс)', labelEn: 'Poll Interval', type: 'number', defaultValue: 10000, group: 'timing' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 5000, group: 'timing' },
    ],
  },
  {
    id: 'knx-net-ip', name: 'KNXnet/IP', nameEn: 'KNXnet/IP',
    category: 'building', icon: 'Home', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    transport: 'udp', defaultPort: 3671, isSerial: false,
    description: 'KNXnet/IP — протокол автоматизации зданий по IP',
    descriptionEn: 'KNXnet/IP — building automation protocol over IP',
    version: '1.0.0', status: 'beta',
    opaS: true, opaSCategory: 'building-automation', opaSCompliance: 'partial',
    fields: [
      { key: 'host', label: 'IP адрес шлюза', labelEn: 'Gateway IP', type: 'string', defaultValue: '192.168.1.201', required: true, group: 'connection' },
      { key: 'port', label: 'Порт (UDP)', labelEn: 'Port (UDP)', type: 'number', defaultValue: 3671, group: 'connection' },
      { key: 'individualAddress', label: 'Индивидуальный адрес', labelEn: 'Individual Address', type: 'string', defaultValue: '1.1.0', group: 'connection' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 5000, group: 'timing' },
      { key: 'pollInterval', label: 'Интервал опроса (мс)', labelEn: 'Poll Interval', type: 'number', defaultValue: 5000, group: 'timing' },
      RECONNECT_FIELD,
    ],
  },
  {
    id: 'lonworks-ip', name: 'LonWorks IP', nameEn: 'LonWorks IP',
    category: 'building', icon: 'Network', color: 'bg-lime-500/10 text-lime-600 dark:text-lime-400',
    transport: 'udp', defaultPort: 1628, isSerial: false,
    description: 'LonWorks/IP — протокол управления зданием по IP',
    descriptionEn: 'LonWorks/IP — building management protocol over IP',
    version: '0.9.0', status: 'experimental',
    opaS: true, opaSCategory: 'building-automation', opaSCompliance: 'planned',
    fields: [
      { key: 'host', label: 'IP адрес', labelEn: 'Host IP', type: 'string', defaultValue: '192.168.1.202', required: true, group: 'connection' },
      { key: 'port', label: 'Порт (UDP)', labelEn: 'Port', type: 'number', defaultValue: 1628, group: 'connection' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 5000, group: 'timing' },
      { key: 'pollInterval', label: 'Интервал опроса (мс)', labelEn: 'Poll Interval', type: 'number', defaultValue: 5000, group: 'timing' },
      RECONNECT_FIELD,
    ],
  },
  {
    id: 'dali', name: 'DALI', nameEn: 'DALI',
    category: 'building', icon: 'Lightbulb', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    transport: 'serial', defaultPort: 0, isSerial: true,
    description: 'DALI — протокол управления освещением',
    descriptionEn: 'DALI — Digital Addressable Lighting Interface',
    version: '0.8.0', status: 'beta',
    opaS: true, opaSCategory: 'building-automation', opaSCompliance: 'planned',
    fields: [
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 3000, group: 'timing' },
      { key: 'pollInterval', label: 'Интервал опроса (мс)', labelEn: 'Poll Interval', type: 'number', defaultValue: 5000, group: 'timing' },
      RECONNECT_FIELD,
    ],
    serialFields: [
      { key: 'port', label: 'Последовательный порт', labelEn: 'Serial Port', type: 'select', defaultValue: '/dev/ttyUSB0', group: 'serial', required: true, options: [
        { value: '/dev/ttyUSB0', label: '/dev/ttyUSB0' }, { value: '/dev/ttyUSB1', label: '/dev/ttyUSB1' },
        { value: 'COM1', label: 'COM1' }, { value: 'COM2', label: 'COM2' },
      ]},
      { key: 'baudRate', label: 'Скорость (бод)', labelEn: 'Baud Rate', type: 'select', defaultValue: '9600', group: 'serial', options: [
        { value: '1200', label: '1200' }, { value: '2400', label: '2400' }, { value: '9600', label: '9600' },
      ]},
    ],
  },

  // ==================== POWER / ENERGY SYSTEMS ====================
  {
    id: 'iec104', name: 'IEC 60870-5-104', nameEn: 'IEC 60870-5-104',
    category: 'power', icon: 'Zap', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    transport: 'tcp', defaultPort: 2404, isSerial: false,
    description: 'IEC 60870-5-104 — телемеханика для подстанций и энергообъектов',
    descriptionEn: 'IEC 60870-5-104 — telecontrol for substations',
    version: '1.1.0', status: 'stable',
    opaS: true, opaSCategory: 'energy', opaSCompliance: 'full',
    fields: [
      { key: 'host', label: 'IP адрес RTU', labelEn: 'RTU IP', type: 'string', defaultValue: '192.168.2.10', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 2404, group: 'connection' },
      { key: 'asduAddress', label: 'ASDU адрес', labelEn: 'ASDU Address', type: 'number', defaultValue: 1, min: 0, max: 255, group: 'connection' },
      { key: 'caAsduAddress', label: 'CA ASDU адрес', labelEn: 'CA ASDU Address', type: 'number', defaultValue: 1, min: 0, max: 255, group: 'connection' },
      { key: 'timeoutT1', label: 'Таймаут T1 (мс)', labelEn: 'Timeout T1', type: 'number', defaultValue: 15000, min: 1000, max: 60000, group: 'timing' },
      { key: 'timeoutT2', label: 'Таймаут T2 (мс)', labelEn: 'Timeout T2', type: 'number', defaultValue: 10000, min: 1000, max: 30000, group: 'timing' },
      { key: 'timeoutT3', label: 'Таймаут T3 (с)', labelEn: 'Timeout T3', type: 'number', defaultValue: 20, min: 5, max: 300, group: 'timing' },
      { key: 'testInterval', label: 'Интервал тестов (с)', labelEn: 'Test Interval', type: 'number', defaultValue: 20, min: 5, max: 300, group: 'timing' },
      { key: 'timeSync', label: 'Синхронизация времени', labelEn: 'Time Sync', type: 'boolean', defaultValue: true, group: 'advanced' },
    ],
  },
  {
    id: 'dnp3', name: 'DNP3', nameEn: 'DNP3',
    category: 'power', icon: 'Zap', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    transport: 'tcp', defaultPort: 20000, isSerial: false,
    description: 'DNP3 (IEEE 1815) для систем SCADA',
    descriptionEn: 'DNP3 (IEEE 1815) for SCADA systems',
    version: '0.9.0', status: 'beta',
    opaS: true, opaSCategory: 'energy', opaSCompliance: 'partial',
    fields: [
      { key: 'host', label: 'IP адрес Outstation', labelEn: 'Outstation IP', type: 'string', defaultValue: '192.168.2.20', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 20000, group: 'connection' },
      { key: 'linkLayer', label: 'Тип канала', labelEn: 'Link Layer', type: 'select', defaultValue: 'tcp', group: 'connection', options: [
        { value: 'tcp', label: 'TCP' }, { value: 'udp', label: 'UDP' }, { value: 'serial', label: 'Serial' },
      ]},
      { key: 'localAddress', label: 'Локальный адрес', labelEn: 'Local Address', type: 'number', defaultValue: 1, min: 0, max: 65519, group: 'connection' },
      { key: 'remoteAddress', label: 'Удалённый адрес', labelEn: 'Remote Address', type: 'number', defaultValue: 1024, min: 0, max: 65519, group: 'connection' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 5000, group: 'timing' },
      { key: 'unsolicitedResponse', label: 'Незапрошенные ответы', labelEn: 'Unsolicited', type: 'boolean', defaultValue: true, group: 'advanced' },
    ],
  },
  {
    id: 'iec61850', name: 'IEC 61850 (MMS)', nameEn: 'IEC 61850 (MMS)',
    category: 'power', icon: 'Zap', color: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400',
    transport: 'tcp', defaultPort: 102, isSerial: false,
    description: 'IEC 61850 MMS для подстанций высокого напряжения',
    descriptionEn: 'IEC 61850 MMS for high voltage substations',
    version: '1.0.0', status: 'stable',
    opaS: true, opaSCategory: 'energy', opaSCompliance: 'partial',
    fields: [
      { key: 'host', label: 'IP адрес IED', labelEn: 'IED IP', type: 'string', defaultValue: '192.168.2.30', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 102, group: 'connection' },
      { key: 'iedName', label: 'Имя IED', labelEn: 'IED Name', type: 'string', defaultValue: '', group: 'connection' },
      { key: 'sclFile', label: 'SCL/ICD файл', labelEn: 'SCL/ICD File', type: 'string', defaultValue: '', group: 'connection' },
      { key: 'ssl', label: 'SSL/TLS', labelEn: 'SSL/TLS', type: 'boolean', defaultValue: false, group: 'security' },
      { key: 'certFile', label: 'Файл сертификата', labelEn: 'Cert File', type: 'string', defaultValue: '', group: 'security' },
      { key: 'keyFile', label: 'Файл ключа', labelEn: 'Key File', type: 'string', defaultValue: '', group: 'security' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 10000, group: 'timing' },
    ],
  },
  {
    id: 'hart-ip', name: 'HART-IP', nameEn: 'HART-IP',
    category: 'power', icon: 'Activity', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    transport: 'tcp', defaultPort: 5094, isSerial: false,
    description: 'HART-IP — протокол полевых приборов по IP',
    descriptionEn: 'HART-IP — field instrument protocol over IP',
    version: '0.8.0', status: 'experimental',
    opaS: true, opaSCategory: 'process-automation', opaSCompliance: 'planned',
    fields: [
      { key: 'host', label: 'IP адрес шлюза', labelEn: 'Gateway IP', type: 'string', defaultValue: '192.168.3.10', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 5094, group: 'connection' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 5000, group: 'timing' },
      { key: 'pollInterval', label: 'Интервал опроса (мс)', labelEn: 'Poll Interval', type: 'number', defaultValue: 2000, group: 'timing' },
      RECONNECT_FIELD,
    ],
    defaultTags: [
      { name: 'PV (процессная переменная)', address: 'cmd:0,var:0', type: 'FLOAT', description: 'Primary Variable' },
      { name: 'SV (масштабная переменная)', address: 'cmd:0,var:1', type: 'FLOAT', description: 'Secondary Variable' },
      { name: 'TV (третья переменная)', address: 'cmd:0,var:2', type: 'FLOAT', description: 'Tertiary Variable' },
      { name: 'TV4 (четвёртая переменная)', address: 'cmd:0,var:3', type: 'FLOAT', description: 'Fourth Variable' },
      { name: 'Ток контура (мА)', address: 'cmd:0,var:8', type: 'FLOAT', description: 'Loop Current mA' },
      { name: 'Процент диапазона', address: 'cmd:0,var:9', type: 'FLOAT', description: '% of Range' },
    ],
  },
  {
    id: 'hart-generic', name: 'HART Generic', nameEn: 'HART Generic',
    category: 'power', icon: 'Radio', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    transport: 'serial', defaultPort: 0, isSerial: true,
    description: 'HART Generic — универсальный драйвер полевых HART-приборов через модем',
    descriptionEn: 'HART Generic — universal field instrument driver via HART modem',
    version: '1.0.0', status: 'stable',
    opaS: true, opaSCategory: 'process-automation', opaSCompliance: 'full',
    fields: [
      { key: 'pollAddress', label: 'HART Poll Address', labelEn: 'Poll Address', type: 'number', defaultValue: 0, min: 0, max: 63, description: '0 = Burst/Мультидроп, 1-63 = Адрес прибора', required: true, group: 'connection' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 5000, min: 1000, max: 30000, group: 'timing' },
      { key: 'retries', label: 'Повторы', labelEn: 'Retries', type: 'number', defaultValue: 3, min: 0, max: 10, group: 'timing' },
      { key: 'pollInterval', label: 'Интервал опроса (мс)', labelEn: 'Poll Interval', type: 'number', defaultValue: 3000, min: 500, max: 60000, group: 'timing' },
      { key: 'commandTimeout', label: 'Таймаут команды (мс)', labelEn: 'Command Timeout', type: 'number', defaultValue: 2000, min: 500, max: 10000, group: 'timing' },
      { key: 'autoReconnect', label: 'Авто-переподключение', labelEn: 'Auto Reconnect', type: 'boolean', defaultValue: true, group: 'advanced' },
      { key: 'enableBurst', label: 'Burst mode', labelEn: 'Burst Mode', type: 'boolean', defaultValue: false, description: 'Автоматическая передача прибора', group: 'advanced' },
      { key: 'deviceType', label: 'Тип прибора', labelEn: 'Device Type', type: 'select', defaultValue: 'generic', group: 'advanced', options: [
        { value: 'generic', label: 'Generic (Universal Command 3)' },
        { value: 'pressure', label: 'Давление (Pressure Transmitter)' },
        { value: 'temperature', label: 'Температура (Temperature Transmitter)' },
        { value: 'flow', label: 'Расход (Flow Transmitter)' },
        { value: 'level', label: 'Уровень (Level Transmitter)' },
        { value: 'positioner', label: 'Позиционер (Valve Positioner)' },
        { value: 'analog_input', label: 'Аналоговый вход (AI)' },
        { value: 'analog_output', label: 'Аналоговый выход (AO)' },
      ]},
    ],
    serialFields: [
      { key: 'port', label: 'Последовательный порт', labelEn: 'Serial Port', type: 'select', defaultValue: '/dev/ttyUSB0', group: 'serial', required: true, options: [
        { value: '/dev/ttyUSB0', label: '/dev/ttyUSB0' }, { value: '/dev/ttyUSB1', label: '/dev/ttyUSB1' },
        { value: '/dev/ttyUSB2', label: '/dev/ttyUSB2' }, { value: '/dev/ttyS0', label: '/dev/ttyS0' },
        { value: '/dev/ttyS1', label: '/dev/ttyS1' }, { value: '/dev/ttyAMA0', label: '/dev/ttyAMA0 (Raspberry Pi)' },
        { value: 'COM1', label: 'COM1 (Windows)' }, { value: 'COM2', label: 'COM2 (Windows)' },
        { value: 'COM3', label: 'COM3 (Windows)' }, { value: 'COM4', label: 'COM4 (Windows)' },
      ]},
      { key: 'baudRate', label: 'Скорость (бод)', labelEn: 'Baud Rate', type: 'select', defaultValue: '1200', group: 'serial', description: 'HART FSK стандарт — 1200 бод', options: [
        { value: '1200', label: '1200 (HART FSK Standard)' },
        { value: '2400', label: '2400 (Enhanced)' },
        { value: '9600', label: '9600 (Multi-drop BPSK)' },
      ]},
      { key: 'dataBits', label: 'Биты данных', labelEn: 'Data Bits', type: 'select', defaultValue: '8', group: 'serial', options: [
        { value: '7', label: '7' }, { value: '8', label: '8 (default)' },
      ]},
      { key: 'parity', label: 'Чётность', labelEn: 'Parity', type: 'select', defaultValue: 'odd', group: 'serial', description: 'HART FSK требует Odd parity', options: [
        { value: 'none', label: 'Нет' }, { value: 'even', label: 'Чёт (Even)' },
        { value: 'odd', label: 'Нечёт (Odd — HART Standard)' },
      ]},
      { key: 'stopBits', label: 'Стоп-биты', labelEn: 'Stop Bits', type: 'select', defaultValue: '1', group: 'serial', options: [
        { value: '1', label: '1 (default)' }, { value: '2', label: '2' },
      ]},
    ],
    defaultTags: [
      { name: 'PV (процессная переменная)', address: 'cmd:3,var:0', type: 'FLOAT', description: 'Primary Variable (Cmd 3)' },
      { name: 'SV (масштабная переменная)', address: 'cmd:3,var:1', type: 'FLOAT', description: 'Secondary Variable (Cmd 3)' },
      { name: 'TV (третья переменная)', address: 'cmd:3,var:2', type: 'FLOAT', description: 'Tertiary Variable (Cmd 3)' },
      { name: 'TV4 (четвёртая переменная)', address: 'cmd:3,var:3', type: 'FLOAT', description: 'Fourth Variable (Cmd 3)' },
      { name: 'Ток контура (мА)', address: 'cmd:3,var:8', type: 'FLOAT', description: 'Loop Current mA (Cmd 3)' },
      { name: 'Процент диапазона (%)', address: 'cmd:3,var:9', type: 'FLOAT', description: '% of Range (Cmd 3)' },
      { name: 'Аналоговый выход (мА)', address: 'cmd:3,var:10', type: 'FLOAT', description: 'Analog Output mA (Cmd 3)' },
      { name: 'Сатурация', address: 'cmd:3,var:11', type: 'FLOAT', description: 'Saturation (Cmd 3)' },
      { name: 'Статус прибора', address: 'cmd:3,var:12', type: 'UINT16', description: 'Device Status (Cmd 3)' },
      { name: 'Расширенный статус', address: 'cmd:3,var:13', type: 'UINT16', description: 'Extended Device Status (Cmd 3)' },
      { name: 'Мин. диапазон PV', address: 'cmd:3,var:15', type: 'FLOAT', description: 'PV Lower Range (Cmd 3)' },
      { name: 'Макс. диапазон PV', address: 'cmd:3,var:16', type: 'FLOAT', description: 'PV Upper Range (Cmd 3)' },
      { name: 'Единица PV', address: 'cmd:3,var:17', type: 'UINT16', description: 'PV Unit Code (Cmd 3)' },
      { name: 'DA (цифровое значение)', address: 'cmd:3,var:18', type: 'FLOAT', description: 'Digital Value (Cmd 3)' },
    ],
  },
  {
    id: 'ff-hse', name: 'FOUNDATION Fieldbus HSE', nameEn: 'FF HSE',
    category: 'power', icon: 'Cpu', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    transport: 'udp', defaultPort: 10800, isSerial: false,
    description: 'FOUNDATION Fieldbus HSE — высокоскоростной Ethernet',
    descriptionEn: 'FOUNDATION Fieldbus HSE — High Speed Ethernet',
    version: '0.5.0', status: 'experimental',
    opaS: true, opaSCategory: 'process-automation', opaSCompliance: 'planned',
    fields: [
      { key: 'host', label: 'IP адрес', labelEn: 'Host IP', type: 'string', defaultValue: '192.168.3.20', required: true, group: 'connection' },
      { key: 'port', label: 'Порт (UDP)', labelEn: 'Port', type: 'number', defaultValue: 10800, group: 'connection' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 5000, group: 'timing' },
      { key: 'pollInterval', label: 'Интервал опроса (мс)', labelEn: 'Poll Interval', type: 'number', defaultValue: 1000, group: 'timing' },
      RECONNECT_FIELD,
    ],
  },
  {
    id: 'profibus-dp', name: 'PROFIBUS DP', nameEn: 'PROFIBUS DP',
    category: 'power', icon: 'Cpu', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    transport: 'serial', defaultPort: 0, isSerial: true,
    description: 'PROFIBUS DP — полевая шина децентрализованного управления',
    descriptionEn: 'PROFIBUS DP — Decentralized Periphery fieldbus',
    version: '0.7.0', status: 'experimental',
    opaS: true, opaSCategory: 'process-automation', opaSCompliance: 'planned',
    fields: [
      { key: 'slaveId', label: 'Адрес станции', labelEn: 'Station Address', type: 'number', defaultValue: 1, min: 0, max: 126, group: 'connection' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 3000, group: 'timing' },
      { key: 'pollInterval', label: 'Интервал опроса (мс)', labelEn: 'Poll Interval', type: 'number', defaultValue: 2000, group: 'timing' },
      RECONNECT_FIELD,
    ],
    serialFields: [
      { key: 'port', label: 'Последовательный порт', labelEn: 'Serial Port', type: 'select', defaultValue: '/dev/ttyUSB0', group: 'serial', required: true, options: [
        { value: '/dev/ttyUSB0', label: '/dev/ttyUSB0' }, { value: '/dev/ttyUSB1', label: '/dev/ttyUSB1' }, { value: 'COM1', label: 'COM1' },
      ]},
      { key: 'baudRate', label: 'Скорость (бод)', labelEn: 'Baud Rate', type: 'select', defaultValue: '9600', group: 'serial', options: [
        { value: '9600', label: '9600' }, { value: '19200', label: '19200' }, { value: '187500', label: '187.5K' },
        { value: '500000', label: '500K' }, { value: '1500000', label: '1.5M' }, { value: '3000000', label: '3M' }, { value: '6000000', label: '6M' }, { value: '12000000', label: '12M' },
      ]},
    ],
  },

  // ==================== NETWORK ====================
  {
    id: 'snmp-v1', name: 'SNMP v1', nameEn: 'SNMP v1',
    category: 'network', icon: 'Network', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    transport: 'udp', defaultPort: 161, isSerial: false,
    description: 'SNMP v1 — простой сетевой протокол мониторинга',
    descriptionEn: 'SNMP v1 — simple network monitoring protocol',
    version: '1.0.0', status: 'stable',
    opaS: true, opaSCategory: 'iot-edge', opaSCompliance: 'partial',
    fields: [
      { key: 'host', label: 'Хост', labelEn: 'Host', type: 'string', defaultValue: '192.168.1.1', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 161, group: 'connection' },
      { key: 'community', label: 'Community string', labelEn: 'Community', type: 'string', defaultValue: 'public', group: 'security' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 3000, group: 'timing' },
      { key: 'retries', label: 'Повторы', labelEn: 'Retries', type: 'number', defaultValue: 2, group: 'timing' },
    ],
  },
  {
    id: 'snmp-v2c', name: 'SNMP v2c', nameEn: 'SNMP v2c',
    category: 'network', icon: 'Network', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    transport: 'udp', defaultPort: 161, isSerial: false,
    description: 'SNMP v2c — improved с поддержкой GETBULK',
    descriptionEn: 'SNMP v2c — improved with GETBULK support',
    version: '1.2.0', status: 'stable',
    opaS: true, opaSCategory: 'iot-edge', opaSCompliance: 'partial',
    fields: [
      { key: 'host', label: 'Хост', labelEn: 'Host', type: 'string', defaultValue: '192.168.1.1', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 161, group: 'connection' },
      { key: 'communityRead', label: 'Community (чтение)', labelEn: 'Read Community', type: 'string', defaultValue: 'public', group: 'security' },
      { key: 'communityWrite', label: 'Community (запись)', labelEn: 'Write Community', type: 'string', defaultValue: 'private', group: 'security' },
      { key: 'maxRepetitions', label: 'Max repetitions', labelEn: 'Max Repetitions', type: 'number', defaultValue: 10, min: 0, max: 100, group: 'advanced' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 3000, group: 'timing' },
    ],
  },
  {
    id: 'snmp-v3', name: 'SNMP v3', nameEn: 'SNMP v3',
    category: 'network', icon: 'Network', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    transport: 'udp', defaultPort: 161, isSerial: false,
    description: 'SNMP v3 — аутентификация и шифрование (USM)',
    descriptionEn: 'SNMP v3 — authentication and encryption (USM)',
    version: '1.0.0', status: 'stable',
    opaS: true, opaSCategory: 'iot-edge', opaSCompliance: 'partial',
    fields: [
      { key: 'host', label: 'Хост', labelEn: 'Host', type: 'string', defaultValue: '192.168.1.1', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 161, group: 'connection' },
      { key: 'username', label: 'Пользователь', labelEn: 'Username', type: 'string', defaultValue: '', group: 'security' },
      { key: 'authProtocol', label: 'Протокол аутентификации', labelEn: 'Auth Protocol', type: 'select', defaultValue: 'MD5', group: 'security', options: [
        { value: 'MD5', label: 'MD5' }, { value: 'SHA', label: 'SHA' }, { value: 'SHA-256', label: 'SHA-256' }, { value: 'SHA-512', label: 'SHA-512' },
      ]},
      { key: 'authPassword', label: 'Пароль аутентификации', labelEn: 'Auth Password', type: 'string', defaultValue: '', group: 'security' },
      { key: 'privProtocol', label: 'Протокол шифрования', labelEn: 'Privacy Protocol', type: 'select', defaultValue: 'AES-256', group: 'security', options: [
        { value: 'DES', label: 'DES' }, { value: 'AES-128', label: 'AES-128' }, { value: 'AES-192', label: 'AES-192' }, { value: 'AES-256', label: 'AES-256' },
      ]},
      { key: 'privPassword', label: 'Пароль шифрования', labelEn: 'Privacy Password', type: 'string', defaultValue: '', group: 'security' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 5000, group: 'timing' },
    ],
  },

  // ==================== CLOUD / NORTHBOUND ====================
  {
    id: 'mqtt-v5', name: 'MQTT v5', nameEn: 'MQTT v5',
    category: 'cloud', icon: 'Radio', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    transport: 'tcp', defaultPort: 1883, isSerial: false,
    description: 'MQTT v5.0 — протокол обмена сообщениями IoT',
    descriptionEn: 'MQTT v5.0 — IoT message queuing protocol',
    version: '2.1.0', status: 'stable',
    opaS: true, opaSCategory: 'iot-edge', opaSCompliance: 'full',
    fields: [
      { key: 'host', label: 'Broker', labelEn: 'Broker', type: 'string', defaultValue: 'mqtt.eclipseprojects.io', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 1883, group: 'connection' },
      { key: 'clientId', label: 'Client ID', labelEn: 'Client ID', type: 'string', defaultValue: '', group: 'connection' },
      { key: 'username', label: 'Имя пользователя', labelEn: 'Username', type: 'string', defaultValue: '', group: 'security' },
      { key: 'password', label: 'Пароль', labelEn: 'Password', type: 'string', defaultValue: '', group: 'security' },
      { key: 'qos', label: 'QoS', labelEn: 'QoS', type: 'select', defaultValue: '1', group: 'connection', options: [
        { value: '0', label: '0 — Не более одного раза' }, { value: '1', label: '1 — Хотя бы один раз' }, { value: '2', label: '2 — Ровно один раз' },
      ]},
      { key: 'keepAlive', label: 'Keep Alive (сек)', labelEn: 'Keep Alive', type: 'number', defaultValue: 60, min: 10, max: 600, group: 'connection' },
      { key: 'cleanSession', label: 'Clean Session', labelEn: 'Clean Session', type: 'boolean', defaultValue: true, group: 'connection' },
      { key: 'tls', label: 'TLS/SSL', labelEn: 'TLS/SSL', type: 'boolean', defaultValue: false, group: 'security' },
      { key: 'caCert', label: 'CA сертификат', labelEn: 'CA Certificate', type: 'string', defaultValue: '', group: 'security' },
      { key: 'clientCert', label: 'Сертификат клиента', labelEn: 'Client Certificate', type: 'string', defaultValue: '', group: 'security' },
      { key: 'clientKey', label: 'Ключ клиента', labelEn: 'Client Key', type: 'string', defaultValue: '', group: 'security' },
      { key: 'topic', label: 'Topic', labelEn: 'Topic', type: 'string', defaultValue: 'neuron/data/#', group: 'data' },
      { key: 'retain', label: 'Retain', labelEn: 'Retain', type: 'boolean', defaultValue: false, group: 'data' },
      { key: 'maxMessageSize', label: 'Макс. размер сообщения (байт)', labelEn: 'Max Message Size', type: 'number', defaultValue: 268435456, group: 'advanced' },
      { key: 'autoReconnect', label: 'Авто-переподключение', labelEn: 'Auto Reconnect', type: 'boolean', defaultValue: true, group: 'advanced' },
    ],
  },
  {
    id: 'mqtt-sparkplug', name: 'MQTT Sparkplug B', nameEn: 'MQTT Sparkplug B',
    category: 'cloud', icon: 'Radio', color: 'bg-green-500/10 text-green-600 dark:text-green-400',
    transport: 'tcp', defaultPort: 1883, isSerial: false,
    description: 'MQTT Sparkplug B — стандарт IoT для промышленных данных',
    descriptionEn: 'MQTT Sparkplug B — industrial IoT standard for MQTT',
    version: '1.0.0', status: 'stable',
    opaS: true, opaSCategory: 'iot-edge', opaSCompliance: 'partial',
    fields: [
      { key: 'host', label: 'Broker', labelEn: 'Broker', type: 'string', defaultValue: 'mqtt.eclipseprojects.io', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 1883, group: 'connection' },
      { key: 'groupId', label: 'Group ID', labelEn: 'Group ID', type: 'string', defaultValue: 'neutron_edge', required: true, group: 'connection' },
      { key: 'edgeNodeId', label: 'Edge Node ID', labelEn: 'Edge Node ID', type: 'string', defaultValue: 'edge_001', required: true, group: 'connection' },
      { key: 'username', label: 'Имя пользователя', labelEn: 'Username', type: 'string', defaultValue: '', group: 'security' },
      { key: 'password', label: 'Пароль', labelEn: 'Password', type: 'string', defaultValue: '', group: 'security' },
      { key: 'tls', label: 'TLS/SSL', labelEn: 'TLS/SSL', type: 'boolean', defaultValue: false, group: 'security' },
      { key: 'publishDeathBirth', label: 'DBIRTH/NBIRTH', labelEn: 'Publish Death/Birth', type: 'boolean', defaultValue: true, group: 'advanced' },
      RECONNECT_FIELD,
    ],
  },
  {
    id: 'kafka', name: 'Apache Kafka', nameEn: 'Apache Kafka',
    category: 'cloud', icon: 'Server', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    transport: 'tcp', defaultPort: 9092, isSerial: false,
    description: 'Apache Kafka — потоковая платформа данных',
    descriptionEn: 'Apache Kafka — distributed streaming platform',
    version: '1.0.0', status: 'stable',
    opaS: true, opaSCategory: 'iot-edge', opaSCompliance: 'full',
    fields: [
      { key: 'bootstrapServers', label: 'Bootstrap Servers', labelEn: 'Bootstrap Servers', type: 'string', defaultValue: 'kafka1:9092,kafka2:9092', required: true, group: 'connection' },
      { key: 'topic', label: 'Topic', labelEn: 'Topic', type: 'string', defaultValue: 'iot-data', required: true, group: 'connection' },
      { key: 'clientId', label: 'Client ID', labelEn: 'Client ID', type: 'string', defaultValue: '', group: 'connection' },
      { key: 'acks', label: 'Уровень подтверждения', labelEn: 'Acks', type: 'select', defaultValue: '1', group: 'connection', options: [
        { value: '0', label: '0 — Без подтверждения' }, { value: '1', label: '1 — Leader' }, { value: 'all', label: 'All — Все ISR' },
      ]},
      { key: 'saslMechanism', label: 'SASL механизм', labelEn: 'SASL Mechanism', type: 'select', defaultValue: '', group: 'security', options: [
        { value: '', label: 'Нет' }, { value: 'PLAIN', label: 'PLAIN' },
        { value: 'SCRAM-SHA-256', label: 'SCRAM-SHA-256' }, { value: 'SCRAM-SHA-512', label: 'SCRAM-SHA-512' },
        { value: 'GSSAPI', label: 'GSSAPI (Kerberos)' },
      ]},
      { key: 'saslUsername', label: 'SASL пользователь', labelEn: 'SASL Username', type: 'string', defaultValue: '', group: 'security' },
      { key: 'saslPassword', label: 'SASL пароль', labelEn: 'SASL Password', type: 'string', defaultValue: '', group: 'security' },
      { key: 'compression', label: 'Сжатие', labelEn: 'Compression', type: 'select', defaultValue: 'none', group: 'advanced', options: [
        { value: 'none', label: 'Нет' }, { value: 'gzip', label: 'GZIP' }, { value: 'snappy', label: 'Snappy' }, { value: 'lz4', label: 'LZ4' }, { value: 'zstd', label: 'ZSTD' },
      ]},
      { key: 'batchSize', label: 'Размер пакета', labelEn: 'Batch Size', type: 'number', defaultValue: 500, min: 1, max: 10000, group: 'advanced' },
      { key: 'lingerMs', label: 'Linger (мс)', labelEn: 'Linger', type: 'number', defaultValue: 0, group: 'advanced' },
    ],
  },
  {
    id: 'http-rest', name: 'HTTP REST', nameEn: 'HTTP REST',
    category: 'cloud', icon: 'Globe', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    transport: 'tcp', defaultPort: 443, isSerial: false,
    description: 'HTTP REST API для отправки данных',
    descriptionEn: 'HTTP REST API for data submission',
    version: '1.0.0', status: 'stable',
    opaS: true, opaSCategory: 'iot-edge', opaSCompliance: 'full',
    fields: [
      { key: 'url', label: 'URL', labelEn: 'URL', type: 'string', defaultValue: 'https://api.example.com/data', required: true, group: 'connection' },
      { key: 'method', label: 'Метод', labelEn: 'Method', type: 'select', defaultValue: 'POST', group: 'connection', options: [
        { value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }, { value: 'PATCH', label: 'PATCH' },
      ]},
      { key: 'contentType', label: 'Content-Type', labelEn: 'Content-Type', type: 'select', defaultValue: 'application/json', group: 'connection', options: [
        { value: 'application/json', label: 'JSON' }, { value: 'application/xml', label: 'XML' }, { value: 'text/csv', label: 'CSV' },
      ]},
      { key: 'timeout', label: 'Таймаут (сек)', labelEn: 'Timeout', type: 'number', defaultValue: 30, min: 1, max: 300, group: 'timing' },
      { key: 'retries', label: 'Повторы', labelEn: 'Retries', type: 'number', defaultValue: 3, min: 0, max: 10, group: 'timing' },
      { key: 'retryDelay', label: 'Задержка между повторами (мс)', labelEn: 'Retry Delay', type: 'number', defaultValue: 1000, group: 'timing' },
      { key: 'authType', label: 'Тип авторизации', labelEn: 'Auth Type', type: 'select', defaultValue: 'none', group: 'security', options: [
        { value: 'none', label: 'Нет' }, { value: 'bearer', label: 'Bearer Token' },
        { value: 'basic', label: 'Basic Auth' }, { value: 'apiKey', label: 'API Key' },
        { value: 'oauth2', label: 'OAuth 2.0' },
      ]},
      { key: 'authToken', label: 'Токен', labelEn: 'Token', type: 'string', defaultValue: '', group: 'security' },
      { key: 'tls', label: 'TLS верификация', labelEn: 'TLS Verify', type: 'boolean', defaultValue: true, group: 'security' },
      { key: 'batchSize', label: 'Размер пакета', labelEn: 'Batch Size', type: 'number', defaultValue: 50, group: 'advanced' },
      { key: 'flushInterval', label: 'Интервал отправки (сек)', labelEn: 'Flush Interval', type: 'number', defaultValue: 5, group: 'advanced' },
    ],
  },
  {
    id: 'websocket', name: 'WebSocket', nameEn: 'WebSocket',
    category: 'cloud', icon: 'Wifi', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    transport: 'tcp', defaultPort: 80, isSerial: false,
    description: 'WebSocket для потоковой передачи данных',
    descriptionEn: 'WebSocket for streaming data transfer',
    version: '1.0.0', status: 'stable',
    opaS: true, opaSCategory: 'iot-edge', opaSCompliance: 'full',
    fields: [
      { key: 'url', label: 'WebSocket URL', labelEn: 'URL', type: 'string', defaultValue: 'wss://stream.example.com/ws', required: true, group: 'connection' },
      { key: 'tls', label: 'TLS (WSS)', labelEn: 'TLS', type: 'boolean', defaultValue: true, group: 'security' },
      { key: 'authHeader', label: 'Authorization header', labelEn: 'Auth Header', type: 'string', defaultValue: '', group: 'security' },
      { key: 'reconnect', label: 'Авто-переподключение', labelEn: 'Reconnect', type: 'boolean', defaultValue: true, group: 'advanced' },
      { key: 'pingInterval', label: 'Ping интервал (сек)', labelEn: 'Ping Interval', type: 'number', defaultValue: 30, group: 'advanced' },
    ],
  },
  {
    id: 'aws-iot', name: 'AWS IoT Core', nameEn: 'AWS IoT Core',
    category: 'cloud', icon: 'Cloud', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    transport: 'tcp', defaultPort: 8883, isSerial: false,
    description: 'AWS IoT Core — облачная платформа IoT',
    descriptionEn: 'AWS IoT Core — cloud IoT platform',
    version: '1.0.0', status: 'stable',
    opaS: true, opaSCategory: 'cloud', opaSCompliance: 'full',
    fields: [
      { key: 'endpoint', label: 'Endpoint', labelEn: 'Endpoint', type: 'string', defaultValue: '', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 8883, group: 'connection' },
      { key: 'clientId', label: 'Client ID', labelEn: 'Client ID', type: 'string', defaultValue: '', group: 'connection' },
      { key: 'thingName', label: 'Thing Name', labelEn: 'Thing Name', type: 'string', defaultValue: '', group: 'connection' },
      { key: 'tls', label: 'TLS', labelEn: 'TLS', type: 'boolean', defaultValue: true, group: 'security' },
      { key: 'certFile', label: 'Файл сертификата', labelEn: 'Certificate', type: 'string', defaultValue: '', group: 'security' },
      { key: 'keyFile', label: 'Файл ключа', labelEn: 'Private Key', type: 'string', defaultValue: '', group: 'security' },
      { key: 'caFile', label: 'CA файл', labelEn: 'CA File', type: 'string', defaultValue: '', group: 'security' },
    ],
  },
  {
    id: 'azure-iot', name: 'Azure IoT Hub', nameEn: 'Azure IoT Hub',
    category: 'cloud', icon: 'Cloud', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    transport: 'tcp', defaultPort: 8883, isSerial: false,
    description: 'Azure IoT Hub — облачная платформа IoT от Microsoft',
    descriptionEn: 'Azure IoT Hub — Microsoft cloud IoT platform',
    version: '1.0.0', status: 'stable',
    opaS: true, opaSCategory: 'cloud', opaSCompliance: 'full',
    fields: [
      { key: 'host', label: 'Hub hostname', labelEn: 'Hub Hostname', type: 'string', defaultValue: 'myhub.azure-devices.net', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 8883, group: 'connection' },
      { key: 'deviceId', label: 'Device ID', labelEn: 'Device ID', type: 'string', defaultValue: '', group: 'connection' },
      { key: 'sharedAccessKey', label: 'Shared Access Key', labelEn: 'SAS Key', type: 'string', defaultValue: '', group: 'security' },
      { key: 'tls', label: 'TLS', labelEn: 'TLS', type: 'boolean', defaultValue: true, group: 'security' },
    ],
  },
  {
    id: 'google-cloud-iot', name: 'Google Cloud IoT', nameEn: 'Google Cloud IoT',
    category: 'cloud', icon: 'Cloud', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    transport: 'tcp', defaultPort: 8883, isSerial: false,
    description: 'Google Cloud IoT Core — облачная платформа IoT от Google',
    descriptionEn: 'Google Cloud IoT Core — Google cloud IoT platform',
    version: '0.9.0', status: 'beta',
    opaS: true, opaSCategory: 'cloud', opaSCompliance: 'partial',
    fields: [
      { key: 'host', label: 'MQTT Bridge Host', labelEn: 'MQTT Bridge Host', type: 'string', defaultValue: 'mqtt.googleapis.com', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 8883, group: 'connection' },
      { key: 'projectId', label: 'Project ID', labelEn: 'Project ID', type: 'string', defaultValue: '', required: true, group: 'connection' },
      { key: 'registryId', label: 'Registry ID', labelEn: 'Registry ID', type: 'string', defaultValue: '', required: true, group: 'connection' },
      { key: 'deviceId', label: 'Device ID', labelEn: 'Device ID', type: 'string', defaultValue: '', required: true, group: 'connection' },
      { key: 'privateKey', label: 'Приватный ключ', labelEn: 'Private Key', type: 'string', defaultValue: '', group: 'security' },
      { key: 'tls', label: 'TLS', labelEn: 'TLS', type: 'boolean', defaultValue: true, group: 'security' },
      RECONNECT_FIELD,
    ],
  },
  {
    id: 'amqp', name: 'AMQP 1.0', nameEn: 'AMQP 1.0',
    category: 'cloud', icon: 'Server', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
    transport: 'tcp', defaultPort: 5672, isSerial: false,
    description: 'AMQP 1.0 — протокол обмена сообщениями',
    descriptionEn: 'AMQP 1.0 — Advanced Message Queuing Protocol',
    version: '1.0.0', status: 'stable',
    opaS: true, opaSCategory: 'iot-edge', opaSCompliance: 'partial',
    fields: [
      { key: 'host', label: 'Брокер', labelEn: 'Broker', type: 'string', defaultValue: '192.168.1.100', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 5672, group: 'connection' },
      { key: 'vhost', label: 'Virtual Host', labelEn: 'VHost', type: 'string', defaultValue: '/', group: 'connection' },
      { key: 'username', label: 'Имя пользователя', labelEn: 'Username', type: 'string', defaultValue: '', group: 'security' },
      { key: 'password', label: 'Пароль', labelEn: 'Password', type: 'string', defaultValue: '', group: 'security' },
      { key: 'exchange', label: 'Exchange', labelEn: 'Exchange', type: 'string', defaultValue: 'iot-data', group: 'data' },
      { key: 'routingKey', label: 'Routing Key', labelEn: 'Routing Key', type: 'string', defaultValue: 'sensor.#', group: 'data' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 5000, group: 'timing' },
      RECONNECT_FIELD,
    ],
  },

  // ==================== DATABASE SINKS ====================
  {
    id: 'mongodb', name: 'MongoDB', nameEn: 'MongoDB',
    category: 'cloud', icon: 'Database', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    transport: 'tcp', defaultPort: 27017, isSerial: false,
    description: 'MongoDB — NoSQL база данных для хранения IoT данных',
    descriptionEn: 'MongoDB — NoSQL database for IoT data storage',
    version: '0.8.0', status: 'beta',
    opaS: true, opaSCategory: 'database', opaSCompliance: 'partial',
    fields: [
      { key: 'host', label: 'Хост', labelEn: 'Host', type: 'string', defaultValue: '192.168.1.152', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 27017, group: 'connection' },
      { key: 'database', label: 'База данных', labelEn: 'Database', type: 'string', defaultValue: 'iot_data', required: true, group: 'connection' },
      { key: 'collection', label: 'Коллекция', labelEn: 'Collection', type: 'string', defaultValue: 'sensor_readings', required: true, group: 'connection' },
      { key: 'username', label: 'Имя пользователя', labelEn: 'Username', type: 'string', defaultValue: '', group: 'security' },
      { key: 'password', label: 'Пароль', labelEn: 'Password', type: 'string', defaultValue: '', group: 'security' },
      { key: 'authSource', label: 'Auth Source', labelEn: 'Auth Source', type: 'string', defaultValue: 'admin', group: 'security' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 10000, group: 'timing' },
      { key: 'batchSize', label: 'Размер пакета', labelEn: 'Batch Size', type: 'number', defaultValue: 200, min: 1, max: 5000, group: 'advanced' },
    ],
  },
  {
    id: 'postgresql', name: 'PostgreSQL', nameEn: 'PostgreSQL',
    category: 'cloud', icon: 'Database', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    transport: 'tcp', defaultPort: 5432, isSerial: false,
    description: 'PostgreSQL — реляционная БД для хранения данных',
    descriptionEn: 'PostgreSQL — relational database for data storage',
    version: '0.8.0', status: 'beta',
    opaS: true, opaSCategory: 'database', opaSCompliance: 'partial',
    fields: [
      { key: 'host', label: 'Хост', labelEn: 'Host', type: 'string', defaultValue: '192.168.1.153', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 5432, group: 'connection' },
      { key: 'database', label: 'База данных', labelEn: 'Database', type: 'string', defaultValue: 'iot', required: true, group: 'connection' },
      { key: 'schema', label: 'Схема', labelEn: 'Schema', type: 'string', defaultValue: 'public', group: 'connection' },
      { key: 'table', label: 'Таблица', labelEn: 'Table', type: 'string', defaultValue: 'sensor_data', required: true, group: 'connection' },
      { key: 'username', label: 'Имя пользователя', labelEn: 'Username', type: 'string', defaultValue: 'postgres', group: 'security' },
      { key: 'password', label: 'Пароль', labelEn: 'Password', type: 'string', defaultValue: '', group: 'security' },
      { key: 'sslMode', label: 'SSL режим', labelEn: 'SSL Mode', type: 'select', defaultValue: 'disable', group: 'security', options: [
        { value: 'disable', label: 'Отключено' }, { value: 'require', label: 'Требуется' },
      ]},
      { key: 'batchSize', label: 'Размер пакета', labelEn: 'Batch Size', type: 'number', defaultValue: 500, group: 'advanced' },
      { key: 'flushInterval', label: 'Интервал отправки (мс)', labelEn: 'Flush Interval', type: 'number', defaultValue: 5000, group: 'advanced' },
    ],
  },
  {
    id: 'elasticsearch', name: 'Elasticsearch', nameEn: 'Elasticsearch',
    category: 'cloud', icon: 'Database', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    transport: 'tcp', defaultPort: 9200, isSerial: false,
    description: 'Elasticsearch — поисковый движок для хранения и анализа данных',
    descriptionEn: 'Elasticsearch — search engine for data storage and analytics',
    version: '0.8.0', status: 'beta',
    opaS: true, opaSCategory: 'database', opaSCompliance: 'partial',
    fields: [
      { key: 'host', label: 'Хост', labelEn: 'Host', type: 'string', defaultValue: '192.168.1.154', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 9200, group: 'connection' },
      { key: 'index', label: 'Индекс', labelEn: 'Index', type: 'string', defaultValue: 'iot-data', required: true, group: 'connection' },
      { key: 'username', label: 'Имя пользователя', labelEn: 'Username', type: 'string', defaultValue: 'elastic', group: 'security' },
      { key: 'password', label: 'Пароль', labelEn: 'Password', type: 'string', defaultValue: '', group: 'security' },
      { key: 'tls', label: 'TLS', labelEn: 'TLS', type: 'boolean', defaultValue: false, group: 'security' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 10000, group: 'timing' },
      { key: 'batchSize', label: 'Размер пакета', labelEn: 'Batch Size', type: 'number', defaultValue: 500, min: 1, max: 5000, group: 'advanced' },
    ],
  },

  // ==================== LEGACY SERIAL ====================
  {
    id: 'df1', name: 'Allen-Bradley DF1', nameEn: 'Allen-Bradley DF1',
    category: 'custom', icon: 'Cable', color: 'bg-red-500/10 text-red-600 dark:text-red-400',
    transport: 'serial', defaultPort: 0, isSerial: true,
    description: 'DF1 — последовательный протокол Allen-Bradley (PLC-5, SLC-500)',
    descriptionEn: 'DF1 — Allen-Bradley serial protocol (PLC-5, SLC-500)',
    version: '0.6.0', status: 'experimental',
    opaS: true, opaSCategory: 'legacy', opaSCompliance: 'planned',
    fields: [
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 3000, group: 'timing' },
      { key: 'pollInterval', label: 'Интервал опроса (мс)', labelEn: 'Poll Interval', type: 'number', defaultValue: 2000, group: 'timing' },
      RECONNECT_FIELD,
    ],
    serialFields: [
      { key: 'port', label: 'Последовательный порт', labelEn: 'Serial Port', type: 'select', defaultValue: '/dev/ttyUSB0', group: 'serial', required: true, options: [
        { value: '/dev/ttyUSB0', label: '/dev/ttyUSB0' }, { value: '/dev/ttyS0', label: '/dev/ttyS0' }, { value: 'COM1', label: 'COM1' },
      ]},
      { key: 'baudRate', label: 'Скорость (бод)', labelEn: 'Baud Rate', type: 'select', defaultValue: '19200', group: 'serial', options: [
        { value: '9600', label: '9600' }, { value: '19200', label: '19200' }, { value: '38400', label: '38400' },
      ]},
      { key: 'dataBits', label: 'Биты данных', labelEn: 'Data Bits', type: 'select', defaultValue: '8', group: 'serial', options: [{ value: '7', label: '7' }, { value: '8', label: '8' }] },
      { key: 'stopBits', label: 'Стоп-биты', labelEn: 'Stop Bits', type: 'select', defaultValue: '1', group: 'serial', options: [{ value: '1', label: '1' }, { value: '2', label: '2' }] },
      { key: 'parity', label: 'Чётность', labelEn: 'Parity', type: 'select', defaultValue: 'even', group: 'serial', options: [
        { value: 'none', label: 'Нет' }, { value: 'even', label: 'Чёт' }, { value: 'odd', label: 'Нечёт' },
      ]},
    ],
  },

  // ==================== ENTERPRISE HISTORIANS ====================
  {
    id: 'pi-system', name: 'OSIsoft PI System', nameEn: 'OSIsoft PI System',
    category: 'cloud', icon: 'Database', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    transport: 'tcp', defaultPort: 5450, isSerial: false,
    description: 'OSIsoft PI System — корпоративная система хранения исторических данных',
    descriptionEn: 'OSIsoft PI System — enterprise process data historian',
    version: '1.0.0', status: 'stable',
    opaS: true, opaSCategory: 'database', opaSCompliance: 'partial',
    fields: [
      { key: 'host', label: 'PI Data Archive сервер', labelEn: 'PI Data Archive Host', type: 'string', defaultValue: 'piserver.local', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 5450, min: 1, max: 65535, group: 'connection' },
      { key: 'serverName', label: 'Имя PI сервера', labelEn: 'PI Server Name', type: 'string', defaultValue: 'DefaultPI', required: true, group: 'connection' },
      { key: 'authMode', label: 'Режим аутентификации', labelEn: 'Auth Mode', type: 'select', defaultValue: 'windows', group: 'security', options: [
        { value: 'windows', label: 'Windows Integrated Security' },
        { value: 'anonymous', label: 'Анонимный (PI Trust)' },
        { value: 'password', label: 'Пароль (PI Mappings)' },
      ]},
      { key: 'username', label: 'Имя пользователя PI', labelEn: 'PI Username', type: 'string', defaultValue: '', group: 'security' },
      { key: 'password', label: 'Пароль PI', labelEn: 'PI Password', type: 'string', defaultValue: '', group: 'security' },
      { key: 'dataMode', label: 'Режим записи', labelEn: 'Data Mode', type: 'select', defaultValue: 'insert', group: 'data', options: [
        { value: 'insert', label: 'Insert (новые данные)' },
        { value: 'replace', label: 'Replace (перезапись)' },
        { value: 'no_replace', label: 'NoReplace (без перезаписи)' },
        { value: 'insert_no_replace', label: 'InsertNoReplace' },
      ]},
      { key: 'piTagPrefix', label: 'Префикс PI тегов', labelEn: 'PI Tag Prefix', type: 'string', defaultValue: 'IOT_', description: 'Префикс для auto-created PI тегов', group: 'data' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 30000, min: 5000, max: 120000, group: 'timing' },
      { key: 'flushInterval', label: 'Интервал отправки (сек)', labelEn: 'Flush Interval', type: 'number', defaultValue: 5, min: 1, max: 3600, group: 'timing' },
      { key: 'retryOnFail', label: 'Повтор при ошибке', labelEn: 'Retry on Failure', type: 'boolean', defaultValue: true, group: 'advanced' },
      { key: 'maxRetries', label: 'Макс. повторов', labelEn: 'Max Retries', type: 'number', defaultValue: 3, min: 0, max: 10, group: 'advanced' },
    ],
  },
  {
    id: 'influxdb', name: 'InfluxDB', nameEn: 'InfluxDB',
    category: 'cloud', icon: 'Database', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    transport: 'tcp', defaultPort: 8086, isSerial: false,
    description: 'InfluxDB — временная база данных для телеметрии',
    descriptionEn: 'InfluxDB — time series database for telemetry',
    version: '1.0.0', status: 'stable',
    opaS: true, opaSCategory: 'database', opaSCompliance: 'partial',
    fields: [
      { key: 'host', label: 'Хост InfluxDB', labelEn: 'InfluxDB Host', type: 'string', defaultValue: 'localhost', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 8086, group: 'connection' },
      { key: 'database', label: 'База данных', labelEn: 'Database', type: 'string', defaultValue: 'iot_edge', required: true, group: 'connection' },
      { key: 'retentionPolicy', label: 'Retention Policy', labelEn: 'Retention Policy', type: 'string', defaultValue: 'autogen', group: 'data' },
      { key: 'precision', label: 'Точность времени', labelEn: 'Precision', type: 'select', defaultValue: 'ms', group: 'data', options: [
        { value: 'ns', label: 'Наносекунды' }, { value: 'us', label: 'Микросекунды' },
        { value: 'ms', label: 'Миллисекунды' }, { value: 's', label: 'Секунды' },
      ]},
      { key: 'username', label: 'Имя пользователя', labelEn: 'Username', type: 'string', defaultValue: '', group: 'security' },
      { key: 'password', label: 'Пароль', labelEn: 'Password', type: 'string', defaultValue: '', group: 'security' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 10000, min: 1000, max: 60000, group: 'timing' },
      { key: 'batchSize', label: 'Размер пакета', labelEn: 'Batch Size', type: 'number', defaultValue: 1000, min: 10, max: 10000, group: 'timing' },
      { key: 'flushInterval', label: 'Интервал отправки (сек)', labelEn: 'Flush Interval', type: 'number', defaultValue: 5, min: 1, max: 3600, group: 'timing' },
    ],
  },
  {
    id: 'timescaledb', name: 'TimescaleDB', nameEn: 'TimescaleDB',
    category: 'cloud', icon: 'Database', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    transport: 'tcp', defaultPort: 5432, isSerial: false,
    description: 'TimescaleDB — PostgreSQL для временных рядов',
    descriptionEn: 'TimescaleDB — time-series SQL database powered by PostgreSQL',
    version: '1.0.0', status: 'stable',
    opaS: true, opaSCategory: 'database', opaSCompliance: 'partial',
    fields: [
      { key: 'host', label: 'Хост', labelEn: 'Host', type: 'string', defaultValue: 'localhost', required: true, group: 'connection' },
      { key: 'port', label: 'Порт', labelEn: 'Port', type: 'number', defaultValue: 5432, group: 'connection' },
      { key: 'database', label: 'База данных', labelEn: 'Database', type: 'string', defaultValue: 'iot_edge', required: true, group: 'connection' },
      { key: 'schema', label: 'Схема', labelEn: 'Schema', type: 'string', defaultValue: 'public', group: 'connection' },
      { key: 'tableName', label: 'Имя таблицы', labelEn: 'Table Name', type: 'string', defaultValue: 'telemetry', required: true, group: 'data' },
      { key: 'username', label: 'Имя пользователя', labelEn: 'Username', type: 'string', defaultValue: 'postgres', required: true, group: 'security' },
      { key: 'password', label: 'Пароль', labelEn: 'Password', type: 'string', defaultValue: '', group: 'security' },
      { key: 'sslMode', label: 'SSL режим', labelEn: 'SSL Mode', type: 'select', defaultValue: 'prefer', group: 'security', options: [
        { value: 'disable', label: 'Disable' }, { value: 'prefer', label: 'Prefer' },
        { value: 'require', label: 'Require' }, { value: 'verify-ca', label: 'Verify CA' },
        { value: 'verify-full', label: 'Verify Full' },
      ]},
      { key: 'batchSize', label: 'Размер пакета', labelEn: 'Batch Size', type: 'number', defaultValue: 500, min: 10, max: 10000, group: 'timing' },
      { key: 'flushInterval', label: 'Интервал отправки (сек)', labelEn: 'Flush Interval', type: 'number', defaultValue: 10, min: 1, max: 3600, group: 'timing' },
      { key: 'timeout', label: 'Таймаут (мс)', labelEn: 'Timeout', type: 'number', defaultValue: 10000, min: 1000, max: 60000, group: 'timing' },
    ],
  },
];

export function getProtocol(id: string): ProtocolDef | undefined {
  return PROTOCOLS.find(p => p.id === id);
}

export function getProtocolsByCategory(category: string): ProtocolDef[] {
  return PROTOCOLS.filter(p => p.category === category);
}

export function getOpaSProtocols(category?: OpaSCategory): ProtocolDef[] {
  return PROTOCOLS.filter(p => p.opaS && (!category || p.opaSCategory === category));
}

export function getGroupedFields(protocol: ProtocolDef): Record<string, ProtocolField[]> {
  const grouped: Record<string, ProtocolField[]> = {};
  protocol.fields.forEach(f => {
    const g = f.group || 'general';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(f);
  });
  return grouped;
}

export const GROUP_LABELS: Record<string, string> = {
  connection: 'Соединение', security: 'Безопасность', timing: 'Тайминги', advanced: 'Дополнительно',
  serial: 'Последовательный порт', data: 'Данные',
};

export const COMPLIANCE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline'; color: string }> = {
  full: { label: 'Полная', variant: 'default', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  partial: { label: 'Частичная', variant: 'secondary', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  planned: { label: 'Планируется', variant: 'outline', color: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/30' },
};
