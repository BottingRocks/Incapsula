const Reese84 = require(`./reese84.js`);
const { fromFile } = require(`../ast.js`);

const reese84File = process.argv.slice(-2)[0];
const payloadUrl = process.argv.slice(-1)[0];

const ast = fromFile(reese84File);

Reese84.deobfuscate(ast);

const reese84 = new Reese84(ast);
console.log(reese84.createCollectorScript(payloadUrl));

