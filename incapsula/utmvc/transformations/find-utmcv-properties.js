const btoa = require(`btoa`);
const generate = require(`@babel/generator`).default;
const t = require(`@babel/types`);
const template = require(`@babel/template`).default;
const traverse = require(`@babel/traverse`).default;
const vm = require(`vm`);


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
function renameFunctions(utmvcFuncPath){

  const bodyNodes = utmvcFuncPath.get(`body.body`);
  bodyNodes.forEach((_p, _pIndex) => {

    if(_pIndex === 0){
      //Rename the result variable/
      utmvcFuncPath.scope.rename(_p.get(`declarations.0.id.name`).node, `result`);
      return;
    };

    if(_pIndex === 1){
      //Rename the incapCookie
      _p.get(`declarations.0.init`).replaceWith(t.identifier(`incapCookie`));
      return;
    };

    if(_pIndex === 2){
      //Rename window.Array to Array;
      _p.get(`declarations.0.init.callee`).replaceWith(t.identifier(`Array`));
      return;
    };



    if(_p.type === `ForStatement` ){

      //Find the for that calls charCodeAtArray
      const bodyCode = generate(_p.get(`body`).node).code;
      if(bodyCode.match(/(.*?)\(utmvc \+(.*?)/)){
        _p.get(`body.body.0.expression.right.callee`).replaceWith(t.identifier(`charCodeAtArray`));
        return;
      }
    }

    if(_pIndex === bodyNodes.length - 1){
      //Replace the last variable with a Return statement returning the result
      _p.replaceWith(t.returnStatement(t.identifier(`result`)));
    }

  });

}

function removeTraps(utmvcFuncPath){

  utmvcFuncPath.get(`body.body`).forEach((_p) => {
    if(
      _p.type === `ExpressionStatement` && _p.get(`expression`).type === `CallExpression` &&
      _p.get(`expression.arguments`).length === 0 && _p.get(`expression.callee`).type === `Identifier`
    ){
      _p.remove();
    }
  });

}

function replaceParams(utmvcFuncPath){

  //Replace the first param
  const firstParam = utmvcFuncPath.get(`params`)[0].node.name;
  utmvcFuncPath.scope.rename(firstParam, `utmvc`);

  //Add the second param
  utmvcFuncPath.node.params.push(t.identifier(`incapCookie`));
}

function renameUtmvcFunc(utmvcFuncPath){
  utmvcFuncPath.get(`id`).replaceWith(t.identifier(`utmvcEncoder`));
}

function cleanUtmvcFuncPath(utmvcFuncPath){

  removeTraps(utmvcFuncPath);
  replaceParams(utmvcFuncPath);
  renameFunctions(utmvcFuncPath);
  renameUtmvcFunc(utmvcFuncPath);

}

function setUtmvcEncoderInSandbox(ast){

  const charCodeAtArray = (str) => {
    let sum = 0;

    for (let i = 0; i < str[`length`]; i++) {
      sum += str[`charCodeAt`](i);
    }

    return sum;
  };

  const utmvcFuncPath = findUtmvcSetFunctionPath(ast);
  cleanUtmvcFuncPath(utmvcFuncPath);

  const encoderFuncCode = generate(utmvcFuncPath.node).code;
  ast.sandbox[`btoa`] = btoa;
  ast.sandbox[`charCodeAtArray`] = charCodeAtArray;
  vm.runInNewContext(`${encoderFuncCode}`, ast.sandbox);

}

function setUtmvcUrls(ast){

  const urls = {};

  traverse(ast, {
    AssignmentExpression(path){

      const leftCode = generate(path.get(`left`).node).code;

      if(leftCode !== `document["createElement"]("img")["src"]`){
        return;
      }
      const query = path.get(`right.left.value`).node;

      if(query.endsWith(`1&e=`)){
        urls[`timestamp`] = query;
      }else if(query.endsWith(`=jse:`)){
        urls[`error`] = query;
      }

    }
  });

  ast.sandbox[`urls`] = urls;

}

function setUtmvcToStringUniqueValue(ast){

  let toStringUniqueValue = null;

  traverse(ast, {
    StringLiteral(path){

      const value = path.node.value;

      if(toStringUniqueValue !== null){
        return;
      }

      if(!value.endsWith(`'.toString()`)){
        return;
      }

      toStringUniqueValue = value.split(`'.toString()`)[0].slice(1);
    }
  });

  if(toStringUniqueValue === null){
    throw Error(`Could not find toStringUniqueValue`);
  }


  traverse(ast, {
    FunctionDeclaration(path){

      const name = path.node.id.name;

      if(name !== `utmvcEncoder`){
        return;
      }

      const firstParamName = path.get(`params`)[0].node.name;

      const pushToStringUniqueValue = template.ast(`${firstParamName} += "'${toStringUniqueValue}'.toString()" + "%3D" + "${toStringUniqueValue}";`);
      path.get(`body`).unshiftContainer(`body`, pushToStringUniqueValue);

      //v3dd4f0686443507a0a5eaa007e3fc06982918c30ae6abf3d0f379c35913e0b8b'.toString()

    }
  });

  return toStringUniqueValue;

}

function findUtmcvProperties(ast){

  [
    setUtmvcEncoderInSandbox,
    setUtmvcToStringUniqueValue,
    setUtmvcUrls,
  ].map((t) => t(ast));

}

module.exports = findUtmcvProperties;;
