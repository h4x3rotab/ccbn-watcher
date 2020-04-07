import bgold from 'bgoldjs-lib';
// import axios from 'axios';

async function main() {
  const NETWORK = bgold.networks.testnet;
  
  // Derive public key, redeem script, pubkey script, and address from the private key
  const wif = 'cVyD9bn42AABThNnYux2kEytphGWwxAMKm8yvw6iwZwry7shxvZZ';
  const pair = bgold.ECPair.fromWIF(wif, NETWORK);
  const pubkey = pair.getPublicKeyBuffer();
  const redeemScript = bgold.script.witnessPubKeyHash.output.encode(bgold.crypto.hash160(pubkey));
  const scriptPubKey = bgold.script.scriptHash.output.encode(bgold.crypto.hash160(redeemScript));
  const address = bgold.address.fromOutputScript(scriptPubKey, NETWORK);
  console.log('Address', address);

  // Get a raw unspent transaction (maybe from explorer)
  const txIn = bgold.Transaction.fromHex('0200000001b2302c4cd3ce4cf04d4d649fe545563e4eb3304c924946fc861c707a2ff859fc010000006a47304402206964eb42aa8cc1326f914f0fab7e3400c4f487eca1e0c0d0168fce3d82f63899022025fd759b65042a2b37d5e7b2b3f495f2490261f6a8c86e4d1b941400f58174fa412102d78b4b324c91c2636f0fe0d0f23a076ac7e7970012ee1b3cd26569e21f29bd05feffffff02002d31010000000017a9144f7e34f953accc43c68f71581b8ef5e01eb9821e874aabc404000000001976a914b32c8434425c07f1118408c97c1b9f202085a8af88ac64230100');

  // Select txIn.output[0]
  const out = txIn.outs[0];
  const value = out.value;
  const vout = 0;
  const txid = txIn.getHash();

  // Prepare OP_RETURN data
  var data = Buffer.from('some data less than 80 bytes', 'utf8');
  const dataScript = bgold.script.nullData.output.encode(data);

  // Create a spending tx
  const txb = new bgold.TransactionBuilder(NETWORK);
  txb.addInput(txid, vout, bgold.Transaction.DEFAULT_SEQUENCE, scriptPubKey);
  txb.addOutput(address, value - 500);  // 500 sat fee
  txb.addOutput(dataScript, 0);
  txb.enableBitcoinGold(true)
  txb.setVersion(2)

  // Sign the tx
  const hashType = bgold.Transaction.SIGHASH_ALL | bgold.Transaction.SIGHASH_FORKID;
  txb.sign(0, pair, redeemScript, hashType, value);

  // Serialize as a hex string
  const tx = txb.build();
  const hex = tx.toHex();
  console.log(hex);
}

main();