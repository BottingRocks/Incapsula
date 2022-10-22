const generate = require(`@babel/generator`).default;
const t = require(`@babel/types`);
const traverse = require(`@babel/traverse`).default;

function findUtmvcSetFunctionPath(ast){

  let setPath = null;

  traverse(ast, {
    CallExpression(path){
      if(
        path.get(`arguments`).length === 3 && path.get(`arguments.0`).type === `StringLiteral` &&
        path.get(`arguments.0.value`).node === `___utmvc`
      ){

        setPath = path.getStatementParent().parentPath.parentPath;;
        path.stop();
        return;
      }
    }
  });

  return setPath;

}
function replaceStaticValues(ast){

  const utmvcFuncPath = findUtmvcSetFunctionPath(ast);

  const substrFiveValue = utmvcFuncPath.get("body.body").slice(-9)[0].node.declarations[0].init.value;
  utmvcFuncPath.get("body.body").slice(-3)[0].get("expression.right.arguments.0.left.left.left.left.arguments.1").replaceWith(
    t.stringLiteral(substrFiveValue.substr(0, 5))
  );
  utmvcFuncPath.get("body.body").slice(-3)[0].get("expression.right.arguments.0.left.left.left.left.arguments.0").replaceWith(
    t.numericLiteral(ast.stringArrays[0].stringArray.length)
  );

}

module.exports = replaceStaticValues;
