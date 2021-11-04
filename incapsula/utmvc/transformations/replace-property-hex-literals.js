const t = require(`@babel/types`);
const traverse = require(`@babel/traverse`).default;

function ReplacePropertyHexLiterals(ast){

  traverse(ast, {

    StringLiteral(path){


      if(path.node.extra !== undefined && path.node.extra.rawValue !== path.node.extra.raw){
        path.replaceWith(t.stringLiteral(path.node.extra.rawValue));
      }
    }

  });

}

module.exports = ReplacePropertyHexLiterals;
