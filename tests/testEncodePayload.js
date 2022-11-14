const Reese84 = require(`../incapsula/reese84/reese84.js`);
const fs = require(`fs`);
const { fromFile } = require(`../incapsula/ast.js`);


const file = process.argv.slice(-2)[0];
const payloadFile = require(process.argv.slice(-1)[0]);
const ast = fromFile(file);

Reese84.deobfuscate(ast);

const reese84 = new Reese84(ast);
const options = {
  error : null,
  oldToken : null,
  interrogation : 381,
  cr : 3929,
  version : `beta`,
};

const encodedPayload = reese84.createPayload(payloadFile, options);
console.log(`[${encodedPayload}]`);
process.exit(1)

