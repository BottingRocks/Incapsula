const generate = require(`@babel/generator`).default;
const t = require(`@babel/types`);
const traverse = require(`@babel/traverse`).default;

function reverseControlFlowCases(ast){

  traverse(ast, {

    WhileStatement(path){

      const test = path.get(`test`);
      const testCode = generate(test.node).code;

      if(testCode !== `!![]`){
        return;
      }

      const order = path.getPrevSibling().get(`declarations.0.init.callee.object.value`).node.split(`|`);
      const switchCases = path.get(`body.body.0.cases`).map((_p) => {const nodes = _p.node.consequent; nodes.pop(); return nodes;});
      const newNodes = [];

      order.forEach((currentIndex) => newNodes.push(...switchCases[currentIndex]));

      path.getPrevSibling().remove();
      path.replaceWithMultiple(newNodes);

    }
  });

}

module.exports = reverseControlFlowCases;
