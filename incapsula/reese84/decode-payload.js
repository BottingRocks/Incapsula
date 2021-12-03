const Reese84 = require(`./reese84.js`);
const { fromFile } = require(`../ast.js`);
const fs = require(`fs`);

const reese84File = process.argv.slice(-2)[0];
const payloadFile = process.argv.slice(-1)[0];

const ast = fromFile(reese84File);

Reese84.deobfuscate(ast);

const reese84 = new Reese84(ast);
const rawPayloadData = fs.readFileSync(payloadFile, {encoding : `UTF-8`}).toString();

const rawPayloads = JSON.parse(rawPayloadData);

rawPayloads.forEach((rawPayload) => {
  console.log(reese84.decodePayload(rawPayload.solution.interrogation.p, rawPayload.solution.interrogation.cr));
  console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
});




