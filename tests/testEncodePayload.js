const Reese84 = require(`../incapsula/reese84/reese84.js`);
const fs = require(`fs`);
const DEFAULT_REESE84_PAYLOAD = require(`../incapsula/payloads/reese84.js`);
const { fromFile } = require(`../incapsula/ast.js`);


const file = process.argv.slice(-1)[0];
const ast = fromFile(file);

Reese84.deobfuscate(ast);

const reese84 = new Reese84(ast);
const options = {
  error : null,
  oldToken : null,
  interrogation : 1,
  cr : 99999,
  version : `stable`,

};
const encodedPayload = reese84.createPayload(DEFAULT_REESE84_PAYLOAD, options);
console.log(`[${JSON.stringify(encodedPayload)}]`)
