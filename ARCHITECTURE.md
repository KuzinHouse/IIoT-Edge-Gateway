# IoT Edge Gateway — Архитектурная документация

> Версия: 0.2.0 | Дата: 2025-07  
> Статус: Production-ready (Beta)  
> Уровень: EMQX Neuron equivalent

---

## 1. Обзор проекта

**IoT Edge Gateway** — промышленный IoT Edge шлюз для сбора данных с полевых устройств, преобразования протоколов, обработки телеметрии и передачи в северные системы (SCADA, MES, Cloud, Time-Series DB).

### Назначение

- Сбор данных с южных устройств (ПЛК, датчики, счётчики) по промышленным протоколам
- Преобразование данных между протоколами (Protocol Bridging)
- Локальная обработка данных на Edge (пайплайны, агрегация, фильтрация)
- Обнаружение аварий и генерация уведомлений
- Передача телеметрии в северные приложения (MQTT, Kafka, HTTP, Cloud)
- Единое управление через Web Dashboard

### Стек технологий

| Компонент | Технология | Версия |
|-----------|-----------|--------|
| Frontend Framework | Next.js | 16.1.1 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| UI Components | shadcn/ui + Radix UI | latest |
| ORM | Prisma | 6.11.1 |
| Charts | Recharts | 2.15.4 |
| State Management | Zustand | 5.0.6 |
| Data Fetching | TanStack React Query | 5.82.0 |
| Forms | React Hook Form + Zod | 7.60 / 4.0.2 |
| Icons | Lucide React | 0.525.0 |
| Runtime | Bun | latest |
| Database | SQLite (Prisma) | — |
| Reverse Proxy | Caddy | — |

---

## 2. Системная архитектура

### Архитектурная схема (South → Gateway → North)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ЮЖНЫЕ УСТРОЙСТВА (South)                        │
│                                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Modbus   │ │ OPC UA   │ │ Siemens  │ │ BACnet/  │ │ IEC      │    │
│  │ TCP/RTU  │ │ Server   │ │ S7       │ │ IP       │ │ 60870-5- │    │
│  │          │ │          │ │          │ │          │ │ 104      │    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘    │
│       │            │            │            │            │            │
│  ┌────┴─────┐ ┌────┴─────┐ ┌───┴──────┐ ┌───┴──────┐ ┌───┴──────┐  │
│  │ Allen-   │ │ DNP3 /   │ │ SNMP     │ │ HART-IP /│ │ MQTT /   │  │
│  │ Bradley  │ │ IEC 61850│ │ v1/v2c/3 │ │ Generic  │ │ Kafka    │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
└───────┼────────────┼────────────┼────────────┼────────────┼─────────┘
        │            │            │            │            │
════════╪════════════╪════════════╪════════════╪════════════╪═════════
        ▼            ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     IoT EDGE GATEWAY (Core)                         │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Protocol Drivers (OPA-S)                        │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │   │
│  │  │Modbus  │ │OPC UA  │ │S7/Snap7│ │BACnet  │ │IEC 104 │   │   │
│  │  │Engine  │ │Client  │ │Client  │ │Client  │ │Client  │   │   │
│  │  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘   │   │
│  └──────┼──────────┼──────────┼──────────┼──────────┼─────────┘   │
│         ▼          ▼          ▼          ▼          ▼              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Tag Engine (Data Model)                   │   │
│  │   Tag ── value, quality, timestamp, address, unit           │   │
│  │   Tag ── scanRate, access (read/write), group               │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Pipeline Engine                           │   │
│  │   [Source] → [Transform] → [Filter] → [Aggregator] →       │   │
│  │                                         [Destination]       │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Alarm Engine + Notifications                   │   │
│  │   Rules: condition, setpoint, deadband, delay               │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              JSON-LD Serialization Layer                    │   │
│  │   @context: iot, schema, qudt, sosa, time, xsd              │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
═══════════════════════════════╪═══════════════════════════════════════
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    СЕВЕРНЫЕ ПРИЛОЖЕНИЯ (North Apps)                 │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │ MQTT v5  │ │ Kafka    │ │ HTTP     │ │WebSocket │ │ AWS IoT  ││
│  │ Broker   │ │ Producer │ │ REST API │ │ Stream   │ │ Core     ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │ Azure    │ │ PI       │ │ InfluxDB │ │Timescale │ │Elastic-  ││
│  │ IoT Hub  │ │ System   │ │          │ │ DB       │ │ search   ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Описание потоков данных

Все данные внутри системы передаются в формате **Flat JSON-LD**. Каждый узел данных представляет собой плоский key-value объект с семантическими аннотациями:

```
South Device → Tag Engine → Pipeline → JSON-LD Serialization → North App
     │              │            │               │                    │
     │         Poll/Subscribe  Transform      @context              Publish
     │         Scan Rate      Filter           @type                  │
     │         Quality        Aggregate        @id                   │
     │                        Alarm Check     timestamp              │
     │                                        value                  │
     │                                        quality                │
     │                                        unit                   │
     ▼                                                                ▼
  Raw registers                                              MQTT/Kafka/HTTP/
  (Modbus coils,                                             WebSocket/Cloud
   OPC UA variables,
   S7 DB blocks...)
```

### Компоненты системы

| Компонент | Описание | Реализация |
|-----------|----------|------------|
| Web Dashboard | SPA интерфейс управления | Next.js 16 + shadcn/ui |
| Protocol Drivers | Драйверы промышленных протоколов | protocol-registry.ts (OPA-S) |
| Tag Engine | Управление тегами и значениями | Prisma ORM + in-memory cache |
| Pipeline Engine | Визуальный редактор пайплайнов | PipelineView.tsx (SVG Canvas) |
| Alarm Engine | Мониторинг уставок и уведомления | AlarmsView.tsx + AlarmRule model |
| JSON-LD Layer | Семантическая сериализация | jsonld-model.ts |
| RBAC | Ролевая модель доступа | User/Role/Permission models |
| License Manager | Управление лицензиями | License model + SettingsView |
| Audit Log | Журнал действий | AuditLog model |
| Modbus Simulator | Mini-сервис для отладки | Bun TCP server (port 8502) |
| WS Broker | Real-time data streaming | Bun WebSocket (port 8503) |
| MQTT Bridge | MQTT pub/sub simulation | Bun HTTP + pubsub (port 8504) |

---

## 3. Южные устройства (South Devices)

### Поддерживаемые протоколы

Система поддерживает **30+ протоколов**, организованных по 8 категориям:

#### 3.1 Modbus Family

| Протокол | Transport | Порт по умолчанию | Статус |
|----------|-----------|-------------------|--------|
| **Modbus TCP** | TCP | 502 | Stable |
| **Modbus RTU** | Serial (RS-232/485/422) | — | Stable |
| **Modbus ASCII** | Serial | — | Stable |

Поддерживаемые Function Codes: FC01 (Read Coils), FC02 (Read Discrete Inputs), FC03 (Read Holding Registers), FC04 (Read Input Registers), FC05 (Write Single Coil), FC06 (Write Single Register), FC15 (Write Multiple Coils), FC16 (Write Multiple Registers), FC43 (Read Device Identification).

#### 3.2 OPC UA

| Протокол | Transport | Порт по умолчанию | Статус |
|----------|-----------|-------------------|--------|
| **OPC UA** | TCP | 4840 | Stable |

Режимы безопасности: None, Sign, SignAndEncrypt.  
Политики: None, Basic128Rsa15, Basic256, Basic256Sha256, Aes128Sha256RsaOaep, Aes256Sha256RsaPss.  
Аутентификация: Anonymous, Username/Password, Certificate, JWT Token.

#### 3.3 Промышленные ПЛК (Industrial PLCs)

| Протокол | Transport | Порт | ПЛК | Статус |
|----------|-----------|------|-----|--------|
| **Siemens S7** | TCP | 102 | S7-200/300/400/1200/1500, LOGO! | Stable |
| **Allen-Bradley EtherNet/IP** | TCP | 44818 | ControlLogix, CompactLogix, MicroLogix, PLC-5 | Stable |
| **Mitsubishi MC Protocol** | TCP | 5000 | iQ-R, iQ-F, Q/L/FX/A Series | Stable |
| **Beckhoff TwinCAT ADS/AMS** | TCP | 48898 | TwinCAT 2/3 | Stable |
| **Omron FINS** | TCP | 9600 | CJ/NJ/NX Series | Stable |
| **Allen-Bradley DF1** | Serial | — | PLC-5, SLC-500 | Experimental |

#### 3.4 Автоматизация зданий (Building Automation)

| Протокол | Transport | Порт | Статус |
|----------|-----------|------|--------|
| **BACnet/IP** | UDP | 47808 | Stable |
| **KNXnet/IP** | UDP | 3671 | Beta |
| **LonWorks IP** | UDP | 1628 | Experimental |
| **DALI** | Serial | — | Beta |

#### 3.5 Энергетика (Energy / Power)

| Протокол | Transport | Порт | Статус |
|----------|-----------|------|--------|
| **IEC 60870-5-104** | TCP | 2404 | Stable |
| **DNP3 (IEEE 1815)** | TCP/UDP/Serial | 20000 | Beta |
| **IEC 61850 (MMS)** | TCP | 102 | Stable |
| **HART-IP** | TCP | 5094 | Experimental |
| **HART Generic** | Serial | — | Stable |
| **FOUNDATION Fieldbus HSE** | UDP | 10800 | Experimental |
| **PROFIBUS DP** | Serial | — | Experimental |

#### 3.6 Сетевые протоколы (Network)

| Протокол | Transport | Порт | Статус |
|----------|-----------|------|--------|
| **SNMP v1** | UDP | 161 | Stable |
| **SNMP v2c** | UDP | 161 | Stable |
| **SNMP v3** | UDP | 161 | Stable |

SNMP v3 поддерживает аутентификацию (MD5, SHA, SHA-256, SHA-512) и шифрование (DES, AES-128/192/256).

#### 3.7 Облачные и IoT протоколы (Cloud / IoT)

| Протокол | Transport | Порт | Статус |
|----------|-----------|------|--------|
| **MQTT v5** | TCP | 1883 | Stable |
| **MQTT Sparkplug B** | TCP | 1883 | Stable |
| **Apache Kafka** | TCP | 9092 | Stable |
| **HTTP REST** | TCP | 443 | Stable |
| **WebSocket** | TCP | 80/443 | Stable |
| **AWS IoT Core** | TCP (TLS) | 8883 | Stable |
| **Azure IoT Hub** | TCP (TLS) | 8883 | Stable |
| **Google Cloud IoT** | TCP (TLS) | 8883 | Beta |
| **AMQP 1.0** | TCP | 5672 | Stable |

#### 3.8 Базы данных (Database Sinks)

| Протокол | Transport | Порт | Статус |
|----------|-----------|------|--------|
| **MongoDB** | TCP | 27017 | Beta |
| **PostgreSQL / TimescaleDB** | TCP | 5432 | Beta |
| **Elasticsearch** | TCP | 9200 | Beta |
| **InfluxDB** | TCP | 8086 | Beta |
| **OSIsoft PI System** | TCP | 5450 | Stable |

### Категории протоколов (OPA-S)

Все протоколы снабжены OPA-S (Open Platform Architecture — South) атрибутами:

| Категория | ID | Описание |
|-----------|-----|----------|
| Промышленные ПЛК | `industrial-plc` | Связь с программируемыми логическими контроллерами |
| Автоматизация зданий | `building-automation` | HVAC, освещение, управление зданием |
| Процессная автоматизация | `process-automation` | Полевые приборы, HART, FF |
| Энергетика | `energy` | Телемеханика, подстанции, электросчётчики |
| IoT Edge | `iot-edge` | MQTT, Kafka, WebSocket, SNMP |
| Базы данных | `database` | PostgreSQL, InfluxDB, MongoDB, Elasticsearch |
| Облачные платформы | `cloud` | AWS, Azure, Google Cloud IoT |
| Устаревшие протоколы | `legacy` | Modbus ASCII, DF1 |

Уровни соответствия OPA-S: `full` — полная поддержка, `partial` — частичная, `planned` — запланирована.

### Шаблоны устройств (Device Templates)

Система включает **26 шаблонов устройств** для быстрого создания подключений. Каждый шаблон содержит реальные карты регистров (10–18 регистров).

| Категория | Кол-во | Шаблоны |
|-----------|--------|---------|
| Электроэнергетика (Power Meters) | 4 | Schneider PM5110, ABB REF615, Elspec G4500, Eaton PowerXL DM1100 |
| ПЛК (PLCs) | 5 | Siemens S7-1200, Siemens S7-1500, WAGO 750-880, Beckhoff CX5020, Omron CJ2M |
| Частотные преобразователи (VFDs) | 3 | ABB ACS580, Danfoss FC302, Delta C2000+ |
| Температура (Temperature) | 3 | Yokogawa UT150, Endress+Hauser TM401, Advantech ADAM-4019+ |
| Давление (Pressure) | 3 | Rosemount 3051C, Endress+Hauser Cerabar S, Yokogawa DY150 |
| Расход (Flow) | 3 | Endress+Hauser Promag 10W, Krohne Optiflux 2000, Yokogawa AXF |
| Модули ввода/вывода (I/O) | 3 | Advantech WISE-750, Moxa ioLogik E1212, WAGO 750-458 |
| Шлюзы (Gateways) | 2 | Moxa MGate 5105, Elsinco EL-MB-GW |

**Производители (17):** Schneider Electric, ABB, Siemens, Danfoss, Yokogawa, Rosemount, Endress+Hauser, Advantech, WAGO, Beckhoff, Moxa, Omron, Delta, Elsinco, Elspec, Eaton, Krohne.

Типы регистров: Holding, Input, Coil, Discrete.  
Типы данных: FLOAT32, UINT16, INT16, INT32, UINT32, BOOL.

---

## 4. Пайплайны (Pipelines)

### Архитектура потоков данных

Пайплайны реализуют визуальный редактор данных на основе SVG-холста. Данные проходят через цепочку узлов:

```
[Source] ──→ [Transform] ──→ [Filter] ──→ [Aggregator] ──→ [Destination]
   │               │              │              │                │
   │          Масштабирование  По качеству  Среднее/мин/макс    MQTT
   │          Конвертация     По условию   По окну             Kafka
   │          Маппинг         По значению  По группе           HTTP
   │                                                        WebSocket
```

### Типы узлов

#### Узлы данных (Data Nodes)

| Тип | Описание | Входы | Выходы |
|-----|----------|-------|--------|
| **South Device Source** | Источник данных от южного устройства | 0 | 1 |
| **Tag Reader** | Чтение конкретных тегов | 0 | 1 |
| **Data Transform** | Преобразование значений (scale, map, type cast) | 1 | 1 |
| **Filter** | Фильтрация данных по условию | 1 | 1 |
| **Aggregator** | Агрегация (avg, min, max, sum, count) | 1 | 1 |
| **Script** | Пользовательский JavaScript-скрипт | 1 | 1 |

#### Узлы вывода (Output Nodes)

| Тип | Описание | Входы | Выходы |
|-----|----------|-------|--------|
| **MQTT Publish** | Публикация в MQTT топик | 1 | 0 |
| **HTTP Push** | Отправка HTTP POST/PUT запроса | 1 | 0 |
| **Kafka Producer** | Запись в Kafka топик | 1 | 0 |
| **WebSocket** | Потоковая передача через WebSocket | 1 | 0 |

#### Служебные узлы (Utility Nodes)

| Тип | Описание | Входы | Выходы |
|-----|----------|-------|--------|
| **Logger** | Запись в журнал (log level, max entries) | 1 | 1 |
| **Alarm Check** | Проверка аварийных уставок | 1 | 1 |
| **Delay** | Задержка потока (буфер) | 1 | 1 |

### Шаблоны пайплайнов (8 шаблонов)

| # | Шаблон | Категория | Узлы | Описание |
|---|--------|-----------|------|----------|
| 1 | Простой сквозной пайплайн | Базовые | 2 | South → MQTT напрямую |
| 2 | Масштабирование + MQTT | Обработка данных | 3 | Масштабирование значений → MQTT |
| 3 | Обнаружение аварий + уведомления | Аварии | 4 | Tag Reader → Alarm Check → Logger + MQTT |
| 4 | Агрегация + хранение | Обработка данных | 3 | South → Aggregator → InfluxDB HTTP |
| 5 | Конвертация протоколов | Продвинутые | 3 | Modbus → Transform → OPC UA HTTP |
| 6 | Фильтрация качества + облако | Облачные | 4 | South → Filter (good only) → Logger + AWS IoT |
| 7 | Мульти-маршрутизация | Продвинутые | 4 | South → MQTT + Kafka + WebSocket (fanout) |
| 8 | Пакетная агрегация | Обработка данных | 4 | South → Delay → Aggregator → REST API batch |

---

## 5. Северные приложения (North Apps)

### Протоколы назначения

| Протокол | Transport | Порт | Формат данных |
|----------|-----------|------|---------------|
| **MQTT v5** | TCP | 1883 | JSON, XML, Protobuf |
| **MQTT Sparkplug B** | TCP | 1883 | Protobuf (Sparkplug) |
| **Apache Kafka** | TCP | 9092 | JSON |
| **HTTP REST** | TCP | 443 | JSON, XML, CSV |
| **WebSocket** | TCP | 80/443 | JSON |
| **AWS IoT Core** | TCP (TLS) | 8883 | JSON |
| **Azure IoT Hub** | TCP (TLS) | 8883 | JSON |
| **Google Cloud IoT** | TCP (TLS) | 8883 | JSON |
| **AMQP 1.0** | TCP | 5672 | JSON |
| **InfluxDB** | TCP | 8086 | Line Protocol |
| **TimescaleDB** | TCP | 5432 | SQL INSERT |
| **Elasticsearch** | TCP | 9200 | JSON |
| **OSIsoft PI System** | TCP | 5450 | JSON |

### Шаблоны северных приложений (13 шаблонов)

| # | Шаблон | Категория | Протокол | Описание |
|---|--------|-----------|----------|----------|
| 1 | MQTT v5 — Eclipse Projects | MQTT | MQTT v5 | Публичный брокер без аутентификации |
| 2 | MQTT v5 — Blue Traktor | MQTT | MQTT v5 | Тестовый брокер blue-traktor.ru:1888 |
| 3 | MQTT Sparkplug B | MQTT | Sparkplug | Промышленный профиль для Ignition SCADA |
| 4 | Apache Kafka | Streaming | Kafka | Потоковая платформа данных |
| 5 | WebSocket Stream | Streaming | WebSocket | Real-time потоковая передача |
| 6 | AWS IoT Core | Cloud | MQTT+TLS | Облако AWS с X.509 сертификатами |
| 7 | Azure IoT Hub | Cloud | MQTT+TLS | Облако Microsoft Azure |
| 8 | InfluxDB | Database | HTTP | Time-series БД (InfluxDB 2.x) |
| 9 | TimescaleDB | Database | PostgreSQL | PostgreSQL для временных рядов |
| 10 | Elasticsearch | Database | HTTP | Поисковый движок + Kibana |
| 11 | OSIsoft PI System | Database | TCP | Корпоративный историк (нефтегаз) |
| 12 | OPC UA Сервер | Industrial | OPC UA | Экспозиция данных как OPC UA сервер |
| 13 | HTTP REST API Push | API | HTTP | POST на кастомный backend |

---

## 6. Модель данных

### Flat JSON-LD формат

Все данные в системе сериализуются в формате **Flat JSON-LD** — плоские key-value объекты с семантическими аннотациями W3C:

```json
{
  "@context": {
    "iot": "https://iot-schema.org/",
    "schema": "https://schema.org/",
    "qudt": "https://qudt.org/schema/qudt/",
    "sosa": "http://www.w3.org/ns/sosa/",
    "time": "http://www.w3.org/2006/time#",
    "xsd": "http://www.w3.org/2001/XMLSchema#"
  },
  "@id": "tag:device-001:40001",
  "@type": "Tag",
  "name": "Датчик температуры 1",
  "address": "40001",
  "value": 72.5,
  "quality": "good",
  "unit": "°C",
  "deviceId": "device-001",
  "deviceName": "Siemens S7-1200",
  "groupName": "Температура",
  "dataType": "FLOAT",
  "timestamp": "2025-07-10T14:30:00.000Z",
  "scanRate": 1000,
  "protocol": "modbus-tcp"
}
```

### Типы сущностей

| Тип `@type` | Описание | Ключевые поля |
|-------------|----------|---------------|
| **Tag** | Тег данных (значение датчика) | name, address, value, quality, unit, device, group, dataType, timestamp |
| **Alarm** | Аварийное событие | name, severity (critical/warning/info), tag, event (triggered/cleared/acknowledged), setpoint, deadband |
| **Device** | Южное устройство | name, protocol, protocolId, host, port, status, tagCount |
| **Pipeline** | Сообщение пайплайна | pipelineId, nodeId, nodeType, status, tagsProcessed, data |
| **Metric** | Системная метрика | name, value, unit, deviceId |

### Качество данных (Quality)

| Значение | Код | Описание |
|----------|-----|----------|
| `good` | 192 | Достоверные данные |
| `bad` | 0 | Недостоверные данные (ошибка связи) |
| `uncertain` | 64 | Неопределённые данные (старение, выход за диапазон) |

### Примеры JSON-LD документов

**Tag (тег данных):**
```json
{
  "@context": { "iot": "https://iot-schema.org/", "schema": "https://schema.org/", ... },
  "@id": "tag:s7-1200:DB1.DBD4",
  "@type": "Tag",
  "name": "Температура подшипника",
  "address": "DB1.DBD4",
  "value": 67.3,
  "quality": "good",
  "unit": "°C",
  "deviceId": "dev-s7-001",
  "deviceName": "Siemens S7-1200",
  "groupName": "Температура",
  "dataType": "FLOAT",
  "timestamp": "2025-07-10T14:30:00.000Z"
}
```

**Alarm (авария):**
```json
{
  "@context": { "iot": "https://iot-schema.org/", "schema": "https://schema.org/", ... },
  "@id": "alarm:temp-high:2025-07-10T14:30:00Z",
  "@type": "Alarm",
  "name": "Температура высокая",
  "severity": "critical",
  "tag": "Датчик температуры 1",
  "event": "triggered",
  "message": "Значение 125.3°C превышает уставку 120°C",
  "setpoint": 120.0,
  "deadband": 2.0
}
```

**Device (устройство):**
```json
{
  "@context": { "iot": "https://iot-schema.org/", "schema": "https://schema.org/", ... },
  "@id": "device:modbus-tcp:Siemens-S7-1200",
  "@type": "Device",
  "name": "Siemens S7-1200",
  "protocol": "Siemens S7",
  "protocolId": "siemens-s7",
  "host": "192.168.1.50",
  "port": 102,
  "status": "online",
  "tagCount": 24
}
```

---

## 7. RBAC — Ролевая модель

### Роли системы

| # | Роль | Описание | Уровень доступа |
|---|------|----------|----------------|
| 1 | **Super Admin** | Полный доступ ко всем функциям | Чтение, запись, удаление, управление |
| 2 | **Admin** | Управление системой и пользователями | Чтение, запись, удаление (кроме Super Admin) |
| 3 | **Engineer** | Конфигурация устройств и пайплайнов | Чтение, запись устройств/пайплайнов/тегов |
| 4 | **Operator** | Оперативное управление (квитирование аварий) | Чтение, квитирование аварий |
| 5 | **Technician** | Диагностика и обслуживание | Чтение, диагностика, тестирование |
| 6 | **Viewer** | Только чтение | Только просмотр |
| 7 | **API Service** | Программный доступ через API | REST API по токену |

### Разрешения по категориям (30+)

| Категория | Разрешения |
|-----------|------------|
| **Устройства** | device:view, device:create, device:edit, device:delete, device:connect |
| **Теги** | tag:view, tag:create, tag:edit, tag:delete, tag:read, tag:write |
| **Пайплайны** | pipeline:view, pipeline:create, pipeline:edit, pipeline:delete, pipeline:run |
| **Аварии** | alarm:view, alarm:acknowledge, alarm:configure |
| **Северные приложения** | northapp:view, northapp:create, northapp:edit, northapp:delete |
| **Драйверы** | driver:view, driver:install, driver:configure, driver:start |
| **Пользователи** | user:view, user:create, user:edit, user:delete |
| **Роли** | role:view, role:create, role:edit, role:delete, role:assign |
| **Система** | system:settings, system:license, system:backup, system:audit |
| **API** | api:access, api:admin |

### Матрица прав доступа

| Разрешение | Super Admin | Admin | Engineer | Operator | Technician | Viewer | API |
|-----------|:-----------:|:-----:|:--------:|:--------:|:----------:|:------:|:---:|
| Полный CRUD устройств | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Создание тегов | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Чтение/Запись тегов | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Конфигурация пайплайнов | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Запуск/остановка пайплайнов | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Квитирование аварий | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Управление пользователями | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Системные настройки | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Управление лицензиями | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Доступ к API | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Только просмотр | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Экспорт/Импорт | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |

---

## 8. Лицензирование

### Уровни лицензий

| Параметр | Free | Standard | Professional | Enterprise |
|----------|:----:|:--------:|:------------:|:----------:|
| Южные устройства | 2 | 10 | 50 | Безлимит |
| Теги данных | 50 | 1 000 | 10 000 | Безлимит |
| Пайплайны | 1 | 10 | 50 | Безлимит |
| Северные приложения | 1 | 5 | 20 | Безлимит |
| Пользователи | 1 | 5 | 25 | Безлимит |
| Протоколы (Industrial) | Modbus only | All Stable | All + Beta | All + Experimental |
| Протоколы (Cloud) | — | MQTT | All Cloud | All + Custom |
| Batch Processing | ❌ | ✅ | ✅ | ✅ |
| Data Aggregation | ❌ | ✅ | ✅ | ✅ |
| Script Node | ❌ | ❌ | ✅ | ✅ |
| OPC UA Information Model | ❌ | Basic | Full | Full |
| RBAC | ❌ | Basic (3 roles) | Full (7 roles) | Full + SSO |
| API Access | ❌ | Read-only | Full | Full + Webhooks |
| Audit Log | ❌ | 7 дней | 90 дней | Безлимит |
| TLS/SSL | ❌ | ✅ | ✅ | ✅ |
| Backup/Restore | ❌ | Manual | Auto + Manual | Auto + Cloud |
| Email Notifications | ❌ | ❌ | ✅ | ✅ |
| SMS/Telegram | ❌ | ❌ | ❌ | ✅ |
| MQTT Sparkplug B | ❌ | ❌ | ✅ | ✅ |
| OSIsoft PI System | ❌ | ❌ | ❌ | ✅ |
| Technical Support | Community | Email | Priority 24/7 | Dedicated Engineer |
| SLA | — | 99.5% | 99.9% | 99.99% |

### Активация и управление

- Лицензия привязывается к организации и email
- Ключ активации — уникальная строка (UUID)
- Отслеживание использования: devices, tags, connections, users
- Дата покупки, дата активации, срок действия
- Статусы: `active`, `expired`, `revoked`

---

## 9. API

### REST API Endpoints

#### JSON-LD API
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/jsonld` | Получить все данные в JSON-LD формате |
| POST | `/api/jsonld` | Создать JSON-LD документ |

#### Dashboard
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/dashboard` | Статистика, метрики, последние аварии |

#### Devices
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/devices` | Список всех устройств |
| POST | `/api/devices` | Создать устройство |
| GET | `/api/devices/[id]` | Получить устройство по ID |
| PUT | `/api/devices/[id]` | Обновить устройство |
| DELETE | `/api/devices/[id]` | Удалить устройство |

#### Connections
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/connections` | Список подключений |
| GET | `/api/connections/[name]` | Подключение по имени |
| POST | `/api/connections/[name]/connect` | Подключиться |
| POST | `/api/connections/[name]/disconnect` | Отключиться |

#### Tags
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/tags` | Список тегов с последними значениями |

#### Alarms
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/alarms` | Список активных аварий |
| POST | `/api/alarms/[id]/acknowledge` | Квитировать аварию |

#### Flows (Пайплайны)
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/flows` | Список пайплайнов |
| POST | `/api/flows` | Создать пайплайн |
| PUT | `/api/flows/[id]` | Обновить пайплайн |
| DELETE | `/api/flows/[id]` | Удалить пайплайн |

#### Drivers
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/drivers` | Список установленных драйверов |

#### North Apps
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/north-apps` | Список северных приложений |
| POST | `/api/north-apps` | Создать приложение |

#### Users
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/users` | Список пользователей |
| POST | `/api/users` | Создать пользователя |

#### License
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/license` | Информация о лицензии |
| POST | `/api/license/activate` | Активировать лицензию |

### WebSocket Streaming (port 8503)

Real-time data streaming через WebSocket Broker:

```javascript
// Подключение
const ws = new WebSocket('ws://gateway:8503');

// Подписка на каналы
ws.send(JSON.stringify({ action: 'subscribe', channels: ['tags', 'metrics', 'alarms', 'status'] }));

// Получение данных
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  // msg.channel: 'tags' | 'metrics' | 'alarms' | 'status'
  // msg.data: массив JSON-LD документов
};
```

**Каналы:**

| Канал | Описание | Частота |
|-------|----------|---------|
| `tags` | Значения тегов в реальном времени | 1–5 сек |
| `metrics` | Системные метрики (CPU, RAM, I/O) | 2–5 сек |
| `alarms` | Аварийные события (triggered/cleared) | По событию |
| `status` | Статус соединений и устройств | 5–10 сек |

**Функции:** Auto-reconnect с exponential backoff (1с → 30с), local simulation fallback при отключении >5с.

### MQTT Bridge (port 8504)

MQTT pub/sub simulation с UNS-структурой топиков:

```
neuron/{device}/{tag}        — значения тегов
neuron/alarms/{tag}          — аварийные события
neuron/metrics/{metric}      — системные метрики
neuron/status/{device}       — статус устройств
```

**REST API:**

| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `:8504/publish` | Опубликовать сообщение |
| POST | `:8504/subscribe` | Подписаться на топик |
| GET | `:8504/topics` | Дерево топиков |
| GET | `:8504/messages` | История сообщений |
| GET | `:8504/health` | Здоровье сервиса |

### Modbus Simulator (port 8502)

Полнофункциональный Modbus TCP сервер для тестирования:

| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `:8502/health` | Здоровье сервиса |
| GET | `:8502/api/registers` | Список регистров |
| GET | `:8502/api/registers/:start/:count` | Прочитать регистры (holding) |
| POST | `:8502/api/registers/:address` | Записать регистр |
| GET | `:8502/api/coils` | Список coils |
| GET | `:8502/api/coils/:start/:count` | Прочитать coils |
| POST | `:8502/api/coils/:address` | Записать coil |
| GET | `:8502/api/snapshot` | Полный слепок всех данных |

**Характеристики:** 10 000 регистров, Function Codes FC01–06, FC15–16, FC43, автосимуляция значений каждые 2 секунды.

---

## 10. Безопасность

### Аутентификация и авторизация

- **JWT (JSON Web Token)** аутентификация
- Токен генерируется при логине, хранится в HTTP-only cookie
- Refresh token с настраиваемым сроком действия
- Поддержка NextAuth.js (v4) для OAuth2 провайдеров
- Настраиваемый session timeout

### Аудит журнал

Все действия пользователей записываются в AuditLog:

```json
{
  "action": "device.edit",
  "resource": "Device",
  "resourceId": "dev-001",
  "userId": "user-admin",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "oldValues": "{\"name\": \"PLC-1\"}",
  "newValues": "{\"name\": \"PLC-1 (Updated)\"}",
  "status": "success"
}
```

### Политика паролей

- Минимальная длина: настраивается (по умолчанию 8 символов)
- Требования: заглавные, строчные, цифры, спецсимволы
- История паролей (повтор запрещён)
- Блокировка аккаунта после N неудачных попыток

### Управление сессиями

- Максимальное количество одновременных сессий: настраивается
- Автоматический logout по таймауту
- Принудительный logout всех сессий (Admin)
- IP whitelist (опционально)
- CORS настройка

---

## 11. Mini-сервисы

### Modbus TCP Simulator (port 8502)

```
┌─────────────────────────────────────────────────┐
│           Modbus TCP Simulator                   │
│                                                  │
│  Регистры: 10 000 (Holding + Input)              │
│  Coils: 10 000 + Discrete Inputs: 10 000        │
│  Function Codes: FC01, FC02, FC03, FC04,         │
│                   FC05, FC06, FC15, FC16, FC43   │
│  Автосимуляция: каждые 2 сек                     │
│  Значения: температуры, давления, расход,        │
│              уровни, скорости, вибрация, ток      │
│                                                  │
│  REST API: register read/write, coil read/write  │
└─────────────────────────────────────────────────┘
```

### WebSocket Broker (port 8503)

```
┌─────────────────────────────────────────────────┐
│              WebSocket Broker                     │
│                                                  │
│  18 симулированных IoT тегов                     │
│  Каналы: tags, metrics, alarms, status           │
│  JSON-LD формат сообщений                        │
│  Подписка: subscribe / unsubscribe               │
│  Auto-reconnect: exponential backoff              │
│  Fallback: локальная симуляция при обрыве         │
│                                                  │
│  REST API: /tags, /metrics, /health              │
└─────────────────────────────────────────────────┘
```

### MQTT Bridge (port 8504)

```
┌─────────────────────────────────────────────────┐
│               MQTT Bridge                        │
│                                                  │
│  UNS topic structure: neuron/{device}/{tag}      │
│  Retained messages                               │
│  QoS 0/1/2                                       │
│  Topic tree browser                              │
│  Message history                                 │
│  Subscription management                         │
│                                                  │
│  REST API: /publish, /subscribe, /topics,        │
│            /messages, /health                    │
└─────────────────────────────────────────────────┘
```

---

## 12. Файловая структура

```
my-project/
├── prisma/
│   ├── schema.prisma              # Prisma ORM схема (25 моделей)
│   └── migrations/                 # Миграции БД
├── db/
│   └── custom.db                   # SQLite база данных
├── mini-services/
│   ├── modbus-simulator/
│   │   ├── index.ts               # Modbus TCP сервер (port 8502)
│   │   └── package.json
│   ├── ws-broker/
│   │   ├── index.ts               # WebSocket Broker (port 8503)
│   │   └── package.json
│   └── mqtt-bridge/
│       ├── index.ts               # MQTT Bridge (port 8504)
│       └── package.json
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (ThemeProvider, Toaster)
│   │   ├── page.tsx               # Main SPA (sidebar + views)
│   │   ├── globals.css            # Tailwind CSS + CSS variables
│   │   └── api/
│   │       ├── route.ts           # API root
│   │       ├── jsonld/route.ts    # JSON-LD API
│   │       ├── dashboard/route.ts # Dashboard stats API
│   │       ├── devices/
│   │       │   ├── route.ts       # Devices CRUD
│   │       │   └── [id]/route.ts  # Device by ID
│   │       ├── connections/
│   │       │   ├── route.ts       # Connections list
│   │       │   └── [name]/
│   │       │       ├── route.ts   # Connection detail
│   │       │       ├── connect/route.ts
│   │       │       └── disconnect/route.ts
│   │       ├── tags/route.ts      # Tags API
│   │       ├── alarms/
│   │       │   ├── route.ts       # Alarms list
│   │       │   └── [id]/acknowledge/route.ts
│   │       ├── flows/route.ts     # Pipelines API
│   │       ├── drivers/route.ts   # Drivers API
│   │       ├── north-apps/route.ts # North Apps API
│   │       ├── users/route.ts     # Users API
│   │       └── license/route.ts   # License API
│   ├── components/
│   │   ├── views/
│   │   │   ├── DashboardView.tsx      # Dashboard с live-данными
│   │   │   ├── SouthDevicesView.tsx   # Управление южными устройствами
│   │   │   ├── NorthAppsView.tsx      # Северные приложения
│   │   │   ├── TagsView.tsx           # Управление тегами
│   │   │   ├── AlarmsView.tsx         # Аварии и правила
│   │   │   ├── PipelineView.tsx       # Визуальный редактор пайплайнов
│   │   │   ├── MonitoringView.tsx     # Real-time мониторинг (WebSocket)
│   │   │   ├── DiagnosticsView.tsx    # Диагностика (Modbus/MQTT/System)
│   │   │   ├── DriversView.tsx        # Управление драйверами (OPA-S)
│   │   │   ├── OPCUAView.tsx          # OPC UA Information Model Browser
│   │   │   └── SettingsView.tsx       # Настройки (General/Security/Users/License/Audit)
│   │   ├── CommandPalette.tsx         # Ctrl+K палитра команд (30+ действий)
│   │   ├── flows/
│   │   │   ├── FlowEditor.tsx         # Flow editor wrapper
│   │   │   ├── NodePalette.tsx        # Node palette component
│   │   │   └── FlowCanvas.tsx         # Flow canvas component
│   │   ├── tags/
│   │   │   └── TagValueCard.tsx       # Tag value display card
│   │   ├── ui/                        # shadcn/ui компоненты (50+)
│   │   └── theme-provider.tsx         # Dark/Light theme provider
│   ├── hooks/
│   │   ├── useWebSocket.ts            # WebSocket hook
│   │   ├── useWebSocketConnection.ts  # WebSocket connection manager
│   │   ├── useDevices.ts              # Devices CRUD hook
│   │   ├── useTags.ts                 # Tags hook
│   │   ├── useAlarms.ts               # Alarms hook
│   │   ├── useConnections.ts          # Connections hook
│   │   ├── usePolling.ts              # Polling hook
│   │   ├── useOPCUA.ts                # OPC UA hook
│   │   ├── useLocalStorage.ts         # localStorage persistence
│   │   ├── use-mobile.ts              # Mobile detection
│   │   └── use-toast.ts               # Toast notifications
│   ├── i18n/
│   │   ├── index.ts                   # i18n setup
│   │   ├── context.tsx                # Locale context provider
│   │   ├── config.ts                  # i18n configuration
│   │   ├── use-locale.ts              # Locale hook
│   │   └── messages/
│   │       ├── ru.json                # Русский язык
│   │       └── en.json                # English language
│   ├── lib/
│   │   ├── db.ts                      # Prisma helpers (885 строк)
│   │   ├── utils.ts                   # Utility functions (cn)
│   │   ├── jsonld-model.ts            # JSON-LD data model + converters
│   │   ├── protocol-registry.ts       # 30+ протоколов OPA-S (1000+ строк)
│   │   ├── modbus-templates.ts        # 26 шаблонов устройств
│   │   ├── pipeline-templates.tsx     # 8 шаблонов пайплайнов
│   │   ├── north-app-templates.ts     # 13 шаблонов северных приложений
│   │   ├── use-persistent-state.ts    # Persistent state (localStorage)
│   │   ├── api-client.ts              # API client
│   │   ├── services/
│   │   │   ├── websocket.ts           # WebSocket service
│   │   │   ├── api.ts                 # API service
│   │   │   ├── notifications.ts       # Notifications service
│   │   │   └── storage.ts             # Storage service
│   │   └── utils/
│   │       ├── format.ts              # Форматирование (числа, даты)
│   │       ├── validation.ts          # Валидация
│   │       └── constants.ts           # Константы
│   └── types/
│       └── modbus.ts                  # Modbus TypeScript types
├── public/
│   ├── logo.svg                       # SVG логотип
│   └── robots.txt                     # SEO robots
├── package.json                       # Зависимости и скрипты
├── next.config.ts                     # Next.js конфигурация (standalone output)
├── tailwind.config.ts                 # Tailwind CSS конфигурация
├── tsconfig.json                      # TypeScript конфигурация
├── eslint.config.mjs                  # ESLint конфигурация
├── postcss.config.mjs                 # PostCSS конфигурация
├── components.json                    # shadcn/ui конфигурация
├── Caddyfile                          # Caddy reverse proxy
└── worklog.md                         # Журнал разработки
```

---

*Документация сгенерирована автоматически. Для обновлений см. `worklog.md`.*
