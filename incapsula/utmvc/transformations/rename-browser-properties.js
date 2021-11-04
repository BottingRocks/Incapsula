const generate = require(`@babel/generator`).default;
const t = require(`@babel/types`);
const traverse = require(`@babel/traverse`).default;


function findBrowserProperty(path){

  const code = generate(path.node).code;

  if(code.endsWith(`this["window"];`)){
    return { varName : path.node.declarations[0].id.name, node : t.identifier(`window`) };
  }else if(code.endsWith(`["document"];`)){
    return { varName : path.node.declarations[0].id.name, node : t.identifier(`document`) };
  }else if(code.endsWith(`["encodeURIComponent"];`)){
    return { varName : path.node.declarations[0].id.name, node : t.identifier(`encodeURIComponent`) };
  }else if(code.endsWith(`["navigator"];`)){
    return { varName : path.node.declarations[0].id.name, node : t.identifier(`navigator`) };
  }else{
    return false;
  }

}

function renameBrowserProperties(ast){

  const browserProps = {};

  traverse(ast, {
    VariableDeclaration(path){

      const hasProp = findBrowserProperty(path);

      if(hasProp){
        browserProps[hasProp.varName] = hasProp.node;
        path.remove();
      }
    }
  });

  traverse(ast, {
    Identifier(path){
      const name = path.node.name;
      name in browserProps && path.replaceWith(browserProps[name]);

    }
  });

}

module.exports = renameBrowserProperties;
