import _assert from 'assert';
const assert = _assert.strict;
import zmq from 'zeromq';
import bgold from 'bgoldjs-lib';


// Currently it's on regtest
const regtest = bgold.networks.bitcoingoldregtest;

class Watcher {
  constructor(net = regtest) {
    this.firstBlock = true;
    this.height = 0;
    this.blocks = {};
    this.net = net;
    // TODO: this.oldest = 0;
    this.reorgFinishedDefer = new DeferredEvent(1000);  // defer 1000ms
  }

  onEvent(ev) {
    console.log('[onEvent]', ev);
  }

  onBlock(block) {
    if (this.firstBlock) {
      console.log('[onBlock] got first block at', block.height)
      this.firstBlock = false;
      this.height = block.height;
      this.blocks[block.height] = block;
      return;
    }
    // Append a block
    assert.equal(block.height, this.height + 1, 'Bad block height');
    let rollback = false;
    const origHeight = this.height;
    while (block.height != this.height + 1) {
      console.log('[onBlock] rolling back', this.height)
      delete this.blocks[this.height];
      this.height--;
      rollback = true;
    }
    assert.equal(
      block.prevHash.compare(this.blocks[this.height].getHash(this.net)), 0,
      'Block prevHash doesn\'t match');
    this.blocks[block.height] = block;
    this.height = block.height;

    if (rollback) {
      this.onEvent({
        name: 'ReorgStart',
        from: origHeight,
        to: block.height - 1,
      })
    }
    this.onEvent({
      name: 'Block',
      hash: 'hash'
    })
  }


}

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

  const w = new Watcher()

  while (true) {
    const [topic, data] = await sock.receive();
    const topicStr = topic.toString('utf8');
    console.log('[ZMQ]', topicStr, data.length);

    if (topicStr == 'rawblock') {
      const b = bgold.BlockGold.fromBuffer(data);
      // console.log('[ZMQ] block', b);
      w.onBlock(b);
    }
  }
}

run();
