const generate = require(`@babel/generator`).default;
const t = require(`@babel/types`);
const traverse = require(`@babel/traverse`).default;
const vm = require(`vm`);

const jsdom = require(`jsdom`);
const { JSDOM } = jsdom;

const dom = new JSDOM(``);
const window = dom.window;



function replaceSubstrStrings(ast){

  const sandbox = {
    "window" : window
  };
  const firstIIFECode = ast.program.body[0].expression.callee.body.body.map((n) => generate(n).code).join(``);

  vm.runInNewContext(firstIIFECode, sandbox);

  traverse(ast, {
    CallExpression(callPath){

      const callee = callPath.get(`callee`);
      const args = callPath.get(`arguments`);
      const calleeCode = generate(callee.node).code;

      if(calleeCode.endsWith(`substr`) && args.length === 2 && args[0].type === `NumericLiteral` && args[1].type === `NumericLiteral`){

        const callCode = generate(callPath.node).code;
        const rawValue = vm.runInNewContext(callCode, sandbox);

        callPath.replaceWith(t.stringLiteral(rawValue));

      }

    }

  });


}


module.exports = replaceSubstrStrings;
