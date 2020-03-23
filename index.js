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
    this.blocks = {};
    this.chain = {};
    this.tipHash = null;
    this.height = 0;
    this.net = net;
    // TODO: this.oldest = 0;
    this.reorgFinishedDefer = new DeferredEvent(3000);  // defer 3s
  }

  isActive(block) {
    return this.chain[block.height] == block;
  }

  onEvent(ev) {
    console.log('[onEvent]', ev);
  }

  onBlock(block) {
    if (this.firstBlock) {
      console.log('[onBlock] got first block at', block.height)
      this.firstBlock = false;
      const h = blockHash(block);
      this.blocks[h] = block;
      this.chain[block.height] = block;
      this.tipHash = h;
      this.height = block.height;
      this.onEvent({
        name: 'Block',
        hash: h
      })
      return;
    }
    const h = blockHash(block);
    const prevh = revhex(block.prevHash.toString('hex'));
    const origTip = this.blocks[this.tipHash];
    // Check prev
    assert.equal(prevh in this.blocks, true, `Prev block ${prevh} not found`);
    // Add to block db
    this.blocks[h] = block;
    let reorg = false;
    let precedent = this.blocks[prevh];
    const toActivate = [block];
    // Find the first activated precedent
    while (!this.isActive(precedent)) {
      toActivate.push(precedent)
      const curPrevh = revhex(precedent.prevHash.toString('hex'));
      precedent = this.blocks[curPrevh];
    }
    // Rollback to precedent if necessary
    while (this.height != precedent.height) {
      console.log('[onBlock] rolling back', this.height)
      delete this.chain[this.height];
      this.height--;
      reorg = true;
    }
    // Reorg events
    if (reorg) {
      this.onEvent({
        name: 'ReorgStart',
        from: { height: origTip.height, hash: this.tipHash },
        to: { height: precedent.height, hash: blockHash(precedent) }
      })
      this.reorgFinishedDefer.trigger(() => {
        this.onEvent({
          name: 'ReorgEnd',
          to: { height: this.tip.height, hash: this.tipHash }
        })
      });      
    }
    // Activate the best chain in block order
    for (let i = toActivate.length - 1; i >= 0; i--) {
      const curBlock = toActivate[i];
      this.chain[curBlock.height] = curBlock;
      this.height = curBlock.height;
      this.tip = curBlock;
      this.onEvent({
        name: 'Block',
        hash: blockHash(curBlock)
      })
    }
  }

}

async function run() {
  const sock = new zmq.Subscriber;
  const topics = [
    "hashblock",
    "rawblock"
  ];

  sock.connect('tcp://127.0.0.1:1919');
  topics.forEach(t => sock.subscribe(t));

  const w = new Watcher()

  while (true) {
    const [topic, data] = await sock.receive();
    const topicStr = topic.toString('utf8');

    if (topicStr == 'rawblock') {
      const b = bgold.BlockGold.fromBuffer(data);
      w.onBlock(b);
    }
  }
}

run();
