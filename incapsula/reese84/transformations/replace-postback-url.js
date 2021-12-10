const generate = require(`@babel/generator`).default;
const t = require(`@babel/types`);
const traverse = require(`@babel/traverse`).default;

function replacePostbackUrl(ast){

  traverse(ast, {
    ReturnStatement(path){

      const argument = path.get(`argument`);
      const code = generate(argument.node).code;

      if(!code.includes(`stripQuery`)){
        return;
      }

      argument.replaceWith(t.stringLiteral(ast.postbackUrl));

      path.parentPath.replaceWith(t.blockStatement([path.node]));

    }

  });


}

module.exports = replacePostbackUrl;
