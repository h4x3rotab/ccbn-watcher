import _assert from 'assert';
const assert = _assert.strict;
import zmq from 'zeromq';
import bgold from 'bgoldjs-lib';

import DeferredEvent from './deferredevent.js';


// Currently it's on regtest
const regtest = bgold.networks.bitcoingoldregtest;

function revhex(hex) {
  let out = ''
  for (let i = 0; i < hex.length; i++) {
    out += hex.substring(hex.length - (i-1)*2, hex.length - i*2);
  }
  return out;
}
function blockHash(block) {
  return revhex(block.getHash().toString('hex'));
}

class Watcher {
  constructor(net = regtest) {
    this.firstBlock = true;
    this.height = 0;
    this.blocks = {};
    this.net = net;
    // TODO: this.oldest = 0;
    this.reorgFinishedDefer = new DeferredEvent(5000);  // defer 5s
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
      this.onEvent({
        name: 'Block',
        hash: blockHash(block)
      })
      return;
    }
    // Append a block
    let rollback = false;
    const origTip = this.blocks[this.height];
    while (block.height != this.height + 1) {
      console.log('[onBlock] rolling back', this.height)
      delete this.blocks[this.height];
      this.height--;
      rollback = true;
    }
    assert.equal(
      block.prevHash.compare(this.blocks[this.height].getHash(this.net)), 0,
      `Block prevHash doesn't match ` +
      `(last:${blockHash(this.blocks[this.height])} vs prev:${revhex(block.prevHash.toString('hex'))})`);
    this.blocks[block.height] = block;
    this.height = block.height;

    if (rollback) {
      this.onEvent({
        name: 'ReorgStart',
        from: { height: origTip.height, hash: blockHash(origTip) },
        to: { height: block.height - 1, hash: blockHash(this.blocks[block.height - 1]) }
      })
      this.reorgFinishedDefer.trigger(() => {
        this.onEvent({
          name: 'ReorgEnd'
        })
      });
    }
    this.onEvent({
      name: 'Block',
      hash: blockHash(block)
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
    // console.log('[ZMQ]', topicStr, data.length);

    if (topicStr == 'rawblock') {
      const b = bgold.BlockGold.fromBuffer(data);
      // console.log('[ZMQ] block', b);
      w.onBlock(b);
    }
  }
}

run();
