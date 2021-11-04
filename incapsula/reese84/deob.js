const generate = require(`@babel/generator`).default;
const Reese84 = require(`./reese84.js`);
const { fromFile } = require(`../ast.js`);


const file = process.argv.slice(-1)[0];
let ast = fromFile(file);

Reese84.deobfuscate(ast);

console.log(generate(ast).code);
