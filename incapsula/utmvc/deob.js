
const generate = require(`@babel/generator`).default;
const Utmvc = require(`./utmvc.js`);
const { fromFile } = require(`../ast.js`);

const file = process.argv.slice(-1)[0];
let ast = fromFile(file);

Utmvc.deobfuscate(ast);

console.log(generate(ast).code);
