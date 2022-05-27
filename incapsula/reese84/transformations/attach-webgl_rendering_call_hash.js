const _hash = require(`../hash.js`);
const generate = require(`@babel/generator`).default;
const t = require(`@babel/types`);
const traverse = require(`@babel/traverse`).default;

function attachWebglRenderingCallHash(ast){

  function HASH(seed, randomInt) {
    var Ff = _hash.hash(seed + randomInt).match(new RegExp(`..`, `g`)).map(function (Nq) {
      return parseInt(Nq, 16);
    });

    return String.fromCharCode.apply(null, Array.from(``[`replace`][`call`](JSON.stringify, new RegExp(`[\\u0080-\\uFFFF]`, `g`), ``)).slice(-21).map(function (GH, BX) {
      return GH[`charCodeAt`](0) ^ Ff[BX % Ff[`length`]] & 127;
    }));
  }
  traverse(ast, {
    ReturnStatement(path){

      const code = generate(path.node).code;

      if(!code.endsWith(`["length"]] & 127;`)){
        return;
      }
      //I know is long, but sometimes you have to make long-ass queries to get very specific nodes
      const seed = path.parentPath.getStatementParent().parentPath.parentPath.getPrevSibling().get(`declarations.0.init.callee.object.callee.object.arguments.0.left`);
      ast.webgl_rendering_call_hash = (xor) => HASH(seed.node.value, xor);
    }
  });
}

module.exports = attachWebglRenderingCallHash;
