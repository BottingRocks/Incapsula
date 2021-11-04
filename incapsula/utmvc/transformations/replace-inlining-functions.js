const generate = require(`@babel/generator`).default;
const traverse = require(`@babel/traverse`).default;

const { fromString } = require(`../../ast.js`);

function isInlineFunction(path, tableKeys){
  if(!(
    path.type === `CallExpression` && path.get(`callee`).type === `MemberExpression` &&
    path.get(`callee.object`).type === `Identifier` && tableKeys.includes(path.get(`callee.object.name`).node))
  ){
    return false;
  }

  return true;
}

function getInliningTables(ast){

  const tables = {};

  traverse(ast, {
    VariableDeclarator(path){

      const id = path.get(`id`);
      const init = path.get(`init`);

      if(!(init.type === `ObjectExpression` && !init.get(`properties`).some((prop) => !(prop.node.key.type === `StringLiteral` && prop.node.key.value.length === 3)))){
        return;
      }

      tables[id.node.name] = {};

      init.get(`properties`).forEach((propPath) => {

        const name = propPath.node.key.value;
        tables[id.node.name][name] = generate(propPath.node.value).code;

      });

      path.parentPath.remove();
    }

  });

  return tables;
}

function replaceInlineFunction(inlineFunc, tables){

  const getProps = (node) => {
    return {
      tableIndex : node.callee.object.name,
      tableProp : node.callee.property.value,
      args : node.arguments
    };
  };

  const hasSubKey = (ast, tableKeys) => {

    let found = false;
    let subKey = undefined;
    traverse(ast, {
      CallExpression(path){
        if(isInlineFunction(path, tableKeys)){
          found = true;
          subKey = path;
        }
      }
    });

    return { found, subKey };
  };

  const props = getProps(inlineFunc);

  const ast = fromString(tables[props.tableIndex][props.tableProp]);
  const tableKeys = Object.keys(tables);
  const { found : foundSubKey, subKey } = hasSubKey(ast, tableKeys);

  if(foundSubKey){
    const newSubKey = replaceInlineFunction(subKey.node, tables);
    subKey.replaceWith(newSubKey);
  }

  const paramsMatch = {};

  ast.program.body[0].params.forEach((param, paramIndex) => paramsMatch[param.name] = props.args[paramIndex]);

  traverse(ast, {
    FunctionDeclaration(path){

      path.get(`body`).traverse({

        Identifier(idPath){
          const name = idPath.node.name;
          if(name in paramsMatch){
            idPath.replaceWith(paramsMatch[name]);
          }
        }
      });
    }
  });

  return ast.program.body[0].body.body[0].argument;

}

function replaceInliningFunctions(ast){

  const tables = getInliningTables(ast);
  const tableKeys = Object.keys(tables);

  traverse(ast, {

    CallExpression(path){

      if(!isInlineFunction(path, tableKeys)){
        return;
      }

      const newNode = replaceInlineFunction(path.node, tables);

      path.replaceWith(newNode);

    }
  });

}

module.exports = replaceInliningFunctions;
