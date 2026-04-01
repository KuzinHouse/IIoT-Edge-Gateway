# IoT Edge Gateway — Руководство по развёртыванию

> Версия: 0.2.0 | Дата: 2025-07  
> Статус: Production-ready (Beta)

---

## 1. Требования к системе

### Минимальные требования

| Ресурс | Минимум | Рекомендуется | Для Enterprise |
|--------|---------|---------------|----------------|
| **Runtime** | Bun 1.0+ / Node.js 20+ | Bun latest | Bun latest |
| **RAM** | 512 МБ | 2 ГБ | 4+ ГБ |
| **Disk** | 500 МБ | 2 ГБ | 10+ ГБ (history) |
| **CPU** | 1 ядро | 2 ядра | 4+ ядра |
| **OS** | Linux (amd64/arm64), macOS, Windows | Ubuntu 22.04 LTS, Debian 12 | RHEL 8/9, Ubuntu 22.04 LTS |

### Сетевые порты

| Порт | Сервис | Протокол | Описание |
|------|--------|----------|----------|
| **3000** | Next.js Dev Server | HTTP | Web Dashboard (development) |
| **3000** | Next.js Production | HTTP | Web Dashboard (production) |
| **443** | Caddy Reverse Proxy | HTTPS | SSL termination (production) |
| **8502** | Modbus TCP Simulator | TCP | Modbus тестовый сервер |
| **8503** | WebSocket Broker | WebSocket | Real-time data streaming |
| **8504** | MQTT Bridge | HTTP + MQTT | MQTT pub/sub simulation |
| **502** | Modbus TCP (внешние устройства) | TCP | Южные Modbus устройства |
| **4840** | OPC UA (внешние устройства) | TCP | Южные OPC UA серверы |
| **1883** | MQTT Broker (внешний) | TCP | Внешний MQTT брокер |
| **9092** | Kafka (внешний) | TCP | Внешний Kafka кластер |

### Зависимости

```
Bun runtime (рекомендуется) или Node.js 20+
SQLite3 (встроена в Bun)
Git (для клонирования репозитория)
```

---

## 2. Установка и запуск

### 2.1 Установка

```bash
# Клонировать репозиторий
git clone <repository-url>
cd my-project

# Установка зависимостей
bun install

# Инициализация базы данных
bun run db:push
bun run db:generate

# Проверка сборки
bun run build
```

### 2.2 Режим разработки

```bash
# Запуск dev-сервера (port 3000)
bun run dev

# Dev-сервер запускается с логированием:
# bun run dev → 2>&1 | tee dev.log
```

### 2.3 Production-режим

```bash
# Сборка production-билда (standalone output)
bun run build

# Запуск production-сервера
bun run start

# Production-сервер запускается с логированием:
# bun run start → 2>&1 | tee server.log
```

Next.js использует `output: "standalone"` — все зависимости собираются в `.next/standalone/`.

### 2.4 Запуск mini-сервисов

```bash
# Modbus TCP Simulator (port 8502)
cd mini-services/modbus-simulator
bun install && bun run index.ts

# WebSocket Broker (port 8503)
cd mini-services/ws-broker
bun install && bun run index.ts

# MQTT Bridge (port 8504)
cd mini-services/mqtt-bridge
bun install && bun run index.ts
```

### 2.5 Переменные окружения

Основные переменные окружения (`.env` файл в корне проекта):

```bash
# ─── Database ───────────────────────────────
DATABASE_URL="file:../db/custom.db"

# ─── Application ────────────────────────────
NEXT_PUBLIC_APP_NAME="IoT Edge Gateway"
NEXT_PUBLIC_APP_VERSION="0.2.0"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ─── Authentication ─────────────────────────
NEXTAUTH_SECRET="<random-32-char-string>"
NEXTAUTH_URL="http://localhost:3000"

# ─── JWT ────────────────────────────────────
JWT_SECRET="<random-64-char-string>"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"

# ─── Session ────────────────────────────────
SESSION_TIMEOUT_MINUTES=60
MAX_CONCURRENT_SESSIONS=5

# ─── MQTT Bridge ────────────────────────────
MQTT_BRIDGE_PORT=8504

# ─── WebSocket Broker ───────────────────────
WS_BROKER_PORT=8503

# ─── Modbus Simulator ───────────────────────
MODBUS_SIMULATOR_PORT=8502
MODBUS_SIMULATOR_HOST="0.0.0.0"

# ─── Logging ────────────────────────────────
LOG_LEVEL="info"           # debug | info | warn | error
LOG_FORMAT="json"           # json | text

# ─── CORS ───────────────────────────────────
CORS_ORIGINS="http://localhost:3000,http://localhost:3001"

# ─── IP Whitelist (опционально) ─────────────
# IP_WHITELIST="192.168.1.0/24,10.0.0.0/8"
```

---

## 3. Конфигурация

### 3.1 Файл `.env`

Создайте файл `.env` в корне проекта на основе шаблона выше. Минимальная конфигурация:

```bash
DATABASE_URL="file:../db/custom.db"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
JWT_SECRET="generate-with-openssl-rand-base64-64"
```

### 3.2 Настройка протоколов

Протоколы настраиваются через Web Dashboard → **Драйверы** (DriversView).

Каждый протокол имеет:

1. **Основные настройки (Соединение):** host, port, timeout, retries
2. **Настройки безопасности:** аутентификация, TLS, сертификаты
3. **Тайминги:** poll interval, session timeout, reconnect interval
4. **Дополнительно:** byte order, max concurrent requests, auto-reconnect

Для Modbus RTU/ASCII дополнительно настраиваются:
- Последовательный порт (`/dev/ttyUSB0`, `COM1`)
- Скорость (baud rate): 1200–921600 бод
- Биты данных: 7/8
- Стоп-биты: 1/2
- Чётность: None/Even/Odd/Mark/Space
- Управление потоком: None/RTS-CTS/XON-XOFF

### 3.3 Настройка пайплайнов

Пайплайны настраиваются через Web Dashboard → **Пайплайны** (PipelineView).

**Пошаговое создание:**

1. Нажмите «Создать пайплайн» или выберите из шаблона
2. Перетащите узлы из палитры (слева) на холст
3. Соедините узлы: перетащите от выхода (output) к входу (input)
4. Настройте каждый узел в правой панели
5. Сохраните и запустите

**Доступные узлы (13 типов):**

| Категория | Узлы |
|-----------|------|
| Данные | South Device Source, Tag Reader, Data Transform, Filter, Aggregator, Script |
| Вывод | MQTT Publish, HTTP Push, Kafka Producer, WebSocket |
| Служебные | Logger, Alarm Check, Delay |

---

## 4. Управление устройствами

### 4.1 Добавление устройств вручную

1. Перейдите в **Устройства** (South Devices)
2. Нажмите **«Добавить»** → **«Ручное создание»**
3. Заполните параметры:
   - **Общее:** имя, описание
   - **Подключение:** выбор протокола, host, port
   - **Последовательный порт** (для RTU/ASCII): порт, скорость, чётность
   - **Дополнительно:** timeout, retries, poll interval
4. Сохраните

### 4.2 Использование шаблонов

1. Нажмите **«Добавить»** → **«Из шаблона»**
2. Выберите категорию (ПЛК, Электроэнергетика, ОВК, Датчики, ЧП, I/O)
3. Выберите шаблон устройства (26 доступных)
4. Введите IP адрес и имя устройства
5. Шаблон автоматически создаст устройство с готовой картой регистров

**Доступные шаблоны:**

- **ПЛК:** Siemens S7-1200, Siemens S7-1500, WAGO 750-880, Beckhoff CX5020, Omron CJ2M
- **Электроэнергетика:** Schneider PM5110, ABB REF615, Elspec G4500, Eaton PowerXL DM1100
- **Частотные преобразователи:** ABB ACS580, Danfoss FC302, Delta C2000+
- **Датчики температуры:** Yokogawa UT150, Endress+Hauser TM401, Advantech ADAM-4019+
- **Давление:** Rosemount 3051C, Endress+Hauser Cerabar S, Yokogawa DY150
- **Расход:** Endress+Hauser Promag 10W, Krohne Optiflux 2000, Yokogawa AXF
- **I/O модули:** Advantech WISE-750, Moxa ioLogik E1212, WAGO 750-458
- **Шлюзы:** Moxa MGate 5105, Elsinco EL-MB-GW

### 4.3 Импорт/Экспорт

| Действие | Описание |
|----------|----------|
| **Экспорт** | «Экспорт» → JSON файл с таймстемпом (все устройства + теги) |
| **Импорт** | «Импорт» → загрузка JSON файла → все данные восстанавливаются |
| **Сброс** | «Сброс» → возврат к начальным mock-данным |

Данные хранятся в `localStorage` (клиентская сторона) и в SQLite (серверная сторона).

---

## 5. Пайплайны

### 5.1 Создание из шаблонов

Доступно **8 готовых шаблонов** пайплайнов:

| Шаблон | Описание | Сценарий |
|--------|----------|----------|
| Простой сквозной | South → MQTT | Быстрый старт |
| Масштабирование + MQTT | South → Scale → MQTT | Преобразование регистров (0–40000 → °C) |
| Обнаружение аварий | Tags → Alarm → Logger + MQTT | Мониторинг уставок |
| Агрегация + хранение | South → Aggregate → InfluxDB | Time-series storage |
| Конвертация протоколов | Modbus → Transform → OPC UA | Прозрачная конвертация |
| Фильтрация + облако | South → Filter → AWS IoT | Только качественные данные |
| Мульти-маршрутизация | South → MQTT + Kafka + WS | Fanout в несколько систем |
| Пакетная отправка | South → Delay → Aggregate → HTTP | Оптимизация трафика |

### 5.2 Настройка потоков данных

**Data Transform узел** поддерживает:

| Тип преобразования | Описание | Параметры |
|-------------------|----------|-----------|
| `scale` | Масштабирование | param1: коэффициент |
| `map` | Маппинг значений | param1: таблица маппинга |
| `type` | Приведение типа | param1: целевой тип |
| `offset` | Смещение | param1: значение смещения |
| `expression` | JavaScript выражение | param1: expression string |

**Filter узел:**

| Условие | Описание |
|---------|----------|
| `==` | Равно |
| `!=` | Не равно |
| `>` | Больше |
| `<` | Меньше |
| `>=` | Больше или равно |
| `<=` | Меньше или равно |
| `regex` | Регулярное выражение |
| `quality` | Фильтр по качеству (good/bad/uncertain) |

**Aggregator узел:**

| Функция | Описание |
|---------|----------|
| `avg` | Среднее за окно |
| `min` | Минимум за окно |
| `max` | Максимум за окно |
| `sum` | Сумма за окно |
| `count` | Количество значений |
| `first` | Первое значение |
| `last` | Последнее значение |

---

## 6. Северные приложения

### 6.1 Подключение MQTT брокеров

1. Перейдите в **Северные приложения** (North Apps)
2. Нажмите **«Добавить»** или выберите из шаблона
3. Выберите тип: **MQTT v5**
4. Настройте подключение:
   - **Broker:** адрес MQTT брокера
   - **Port:** 1883 (plain) или 8883 (TLS)
   - **Client ID:** уникальный идентификатор
   - **Username / Password:** credentials
   - **QoS:** 0 (at most once), 1 (at least once), 2 (exactly once)
   - **Keep Alive:** 10–600 секунд
   - **Clean Session:** true/false
   - **TLS/SSL:** включить для порта 8883
   - **Topic:** шаблон топика (`neuron/data/{device}/{tag}`)

**Готовые шаблоны MQTT:**
- Eclipse Projects (публичный, без авторизации)
- Blue Traktor (тестовый, blue-traktor.ru:1888)
- Sparkplug B (Ignition SCADA, Protobuf)

### 6.2 Настройка баз данных

#### InfluxDB

```
Host: influxdb.local
Port: 8086
Token: <InfluxDB API token>
Org: iot
Bucket: telemetry
Measurement: sensor_data
```

#### TimescaleDB

```
Host: tsdb.local
Port: 5432
Database: iot_data
Schema: public
Table: tag_values
User: iot_writer
Password: <password>
```

#### Elasticsearch

```
Host: elasticsearch.local
Port: 9200
Index: iot-data
Username: elastic
Password: <password>
```

#### OSIsoft PI System

```
Host: piserver.local
Port: 5450
Server Name: DefaultPI
Auth Mode: Windows / Anonymous / Password
PI Tag Prefix: IOT_
Data Mode: Insert / Replace / NoReplace
```

---

## 7. Пользователи и роли

### 7.1 RBAC система

Система поддерживает **7 predefined ролей** с 30+ разрешениями.

| Роль | Назначение | Типичные операции |
|------|-----------|-------------------|
| **Super Admin** | Полный контроль | Управление пользователями, лицензиями, настройками |
| **Admin** | Администрирование | Управление устройствами, пайплайнами, пользователями |
| **Engineer** | Конфигурация | Создание/изменение устройств, тегов, пайплайнов |
| **Operator** | Оперативная работа | Мониторинг, квитирование аварий, запуск/остановка |
| **Technician** | Диагностика | Чтение данных, тестирование соединений, диагностика |
| **Viewer** | Просмотр | Только чтение всех данных |
| **API Service** | Программный доступ | REST API по JWT токену |

### 7.2 Создание пользователей

1. Перейдите в **Настройки** → вкладка **Пользователи**
2. Нажмите **«Добавить пользователя»**
3. Заполните: email, имя, пароль, роль
4. Назначьте одну или несколько ролей
5. Настройте разрешения (автоматически по роли или вручную)

### 7.3 Назначение ролей

Роли назначаются при создании пользователя или редактировании существующего. Один пользователь может иметь несколько ролей. Права объединяются (union).

---

## 8. Лицензирование

### 8.1 Активация лицензии

1. Перейдите в **Настройки** → вкладка **Лицензия**
2. Введите лицензионный ключ
3. Нажмите **«Активировать»**
4. Система проверит ключ и примет лицензию

### 8.2 Управление подпиской

На странице лицензии отображается:

- **Информация о лицензии:** тип, владелец, организация, email
- **Ресурсы:** количество используемых устройств/тегов/подключений/пользователей
- **Прогресс-бары:** загрузка ресурсов относительно лимита
- **Срок действия:** дата покупки, активации, окончания

| Тип лицензии | Ограничения |
|-------------|-------------|
| **Free** | 2 устройства, 50 тегов, 1 пайплайн, 1 пользователь, только Modbus |
| **Standard** | 10 устройств, 1000 тегов, 10 пайплайнов, 5 пользователей, все stable протоколы |
| **Professional** | 50 устройств, 10000 тегов, 50 пайплайнов, 25 пользователей, beta протоколы |
| **Enterprise** | Безлимит, все протоколы, SSO, выделенный инженер поддержки |

---

## 9. Мониторинг и диагностика

### 9.1 Dashboard

Главный экран (**Дашборд**) отображает:

- **Статистика:** количество устройств, подключений, тегов, активных аварий
- **Здоровье системы:** статус (Норма/Внимание/Критично), uptime, CPU/RAM/Disk
- **Компоненты:** Database, Modbus Engine, MQTT Broker, Flow Engine
- **Последние аварии:** 5 последних с severity-кодированием
- **Последняя активность:** 7 последних событий
- **Статус подключений:** таблица южных/северных подключений с переключателями
- **Производительность:** tag poll rate, response time, network I/O
- **Live sparklines:** мини-графики значений ключевых тегов (через WebSocket)

### 9.2 Real-time мониторинг

**Мониторинг** (MonitoringView) — отдельный экран с WebSocket streaming:

- **Status Bar:** статус подключения, количество сообщений, последнее обновление
- **Системные метрики:** CPU и Memory SVG-кольцевые датчики, throughput sparkline, uptime
- **Live теги:** карточки с real-time значениями и sparklines (20 точек истории)
- **Alarm Ticker:** прокручиваемая панель аварийных событий
- **Статус соединений:** боковая панель со списком подключений

### 9.3 Диагностика соединений

**Диагностика** (DiagnosticsView) — 3 вкладки:

#### Modbus Тестер
- Чтение регистров (Holding/Input/Coil/Discrete) по адресу и количеству
- Запись регистров и coils
- Карта регистров в формате JSON
- Полный слепок данных
- Замер времени ответа (ms)

#### MQTT Тестер
- Публикация сообщений (topic, JSON payload, QoS, retained)
- Подписка на топики
- Обозреватель дерева топиков
- История сообщений

#### Система
- Здоровье всех 3 mini-сервисов
- Одновременный тест всех служб с временем отклика
- Детальная информация WS Broker и MQTT Bridge
- Журнал всех диагностических операций (50 последних)

### 9.4 Аудит журнал

**Настройки** → **Аудит журнал:**

- Все действия пользователей (создание, редактирование, удаление)
- Фильтрация по: действию, ресурсу, пользователю, статусу, дате
- Экспорт журнала в CSV/JSON
- Автоматическая очистка по политике хранения (7/30/90 дней / безлимит)

---

## 10. Резервное копирование

### 10.1 Экспорт/Импорт конфигурации

**Экспорт (полный бэкап):**

| Объект | Метод | Формат |
|--------|-------|--------|
| Устройства | «Экспорт» в SouthDevicesView | JSON |
| Северные приложения | «Экспорт» в NorthAppsView | JSON |
| Пайплайны | «Сохранить» в PipelineView | JSON (в памяти) |
| База данных SQLite | `cp db/custom.db backup.db` | SQLite binary |
| Настройки | Manual export | JSON |

**Импорт (восстановление):**

1. Перейдите в соответствующий раздел
2. Нажмите **«Импорт»**
3. Выберите JSON файл
4. Подтвердите замену данных

### 10.2 Восстановление базы данных

```bash
# Остановить приложение
# Скопировать резервную копию
cp backup/custom.db db/custom.db

# Перезапустить
bun run db:push
bun run start
```

### 10.3 Сброс к заводским настройкам

В каждом разделе доступна кнопка **«Сброс»**, которая:
- Очищает `localStorage`
- Восстанавливает начальные mock-данные
- Показывает toast-уведомление «Сохранено ✓»

---

## 11. API Reference

### 11.1 JSON-LD API

Получение и создание данных в стандартизированном JSON-LD формате.

```
GET /api/jsonld
POST /api/jsonld
```

**Ответ GET /api/jsonld:**
```json
{
  "tags": [
    {
      "@context": { "iot": "https://iot-schema.org/", ... },
      "@id": "tag:device-001:40001",
      "@type": "Tag",
      "name": "Датчик температуры 1",
      "value": 72.5,
      "quality": "good",
      "timestamp": "2025-07-10T14:30:00.000Z"
    }
  ],
  "devices": [...],
  "alarms": [...],
  "metrics": [...]
}
```

### 11.2 WebSocket API

**Endpoint:** `ws://gateway:8503`

**Протокол:**

```javascript
// Подключение
const ws = new WebSocket('ws://gateway:8503');

// Подписка
ws.send(JSON.stringify({
  action: 'subscribe',
  channels: ['tags', 'metrics', 'alarms', 'status']
}));

// Отписка
ws.send(JSON.stringify({
  action: 'unsubscribe',
  channels: ['alarms']
}));

// Системное сообщение (при подключении)
{
  "channel": "system",
  "type": "connected",
  "message": "WebSocket connection established",
  "timestamp": "2025-07-10T14:30:00.000Z"
}

// Данные тегов
{
  "channel": "tags",
  "data": [
    {
      "@id": "tag:temp-001",
      "@type": "Tag",
      "name": "Температура",
      "value": 72.5,
      "quality": "good",
      "timestamp": "..."
    }
  ]
}

// Системные метрики
{
  "channel": "metrics",
  "data": {
    "cpu": 45.2,
    "memory": 62.1,
    "disk": 34.5,
    "tagsPerSec": 85,
    "uptime": 86400
  }
}

// Аварийное событие
{
  "channel": "alarms",
  "data": {
    "name": "Температура высокая",
    "severity": "critical",
    "event": "triggered",
    "value": 125.3,
    "timestamp": "..."
  }
}

// Статус
{
  "channel": "status",
  "data": {
    "connections": [
      { "name": "Modbus TCP", "status": "connected" },
      { "name": "OPC UA", "status": "disconnected" }
    ]
  }
}
```

**Auto-reconnect:** exponential backoff от 1с до 30с.

**Simulation fallback:** при отключении >5с автоматически переключается на локальную симуляцию (badge «Симуляция» в статус-баре).

### 11.3 REST API

#### Устройства

```bash
# Список устройств
GET /api/devices
# Response: [{ id, name, status, protocol, host, port, tags, ... }]

# Создать устройство
POST /api/devices
Content-Type: application/json
{
  "name": "Siemens S7-1200",
  "protocol": "siemens-s7",
  "host": "192.168.1.50",
  "port": 102,
  "slaveId": 1,
  "pollInterval": 1000
}

# Получить устройство
GET /api/devices/:id

# Обновить
PUT /api/devices/:id

# Удалить
DELETE /api/devices/:id
```

#### Подключения

```bash
# Список
GET /api/connections

# Подключить
POST /api/connections/:name/connect

# Отключить
POST /api/connections/:name/disconnect
```

#### Теги

```bash
# Список тегов с последними значениями
GET /api/tags
# Response: [{ id, name, address, value, quality, unit, device, ... }]
```

#### Аварии

```bash
# Активные аварии
GET /api/alarms
# Response: [{ id, name, severity, state, tag, triggeredAt, ... }]

# Квитировать аварию
POST /api/alarms/:id/acknowledge
```

#### Пайплайны

```bash
# Список
GET /api/flows

# Создать
POST /api/flows
{
  "name": "Modbus → MQTT",
  "status": "running",
  "nodes": [...],
  "edges": [...]
}
```

#### Пользователи

```bash
# Список пользователей
GET /api/users

# Создать пользователя
POST /api/users
{
  "email": "operator@example.com",
  "name": "Иван Иванов",
  "roleId": "role-engineer-id",
  "isActive": true
}
```

#### Лицензия

```bash
# Информация о лицензии
GET /api/license
# Response: { type, owner, organization, isActive, maxDevices, maxTags, ... }
```

#### Dashboard

```bash
# Полная статистика дашборда
GET /api/dashboard
# Response: { stats, connections, topTags, recentAlarms, systemHealth }
```

---

## 12. Устранение неполадок

### Частые проблемы

| Проблема | Решение |
|----------|---------|
| Модули не найдены | `bun install` — переустановка зависимостей |
| Prisma ошибка | `bun run db:push && bun run db:generate` |
| Порт 3000 занят | `lsof -i :3000` → `kill <PID>` или изменить порт в `bun run dev -p 3001` |
| WebSocket не подключается | Проверить, что WS Broker запущен на порте 8503 |
| Modbus Simulator недоступен | Проверить, что сервис запущен: `curl http://localhost:8502/health` |
| Lint ошибки | `bun run lint` — просмотр ошибок, исправление в src/ |
| Dark/Light тема не применяется | Проверить `ThemeProvider` в `layout.tsx` |
| Мобильный вид не адаптируется | Проверить `use-mobile.ts` hook, Tailwind responsive классы |

### Логи

```bash
# Dev-сервер логи
tail -f dev.log

# Production логи
tail -f server.log

# Mini-service логи (запускаются в отдельных терминалах)
# Прямой вывод в stdout
```

### Проверка здоровья

```bash
# Проверить все mini-сервисы
curl http://localhost:8502/health  # Modbus Simulator
curl http://localhost:8503/health  # WebSocket Broker
curl http://localhost:8504/health  # MQTT Bridge

# Проверить API
curl http://localhost:3000/api/dashboard
curl http://localhost:3000/api/devices
curl http://localhost:3000/api/tags
```

---

*Документация сгенерирована автоматически. Для обновлений см. `worklog.md`.*
