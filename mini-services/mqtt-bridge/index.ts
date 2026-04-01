/**
 * MQTT Bridge Service
 * 
 * Simulates MQTT publish/subscribe operations.
 * Since we can't install the full MQTT client in the sandbox,
 * this service provides a REST API that simulates MQTT operations
 * and maintains a local message broker for testing.
 * 
 * Features:
 *   - Topic subscription management
 *   - Message publishing with QoS simulation
 *   - Message history and retention
 *   - Topic tree browser
 *   - Wildcard subscriptions (#, +)
 */

const PORT = 8504;

interface MqttMessage {
  id: string;
  topic: string;
  payload: any;
  qos: 0 | 1 | 2;
  retained: boolean;
  timestamp: string;
  publisherId?: string;
}

interface Subscription {
  clientId: string;
  topic: string;
  qos: 0 | 1 | 2;
  callback?: (msg: MqttMessage) => void;
}

// Message store (retained + history)
const retainedMessages = new Map<string, MqttMessage>();
const messageHistory: MqttMessage[] = [];
const MAX_HISTORY = 1000;

// Subscriptions
const subscriptions: Subscription[] = [];

// Simulated broker connection status
let brokerConnected = true;
let brokerUptime = 0;
let messagesIn = 0;
let messagesOut = 0;
let bytesIn = 0;
let bytesOut = 0;

// Topic tree for browsing
function getTopicTree(): any {
  const tree: any = {};

  // Add retained messages to tree
  retainedMessages.forEach((msg, topic) => {
    const parts = topic.split('/');
    let node = tree;
    parts.forEach((part, idx) => {
      if (!node[part]) node[part] = {};
      if (idx === parts.length - 1) {
        node[part]._message = { payload: msg.payload, timestamp: msg.timestamp, qos: msg.qos };
      } else {
        node = node[part];
      }
    });
  });

  // Add subscriptions to tree
  subscriptions.forEach(sub => {
    const parts = sub.topic.split('/');
    let node = tree;
    parts.forEach((part, idx) => {
      if (!node[part]) node[part] = {};
      if (idx === parts.length - 1) {
        if (!node[part]._subscriptions) node[part]._subscriptions = [];
        node[part]._subscriptions.push({ clientId: sub.clientId, qos: sub.qos });
      } else {
        node = node;
      }
    });
  });

  return tree;
}

function topicMatches(pattern: string, topic: string): boolean {
  const patternParts = pattern.split('/');
  const topicParts = topic.split('/');

  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i];
    const tp = topicParts[i] || '';

    if (pp === '#') return true;
    if (pp === '+') continue;
    if (pp !== tp) return false;
  }

  return patternParts.length === topicParts.length;
}

function publishMessage(topic: string, payload: any, qos: 0 | 1 | 2 = 0, retained: boolean = false, publisherId?: string): { delivered: number; messageId: string } {
  const msg: MqttMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    topic,
    payload,
    qos,
    retained,
    timestamp: new Date().toISOString(),
    publisherId,
  };

  // Store retained message
  if (retained) {
    retainedMessages.set(topic, msg);
  }

  // Add to history
  messageHistory.push(msg);
  if (messageHistory.length > MAX_HISTORY) {
    messageHistory.shift();
  }

  // Update stats
  messagesOut++;
  bytesOut += JSON.stringify(payload).length;

  // Deliver to matching subscriptions
  let delivered = 0;
  subscriptions.forEach(sub => {
    if (topicMatches(sub.topic, topic)) {
      delivered++;
      messagesIn++;
      bytesIn += JSON.stringify(payload).length;
      // In a real implementation, this would call the subscription callback
    }
  });

  console.log(`[MQTT] Published to "${topic}" (QoS ${qos}, retained: ${retained}) → ${delivered} subscribers`);

  return { delivered, messageId: msg.id };
}

// Pre-populate with some retained messages
function initializeData() {
  publishMessage('neuron/gateway/status', {
    status: 'online',
    version: '2.1.0',
    uptime: 864000,
    devices: 5,
    tags: 18,
    activeAlarms: 2,
  }, 1, true);

  publishMessage('neuron/devices/plc-1/status', {
    device: 'PLC-1',
    protocol: 'Modbus TCP',
    status: 'connected',
    host: '192.168.1.10:502',
    tags: 8,
    lastSeen: new Date().toISOString(),
  }, 1, true);

  publishMessage('neuron/devices/plc-2/status', {
    device: 'PLC-2',
    protocol: 'Modbus TCP',
    status: 'connected',
    host: '192.168.1.11:502',
    tags: 6,
    lastSeen: new Date().toISOString(),
  }, 1, true);

  publishMessage('neuron/tags/temperature/bearing', {
    name: 'Температура подшипника',
    value: 235.0,
    unit: '°C',
    quality: 'good',
    timestamp: new Date().toISOString(),
  }, 0, true);

  publishMessage('neuron/tags/pressure/line', {
    name: 'Давление линии',
    value: 42.0,
    unit: 'бар',
    quality: 'good',
    timestamp: new Date().toISOString(),
  }, 0, true);

  publishMessage('neuron/tags/flow/main', {
    name: 'Расходомер',
    value: 12.34,
    unit: 'м³/ч',
    quality: 'good',
    timestamp: new Date().toISOString(),
  }, 0, true);

  publishMessage('neuron/alarms/active', {
    count: 2,
    alarms: [
      { name: 'Высокая температура', severity: 'critical' },
      { name: 'Повышенная вибрация', severity: 'warning' },
    ],
  }, 1, true);

  // Add some subscriptions
  subscriptions.push({ clientId: 'dashboard', topic: 'neuron/#', qos: 1 });
  subscriptions.push({ clientId: 'cloud-bridge', topic: 'neuron/tags/#', qos: 0 });
  subscriptions.push({ clientId: 'alarm-service', topic: 'neuron/alarms/#', qos: 1 });

  console.log('[MQTT Bridge] Initialized with retained messages and subscriptions');
}

// Simulate periodic data publishing
function simulatePublish() {
  publishMessage('neuron/tags/temperature/bearing', {
    name: 'Температура подшипника',
    value: parseFloat((235 + (Math.random() - 0.5) * 4).toFixed(1)),
    unit: '°C',
    quality: 'good',
    timestamp: new Date().toISOString(),
  }, 0);

  publishMessage('neuron/tags/pressure/line', {
    name: 'Давление линии',
    value: parseFloat((42 + (Math.random() - 0.5) * 1).toFixed(1)),
    unit: 'бар',
    quality: 'good',
    timestamp: new Date().toISOString(),
  }, 0);

  publishMessage('neuron/tags/flow/main', {
    name: 'Расходомер',
    value: parseFloat((12.34 + (Math.random() - 0.5) * 0.6).toFixed(2)),
    unit: 'м³/ч',
    quality: 'good',
    timestamp: new Date().toISOString(),
  }, 0);
}

// REST API
const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // Health check
    if (path === '/api/health') {
      return new Response(JSON.stringify({
        status: brokerConnected ? 'running' : 'error',
        uptime: process.uptime(),
        port: PORT,
        messagesIn,
        messagesOut,
        bytesIn,
        bytesOut,
        retainedTopics: retainedMessages.size,
        activeSubscriptions: subscriptions.length,
        historySize: messageHistory.length,
        timestamp: new Date().toISOString(),
      }), { headers });
    }

    // Publish message
    if (path === '/api/publish' && req.method === 'POST') {
      return req.json().then((body: any) => {
        const { topic, payload, qos = 0, retained = false, clientId } = body;
        if (!topic || !payload) {
          return new Response(JSON.stringify({ error: 'topic and payload are required' }), { status: 400, headers });
        }
        const result = publishMessage(topic, payload, qos, retained, clientId);
        return new Response(JSON.stringify({
          success: true,
          ...result,
        }), { headers });
      });
    }

    // Subscribe
    if (path === '/api/subscribe' && req.method === 'POST') {
      return req.json().then((body: any) => {
        const { clientId, topic, qos = 0 } = body;
        if (!clientId || !topic) {
          return new Response(JSON.stringify({ error: 'clientId and topic are required' }), { status: 400, headers });
        }
        // Check if already subscribed
        const existing = subscriptions.find(s => s.clientId === clientId && s.topic === topic);
        if (existing) {
          existing.qos = qos;
          return new Response(JSON.stringify({ success: true, message: 'Subscription updated', subscription: existing }), { headers });
        }
        const sub: Subscription = { clientId, topic, qos };
        subscriptions.push(sub);
        console.log(`[MQTT] ${clientId} subscribed to "${topic}" (QoS ${qos})`);

        // Send retained messages for matching topics
        const retained: MqttMessage[] = [];
        retainedMessages.forEach((msg, t) => {
          if (topicMatches(topic, t)) retained.push(msg);
        });

        return new Response(JSON.stringify({
          success: true,
          subscription: sub,
          retainedMessages: retained,
        }), { headers });
      });
    }

    // Unsubscribe
    if (path === '/api/unsubscribe' && req.method === 'POST') {
      return req.json().then((body: any) => {
        const { clientId, topic } = body;
        const idx = subscriptions.findIndex(s => s.clientId === clientId && s.topic === topic);
        if (idx >= 0) {
          subscriptions.splice(idx, 1);
          return new Response(JSON.stringify({ success: true }), { headers });
        }
        return new Response(JSON.stringify({ error: 'Subscription not found' }), { status: 404, headers });
      });
    }

    // List subscriptions
    if (path === '/api/subscriptions' && req.method === 'GET') {
      const clientId = url.searchParams.get('clientId');
      const subs = clientId
        ? subscriptions.filter(s => s.clientId === clientId)
        : subscriptions;
      return new Response(JSON.stringify({ subscriptions: subs, total: subs.length }), { headers });
    }

    // Topic tree
    if (path === '/api/topics' && req.method === 'GET') {
      const tree = getTopicTree();
      const topics = Array.from(retainedMessages.keys());
      return new Response(JSON.stringify({ tree, topics, total: topics.length }), { headers });
    }

    // Message history
    if (path === '/api/messages' && req.method === 'GET') {
      const topic = url.searchParams.get('topic');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const since = url.searchParams.get('since');

      let filtered = messageHistory;
      if (topic) {
        filtered = filtered.filter(m => topicMatches(topic, m.topic));
      }
      if (since) {
        filtered = filtered.filter(m => m.timestamp >= since);
      }

      const total = filtered.length;
      const messages = filtered.slice(offset, offset + limit).reverse();

      return new Response(JSON.stringify({
        messages,
        total,
        limit,
        offset,
      }), { headers });
    }

    // Retained messages
    if (path === '/api/retained' && req.method === 'GET') {
      const topic = url.searchParams.get('topic');
      const msgs: MqttMessage[] = [];
      retainedMessages.forEach((msg, t) => {
        if (!topic || topicMatches(topic, t)) msgs.push(msg);
      });
      return new Response(JSON.stringify({ retained: msgs, total: msgs.length }), { headers });
    }

    // Clear retained
    if (path === '/api/retained' && req.method === 'DELETE') {
      retainedMessages.clear();
      return new Response(JSON.stringify({ success: true }), { headers });
    }

    // Broker stats
    if (path === '/api/stats' && req.method === 'GET') {
      return new Response(JSON.stringify({
        messagesIn,
        messagesOut,
        bytesIn,
        bytesOut,
        retainedTopics: retainedMessages.size,
        activeSubscriptions: subscriptions.length,
        historySize: messageHistory.length,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
  },
});

// Initialize
initializeData();

// Simulate data publishing every 3 seconds
setInterval(simulatePublish, 3000);

console.log(`[MQTT Bridge] Service running on port ${PORT}`);
console.log(`[MQTT Bridge] Endpoints:`);
console.log(`  GET  /api/health        - Health check & stats`);
console.log(`  POST /api/publish       - Publish message`);
console.log(`  POST /api/subscribe     - Subscribe to topic`);
console.log(`  POST /api/unsubscribe   - Unsubscribe`);
console.log(`  GET  /api/subscriptions - List subscriptions`);
console.log(`  GET  /api/topics        - Topic tree browser`);
console.log(`  GET  /api/messages      - Message history`);
console.log(`  GET  /api/retained      - Retained messages`);
console.log(`  DELETE /api/retained    - Clear retained`);
console.log(`  GET  /api/stats         - Detailed stats`);
console.log(`\n[MQTT Bridge] Auto-publishing simulated data every 3s`);
console.log(`[MQTT Bridge] Pre-loaded with UNS topic structure`);
