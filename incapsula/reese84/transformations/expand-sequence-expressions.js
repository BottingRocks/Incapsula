const t = require(`@babel/types`);
const traverse = require(`@babel/traverse`).default;

function expandSequenceExpressions(ast){

  traverse(ast, {
    "ForStatement|ForInStatement"(path){

      if(path.type === `ForStatement`){

        const init = path.get(`init`);

        if(init.type === `VariableDeclaration`){
          path.insertBefore(init.node);
        }else if(init !== undefined && init.node !== null){
          path.insertBefore(t.expressionStatement(init.node));
        }

        init.node = null;
      }

      const body = path.get(`body`);

      if(body.type !== `BlockStatement`){
        body.replaceWith(t.blockStatement([body.node]));
      }

    },

    VariableDeclaration(path){

      const declarations = path.get(`declarations`);

      if(declarations.length > 1){
        path.replaceWithMultiple(declarations.map((d) => t.variableDeclaration(`var`, [t.variableDeclarator(d.node.id, d.node.init)])));
      }

    }

  });

  traverse(ast, {

    SequenceExpression(path){

      const statementParent = path.getStatementParent();

      if(path.parentPath.type === `ReturnStatement`){

        const expressions = path.parentPath.get(`argument.expressions`);
        const leftOverNode = expressions.pop();

        path.parentPath.replaceWithMultiple([
          ...expressions.map((p) => t.expressionStatement(p.node)),
          t.returnStatement(leftOverNode.node),
        ]);

        return;

      }else if(path.parentPath.type === `SwitchStatement` && path.key === `discriminant`){

        const discriminant = path.parentPath.get(`discriminant`);
        const expressions = discriminant.get(`expressions`);
        const leftOverExp = expressions.pop();

        expressions.forEach((p) => path.parentPath.insertBefore(t.expressionStatement(p.node)));

        discriminant.replaceWith(leftOverExp.node);

        return;
      }

      switch(statementParent.type){

        case `IfStatement`:

          const test = statementParent.get(`test`);

          if(test.type === `UnaryExpression` && test.get(`operator`).node === `!` && test.get(`argument`).type === `SequenceExpression`){

            const expressions = test.get(`argument.expressions`);
            const leftOverExp = expressions.pop();

            test.replaceWith(t.unaryExpression(`!`, leftOverExp.node));

            expressions.forEach((p) => statementParent.insertBefore(p.node));

            return;

          }

        case `ForStatement`:

          if((path.key === `test` && statementParent.type === `IfStatement`) || (path.key === `init`)){

            const query = path.key === `test` ? `test.expressions` : `init.expressions`;

            const expressions = statementParent.get(query);
            const leftOverExp = expressions.pop();
            expressions.forEach((p) => statementParent.insertBefore(t.expressionStatement(p.node)));

            statementParent.get(path.key).replaceWith(leftOverExp.node);

          }else if(path.key === `update`){

            const test = statementParent.get(`test`);

            const expressions = path.get(`expressions`);

            const splittedExpressions = expressions.map((p) => t.expressionStatement(p.node));
            const ifNode = t.ifStatement(test.node, t.blockStatement(splittedExpressions), t.blockStatement([t.breakStatement()]));

            statementParent.get(`body`).pushContainer(`body`, ifNode);

            statementParent.get(`test`).remove();
            statementParent.get(`update`).remove();

          }

          return;

        case `ExpressionStatement`:

          if(path.parentPath.type === `ExpressionStatement`){
            const expressions = path.get(`expressions`);

            const splittedExpressions = expressions.map((p) => t.expressionStatement(p.node));

            path.parentPath.replaceWithMultiple(splittedExpressions);

          }

          return;
      }

    },

  });
}

module.exports = expandSequenceExpressions;
