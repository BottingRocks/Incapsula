const generate = require(`@babel/generator`).default;
const t = require(`@babel/types`);
const traverse = require(`@babel/traverse`).default;
const vm = require(`vm`);

function createSandbox(ast){

  const lines = ast.program.body.filter((n, i) => i > 0 && i < 4).map((n) => generate(n).code).join(`\n`);
  const context = {};

  vm.runInNewContext(lines, context);

  return context;
}


function clearConcealedStringsPayload(ast){

  const sandbox = createSandbox(ast);
  const concealerName = ast.program.body[3].declarations[0].id.name;

  traverse(ast, {

    CallExpression(path){

      const callee = path.get(`callee`);
      const args = path.get(`arguments`);

      if(!(
        callee.type === `Identifier` && callee.node.name === concealerName &&
        args.length === 1 && args[0].type === `StringLiteral` && args[0].node.value.startsWith(`0x`))
      ){
        return;
      }

      const evaluatedNode = t.stringLiteral(vm.runInNewContext(generate(path.node).code, sandbox));
      path.replaceWith(evaluatedNode);
    }

  });

}

module.exports = clearConcealedStringsPayload;
