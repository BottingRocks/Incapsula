const traverse = require(`@babel/traverse`).default;

const { fromString } = require(`../../ast.js`);

function reverseEval(source){

  let evaluatedSource = ``;

  for (let i=0; i<source.length; i+=2 ){
    evaluatedSource += String.fromCharCode(parseInt(source.substring(i,i+2),16));
  }

  return evaluatedSource;
}


function decodeEval(ast){

  let newCode = null;
  traverse(ast, {

    Program(path){

      const hexCode = path.get(`body.0.expression.callee.body.body.1.declarations.0.init.value`).node;

      const evaluatedEval = reverseEval(hexCode);
      newCode = fromString(evaluatedEval);

      ast.program = newCode;

    }

  });

  return newCode;

}

module.exports = decodeEval;
