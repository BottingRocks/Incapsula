const t = require(`@babel/types`);
const traverse = require(`@babel/traverse`).default;

function renameXorFunction(ast){
  let oldName = false;

  traverse(ast, {

    FunctionDeclaration(path){

      if(oldName){
        path.stop();
      }

      const name = path.get(`id`);

      path.traverse({
        BinaryExpression(binPath){

          const right = binPath.get(`right`);
          const operator = binPath.get(`operator`);

          if(operator.node === `>>` && right.type === `NumericLiteral` && right.node.value === 17){
            oldName = name.node.name;
            name.replaceWith(t.identifier(`xorShift128`));
          }
        }
      });

    }
  });

  return oldName;

}

function renameXorShift128(ast){

  const oldName = renameXorFunction(ast);
  const newNameId = t.identifier(`xorShift128`);

  traverse(ast, {
    CallExpression(callPath){

      const callee = callPath.get(`callee`);

      callee.type === `Identifier` && callee.node.name === oldName && callee.replaceWith(newNameId);

    }
  });

}

module.exports = renameXorShift128;
