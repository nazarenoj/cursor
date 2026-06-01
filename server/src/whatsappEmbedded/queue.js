const { sendText, sendDocument } = require('./baileys');

const delayMs = parseInt(process.env.WA_DELAY_MS || '5000', 10);
const maxQueue = parseInt(process.env.WA_QUEUE_MAX || '500', 10);

const queue = [];
let running = false;

function getQueueLength() {
  return queue.length;
}

function processNext() {
  if (queue.length === 0) {
    running = false;
    return;
  }
  const item = queue.shift();
  const run = () => {
    if (item.type === 'text') {
      return sendText(item.phone, item.text);
    }
    if (item.type === 'document') {
      return sendDocument(item.phone, item.options);
    }
    return Promise.resolve();
  };
  run()
    .then(() => setTimeout(processNext, delayMs))
    .catch((err) => {
      console.error('Queue item error:', err.message);
      setTimeout(processNext, delayMs);
    });
}

function enqueue(task) {
  if (queue.length >= maxQueue) {
    throw new Error('Cola llena. Intenta mas tarde.');
  }
  const id = Date.now() + '-' + Math.random().toString(36).slice(2);
  queue.push({ id, ...task });
  if (!running) {
    running = true;
    processNext();
  }
  return { id };
}

module.exports = { enqueue, getQueueLength };
