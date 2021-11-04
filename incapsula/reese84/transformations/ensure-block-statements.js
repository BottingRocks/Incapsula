const t = require(`@babel/types`);
const traverse = require(`@babel/traverse`).default;

function ensureBlockStatements(ast){

  traverse(ast, {
    "IfStatement|ForStatement"(path){

      if(path.type === `IfStatement`){

        if(path.node.consequent.type !== `BlockStatement`){
          path.get(`consequent`).replaceWith(t.blockStatement([path.get(`consequent`).node]));
        }

        if(path.node.alternate !== null && path.node.alternate.type !== `BlockStatement`){
          path.get(`alternate`).replaceWith(t.blockStatement([path.get(`alternate`).node]));
        }

      }else{

        if(path.node.body.type !== `BlockStatement`){
          path.get(`body`).replaceWith(t.blockStatement([path.get(`body`).node]));
        }
      }
    }
  });
}

module.exports = ensureBlockStatements;
