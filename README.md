# IIoT Edge Gateway

<p align="center">
  <strong>Industrial IoT Edge Gateway</strong><br>
  EMQX Neuron-level data acquisition, protocol conversion and edge computing platform
</p>

<p align="center">
  <img src="docs/screenshots/01-dashboard.png" alt="Dashboard" width="800">
</p>

---

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Protocols](https://img.shields.io/badge/Protocols-30%2B-orange)](#protocol-support)
[![Templates](https://img.shields.io/badge/Device_Templates-90%2B-green)](#device-templates)

---

## Overview

IIoT Edge Gateway is a comprehensive industrial IoT edge computing platform designed for data acquisition, protocol conversion, and real-time data processing. Built with modern web technologies, it provides an intuitive web-based HMI/SCADA interface for managing southbound devices (PLCs, sensors, actuators) and northbound applications (cloud connectors, historians, message brokers).

The platform follows the **EMQX Neuron architecture** and implements the **OPA-S (Open Platform Architecture - South)** specification for protocol driver management.

## Features

### Protocol Support (30+ Drivers)

| Category | Protocols |
|----------|-----------|
| **Serial** | Modbus TCP, Modbus RTU, Modbus ASCII, HART, HART-IP |
| **Industrial PLCs** | Siemens S7, Allen-Bradley (EtherNet/IP), Omron FINS, Mitsubishi MELSEC |
| **Process Automation** | OPC UA, IEC 60870-5-104, DNP3, IEC 61850 |
| **Building Automation** | BACnet/IP, KNX |
| **Network** | SNMP v1/v2c/v3 |
| **Cloud / Northbound** | MQTT v5, Apache Kafka, HTTP REST, WebSocket, AWS IoT Core, Azure IoT Hub |

<p align="center">
  <img src="docs/screenshots/09-drivers.png" alt="OPA-S Protocol Drivers" width="800">
</p>

### South Device Management

- **90+ Device Templates** across 12 categories (PLCs, VFDs, sensors, I/O modules, power meters, gateways)
- **Template-based device creation** — select a manufacturer/model and auto-generate register maps
- **Real-time tag monitoring** with quality indicators (Good/Bad/Uncertain) and sparkline history
- **Import/Export** device configurations as JSON
- **Serial & TCP** connection support with configurable timeouts, retries, byte order

<p align="center">
  <img src="docs/screenshots/02-south-devices.png" alt="South Devices" width="800">
</p>

### Data Tags

- **Full tag lifecycle management** — create, configure, monitor, write values
- **Data types**: BOOL, INT16, UINT16, INT32, UINT32, FLOAT32, STRING
- **Register types**: Holding Register, Input Register, Coil, Discrete Input
- **Alarm configuration** per tag with thresholds, deadband, and delay
- **Real-time value simulation** with quality tracking and trend indicators

<p align="center">
  <img src="docs/screenshots/04-tags.png" alt="Data Tags" width="800">
</p>

### Pipeline Processing

- **Visual node-based pipeline editor** with drag-and-drop
- **13 node types**: South Device Source, Tag Reader, Data Transform, Filter, Aggregator, Script, MQTT Publish, HTTP Push, Kafka Producer, WebSocket, Logger, Alarm Check, Delay
- **8 pipeline templates** for common data flow patterns
- **SVG animated connections** with directional arrows and glow effects
- **Test run simulation** with sequential processing log

<p align="center">
  <img src="docs/screenshots/05-pipeline.png" alt="Pipeline Editor" width="800">
</p>

### Northbound Applications (13 Templates)

- **MQTT** — Eclipse Mosquitto, EMQX, HiveMQ (including blue-traktor.ru:1888)
- **Historians** — InfluxDB, TimescaleDB, OSIsoft PI System
- **Streaming** — Apache Kafka, AWS Kinesis
- **Cloud** — AWS IoT Core, Azure IoT Hub, Google Cloud IoT
- **Integration** — HTTP REST Push, WebSocket Stream
- **Enterprise** — SAP, OPC UA Server

<p align="center">
  <img src="docs/screenshots/03-north-apps.png" alt="North Applications" width="800">
</p>

### Real-Time Monitoring

- **WebSocket streaming** for live tag values and system metrics
- **SVG circular gauges** for CPU, Memory, Network utilization
- **Sparkline charts** per tag (last 20 data points)
- **Alarm ticker** with severity color coding (Critical/Warning/Info)
- **Connection status panel** with live health indicators
- **Fallback simulation** when WebSocket is unavailable

<p align="center">
  <img src="docs/screenshots/07-monitoring.png" alt="Real-Time Monitoring" width="800">
</p>

### Diagnostics

- **Modbus TCP Tester** — read/write registers and coils, register map browser
- **MQTT Tester** — publish/subscribe, topic tree browser, message history
- **System Health** — simultaneous health checks for all mini-services with response times
- **Action history log** with request/response timing

<p align="center">
  <img src="docs/screenshots/08-diagnostics.png" alt="Diagnostics" width="800">
</p>

### OPC UA Client

- **Connection management** with security modes (None/Sign/SignAndEncrypt)
- **Information model browser** — hierarchical tree with standard OPC UA node structure
- **Node detail panel** — references, value display, alarm thresholds, history sparkline
- **Subscriptions** — create/manage subscriptions with monitored items
- **Namespace support** — ns0 (OPC UA), ns1 (Application), ns2 (Machine), ns3 (Security)

<p align="center">
  <img src="docs/screenshots/10-opcua.png" alt="OPC UA Client" width="800">
</p>

### Alarm Management

- **Active alarms** with severity levels (Critical, Warning, Info) and acknowledge workflow
- **Alarm rules** — configurable thresholds, conditions, deadband, delay
- **Alarm history** — full event log with trigger, acknowledge, and clear timestamps

<p align="center">
  <img src="docs/screenshots/06-alarms.png" alt="Alarm Management" width="800">
</p>

### Industrial RBAC (Role-Based Access Control)

- **7 hierarchical roles** (L1 Operator → L7 Super Admin)
- **37 fine-grained permissions** across 12 categories
- **Visual permission matrix** for easy role management
- **User management** with role assignment, status control, activity tracking

### 4-Tier Licensing

| Tier | Devices | Tags | Protocols | Features |
|------|---------|------|-----------|----------|
| **Free** | 5 | 50 | Modbus, MQTT | Basic monitoring |
| **Standard** | 25 | 500 | + OPC UA, BACnet | Alarms, pipelines, REST API |
| **Professional** | 100 | 5000 | + Siemens, AB, SNMP | OPC UA server, scripting, HA |
| **Enterprise** | Unlimited | Unlimited | All | PI System, SSO, audit, priority support |

<p align="center">
  <img src="docs/screenshots/12-settings-license.png" alt="License Management" width="800">
</p>

### Security

- **Password policy** — minimum length, complexity requirements
- **IP whitelist** — restrict access by IP ranges
- **2FA support** (configuration available)
- **API key management** — generate, rotate, revoke
- **Audit logging** — full action log with timestamps and user tracking
- **Security policy** — [SECURITY.md](SECURITY.md)

<p align="center">
  <img src="docs/screenshots/11-settings.png" alt="Settings" width="800">
</p>

### Dark Mode

<p align="center">
  <img src="docs/screenshots/13-dashboard-dark.png" alt="Dark Mode" width="800">
</p>

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Web HMI (Next.js 16)                  │
│  Dashboard │ Devices │ Tags │ Pipelines │ Monitoring     │
│  Alarms │ Diagnostics │ Drivers │ OPC UA │ Settings      │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API / WebSocket
┌──────────────────────┴──────────────────────────────────┐
│                   Edge Gateway Core                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐  │
│  │ Modbus   │ │ OPC UA  │ │ BACnet  │ │  Pipeline    │  │
│  │ Engine   │ │ Client  │ │ Stack   │ │  Engine      │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └──────┬───────┘  │
│       │           │           │               │          │
│  ┌────┴───────────┴───────────┴───────────────┴───────┐ │
│  │              Tag Processing Engine                   │ │
│  │         JSON-LD Flat Data Model (OPA-S)             │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         │                                │
│  ┌──────────────────────┴──────────────────────────────┐ │
│  │           Northbound Connectors                     │ │
│  │  MQTT │ Kafka │ HTTP │ PI System │ AWS │ Azure     │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
         │              │              │
    ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
    │  PLCs   │   │ Sensors │   │ Cloud   │
    │  RTUs   │   │ Actuators│  │ SCADA   │
    └─────────┘   └─────────┘   └─────────┘
```

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Next.js 16** | React framework (App Router, Turbopack) |
| **TypeScript 5** | Type-safe development |
| **Tailwind CSS 4** | Utility-first styling |
| **shadcn/ui** | Component library |
| **Recharts** | Data visualization |
| **Lucide Icons** | Icon system |
| **Prisma ORM** | Database layer |
| **SQLite** | Embedded database |
| **WebSocket** | Real-time communication |
| **Zustand** | Client state management |
| **TanStack Query** | Server state management |

## Mini-Services

The gateway includes 3 independent microservices for development and testing:

| Service | Port | Description |
|---------|------|-------------|
| **Modbus TCP Simulator** | 8502 | Full Modbus TCP server with 10,000 registers, coils, discrete inputs. REST API for read/write operations. Industrial value simulation. |
| **WebSocket Broker** | 8503 | Real-time data streaming with 18 simulated tags. Channels: tags, metrics, alarms, status. |
| **MQTT Bridge** | 8504 | MQTT pub/sub simulation with topic tree, retained messages, subscriptions, message history. |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+) or Node.js 18+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/KuzinHouse/IIoT-Edge-Gateway.git
cd IIoT-Edge-Gateway

# Install dependencies
bun install

# Initialize database
bun run db:push

# Start the application
bun run dev
```

### Mini-Services (optional)

```bash
# Start all mini-services
cd mini-services/modbus-simulator && bun run dev &
cd mini-services/ws-broker && bun run dev &
cd mini-services/mqtt-bridge && bun run dev &
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
IIoT-Edge-Gateway/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Main application shell
│   │   ├── layout.tsx         # Root layout with theme provider
│   │   ├── globals.css        # Global styles
│   │   └── api/               # REST API routes
│   │       ├── alarms/        # Alarm management API
│   │       ├── connections/   # Connection management API
│   │       ├── dashboard/     # Dashboard statistics API
│   │       ├── devices/       # Device CRUD API
│   │       ├── drivers/       # Protocol drivers API
│   │       ├── flows/         # Pipeline flows API
│   │       ├── jsonld/        # JSON-LD data model API
│   │       ├── license/       # License management API
│   │       ├── north-apps/    # Northbound apps API
│   │       ├── tags/          # Data tags API
│   │       └── users/         # User management API
│   ├── components/
│   │   ├── views/             # Main application views (10)
│   │   │   ├── DashboardView.tsx
│   │   │   ├── SouthDevicesView.tsx
│   │   │   ├── NorthAppsView.tsx
│   │   │   ├── TagsView.tsx
│   │   │   ├── PipelineView.tsx
│   │   │   ├── AlarmsView.tsx
│   │   │   ├── MonitoringView.tsx
│   │   │   ├── DiagnosticsView.tsx
│   │   │   ├── DriversView.tsx
│   │   │   ├── OPCUAView.tsx
│   │   │   └── SettingsView.tsx
│   │   ├── flows/             # Pipeline flow components
│   │   ├── tags/              # Tag display components
│   │   ├── ui/                # shadcn/ui components (50+)
│   │   └── CommandPalette.tsx # Ctrl+K command palette
│   ├── hooks/                 # Custom React hooks
│   ├── i18n/                  # Internationalization (EN/RU)
│   ├── lib/
│   │   ├── modbus-templates.ts    # 90+ device templates (4378 lines)
│   │   ├── protocol-registry.ts   # 30+ protocol definitions
│   │   ├── pipeline-templates.tsx # 8 pipeline templates
│   │   ├── north-app-templates.ts # 13 northbound app templates
│   │   ├── jsonld-model.ts        # JSON-LD flat data model
│   │   └── ...                    # Utilities, services, DB client
│   └── types/                 # TypeScript type definitions
├── mini-services/             # Independent microservices
│   ├── modbus-simulator/      # Modbus TCP Simulator (port 8502)
│   ├── ws-broker/             # WebSocket Broker (port 8503)
│   └── mqtt-bridge/           # MQTT Bridge (port 8504)
├── prisma/
│   └── schema.prisma          # Database schema
├── docs/
│   └── screenshots/           # Project screenshots
├── ARCHITECTURE.md            # Architecture documentation (950 lines)
├── DEPLOYMENT.md              # Deployment guide (810 lines)
├── SECURITY.md                # Security policy
├── LICENSE                    # MIT License
└── README.md                  # This file
```

## Data Model

All internal data flows through a **JSON-LD flat data model** compliant with the OPA-S specification:

```json
{
  "@context": "https://iiot-gateway.org/context/v1",
  "@type": "Tag",
  "@id": "tag:temp-reactor-01",
  "name": "Температура реактора",
  "address": "40001",
  "dataType": "FLOAT32",
  "unit": "°C",
  "value": 245.7,
  "quality": "GOOD",
  "timestamp": "2025-01-15T10:30:00Z",
  "device": "device:plc-siemens-01"
}
```

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

If you find this project useful, please consider supporting its development:

- **GitHub Sponsors**: [Sponsor this project](https://github.com/sponsors/KuzinHouse)
- **Boosty**: [boosty.to/iiot-edge-gateway](https://boosty.to/iiot-edge-gateway)

---

<p align="center">
  Built with ❤️ for the Industrial IoT community
</p>
