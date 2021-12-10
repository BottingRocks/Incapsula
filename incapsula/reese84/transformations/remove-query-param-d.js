const generate = require(`@babel/generator`).default;
const t = require(`@babel/types`);
const traverse = require(`@babel/traverse`).default;

function removeQueryParamD(ast){

  traverse(ast, {
    BinaryExpression(path){

      const left = path.get(`left`);
      const operator = path.get(`operator`).node;

      if(!(left.type === `StringLiteral` && left.node.value === `d=` && operator === `+`)){
        return;
      }

      const parent = path.getStatementParent();
      const payloadUrlId = parent.getSibling(parent.key + 1).get(`expression.right.arguments.0`).node;
      const returnPath = parent.getSibling(parent.key + 2);

      returnPath.get(`argument.elements.1.arguments.0`).replaceWith(payloadUrlId);

      parent.remove();
      parent.getSibling(parent.key + 1).remove();

    }

  });


}

module.exports = removeQueryParamD;
