const t = require(`@babel/types`);
const traverse = require(`@babel/traverse`).default;


function valueToNode(value){

  let node = null;

  if(Array.isArray(value)){
    node = t.arrayExpression(value.map((elem) => valueToNode(elem)));

  }else if(Number.isInteger(value)){
    node = t.numericLiteral(value);

  }else if(typeof value === `string`){
    node = t.stringLiteral(value);
  }else if (typeof value === `boolean`){
    node = t.booleanLiteral(value);
  }else{
    node = t.identifier(`undefined`);
  }

  return node;
}

function replaceObtuseBinaryExpressions(ast){

  traverse(ast, {
    BinaryExpression(path){

      const { confident, value } = path.evaluate();

      if(confident){
        path.replaceWith(valueToNode(value));
      }

    }
  });

}

module.exports = replaceObtuseBinaryExpressions;
