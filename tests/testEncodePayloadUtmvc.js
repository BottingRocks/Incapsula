const Reese84 = require(`../incapsula/reese84/reese84.js`);
const fs = require(`fs`);
const { fromFile } = require(`../incapsula/ast.js`);
const Utmvc = require("../incapsula/utmvc/utmvc.js");


const file = process.argv.slice(-2)[0];
const payloadFile = require(process.argv.slice(-1)[0]);
const ast = fromFile(file);

Utmvc.deobfuscate(ast);

const reese84 = new Utmvc(ast);
const options = {
  error : null,
  oldToken : null,
  interrogation : 381,
  cr : 1,
  version : `stable`,
};

const encodedPayload = reese84.createPayload(payloadFile, options);
console.log(`[${encodedPayload}]`);
process.exit(1)

