const zmq = require('zeromq');
const bgold = require('bgoldjs-lib')

async function run() {
  const sock = new zmq.Subscriber;
  const topics = [
    "hashblock",
    "rawblock",
    //"hashtx",
    //"rawtx"
  ];

  sock.connect('tcp://127.0.0.1:1919');
  topics.forEach(t => sock.subscribe(t));

  while (true) {
    const [topic, data] = await sock.receive();
    const topicStr = topic.toString('utf8');
    console.log('[ZMQ]', topicStr, data.length);

    if (topicStr == 'rawblock') {
      const b = bgold.BlockGold.fromBuffer(data);
      console.log('[ZMQ] block', b);
    }
  }
}

run();