const atob = require(`atob`);
const generate = require(`@babel/generator`).default;
const t = require(`@babel/types`);
const traverse = require(`@babel/traverse`).default;
const vm = require(`vm`);

function _rc4(_0x32e031, _0x2398d3) {
  var _0x1ce0c9 = [],
    _0x713bac = 0x0,
    _0x1c1816,
    _0x43f57a = ``,
    _0x32bd36 = ``;

  _0x32e031 = atob(_0x32e031);

  for (var _0x1bf356 = 0x0, _0x5bd47b = _0x32e031[`length`]; _0x1bf356 < _0x5bd47b; _0x1bf356++) {
    _0x32bd36 += `%` + (`00` + _0x32e031[`charCodeAt`](_0x1bf356)[`toString`](0x10))[`slice`](-0x2);
  }

  _0x32e031 = decodeURIComponent(_0x32bd36);

  for (var _0x47f60c = 0x0; _0x47f60c < 0x100; _0x47f60c++) {
    _0x1ce0c9[_0x47f60c] = _0x47f60c;
  }

  for (_0x47f60c = 0x0; _0x47f60c < 0x100; _0x47f60c++) {
    _0x713bac = (_0x713bac + _0x1ce0c9[_0x47f60c] + _0x2398d3[`charCodeAt`](_0x47f60c % _0x2398d3[`length`])) % 0x100;
    _0x1c1816 = _0x1ce0c9[_0x47f60c];
    _0x1ce0c9[_0x47f60c] = _0x1ce0c9[_0x713bac];
    _0x1ce0c9[_0x713bac] = _0x1c1816;
  }

  _0x47f60c = 0x0;
  _0x713bac = 0x0;

  for (var _0x533dd4 = 0x0; _0x533dd4 < _0x32e031[`length`]; _0x533dd4++) {
    _0x47f60c = (_0x47f60c + 0x1) % 0x100;
    _0x713bac = (_0x713bac + _0x1ce0c9[_0x47f60c]) % 0x100;
    _0x1c1816 = _0x1ce0c9[_0x47f60c];
    _0x1ce0c9[_0x47f60c] = _0x1ce0c9[_0x713bac];
    _0x1ce0c9[_0x713bac] = _0x1c1816;
    _0x43f57a += String[`fromCharCode`](_0x32e031[`charCodeAt`](_0x533dd4) ^ _0x1ce0c9[(_0x1ce0c9[_0x47f60c] + _0x1ce0c9[_0x713bac]) % 0x100]);
  }

  return _0x43f57a;
};

function RC4 (arrayName, strA, strB) {

  strA = strA - 0x0;
  const result = _rc4(arrayName[strA], strB);
  return result;
};

function Shuffle(array, shuffleBy) {

  const _shuffle = (delta) => {
    while (--delta) {
      array[`push`](array[`shift`]());
    }
  };

  _shuffle(++shuffleBy);

}
function findStringArrays(ast){

  const stringArrays = [];

  traverse(ast, {
    Program(path){

      path.get(`body`).forEach((_path) => {

        if(!(
          _path.type === `VariableDeclaration` && _path.get(`declarations`).length === 1 &&
          _path.get(`declarations.0.init`).type === `ArrayExpression` &&
          !_path.get(`declarations.0.init.elements`).some((_p) => _p.node.type !== `StringLiteral`)
        )){
          return;
        }

        const arrayName = _path.get(`declarations.0.id.name`).node;
        const stringArray = _path.get(`declarations.0.init.elements`).map((_p) => _p.node.value);

        stringArrays.push({arrayName, stringArray});
        _path.remove();

      });

    }
  });
  if(!("stringArrays" in ast)){
    ast.stringArrays = stringArrays;
  }

  return ast.stringArrays;

}

function findShuffleBys(ast, arrayNames){

  const shuffleBys = [];

  traverse(ast, {
    Program(path){

      path.get(`body`).forEach((_path) => {

        if(!(
          _path.type === `ExpressionStatement` && _path.get(`expression`).type === `CallExpression`  &&
          _path.get(`expression.arguments`).length === 2 && _path.get(`expression.arguments.1`).type === `NumericLiteral` &&
          _path.get(`expression.arguments.0`).type === `Identifier` && arrayNames.includes(_path.get(`expression.arguments.0.name`).node)
        )){
          return;
        }

        const shuffleBy = _path.get(`expression.arguments.1.value`).node;
        shuffleBys.push(shuffleBy);

        _path.remove();

      });

    }
  });
  if(!("shuffleBys" in ast)){
    ast.shuffleBys = shuffleBys;
  }

  return ast.shuffleBys;


}

function findEncoders(ast){

  const encoders = [];

  traverse(ast, {
    AssignmentExpression(path){

      const code = generate(path.node).code;

      if(!code.endsWith(`["initialized"] = !![]`)){
        return;
      }

      const encoder = path.parentPath.parentPath.parentPath.parentPath.parentPath.parentPath.node.id.name;
      encoders.push(encoder);

      path.parentPath.parentPath.parentPath.parentPath.parentPath.parentPath.remove();
    }
  });

  if(!("encoders" in ast)){
    ast.encoders = encoders;
  }

  return ast.encoders;

}
function createSandbox({stringArrays, shuffleBys, encoders}){

  const createRC4Func = ({encoder, arrayName, stringArray, shuffleBy}) => {
    return `\nvar ${arrayName} = [${stringArray.map((_s) => `"${_s}"`)}];\nvar ${encoder} = function(strA, strB){ return RC4(${arrayName}, strA, strB)};\nShuffle(${arrayName}, ${shuffleBy});\n`;
  };

  const context = {atob, RC4, Shuffle};

  encoders.forEach((encoder, index) => {
    const { stringArray, arrayName } = stringArrays[index];
    const shuffleBy = shuffleBys[index];

    vm.runInNewContext(createRC4Func({encoder, arrayName, stringArray, shuffleBy}), context);

  });

  return context;

}

function clearConcealedStringsSession(ast){

  const stringArrays = findStringArrays(ast);
  const shuffleBys = findShuffleBys(ast, stringArrays.map((s) => s.arrayName));
  const encoders = findEncoders(ast);

  if(!("sandbox" in ast)){
    const sandbox = createSandbox({ stringArrays, shuffleBys, encoders});
    ast.sandbox = sandbox;
  }


  traverse(ast, {
    CallExpression: {
      exit(path){
        const callee = path.get(`callee`);

        if(!(callee.type === `Identifier` && encoders.includes(callee.node.name))){
          return;
        }
        try{
          const evaluatedNode = t.stringLiteral(vm.runInNewContext(generate(path.node).code, ast.sandbox));

          path.replaceWith(evaluatedNode);

        }catch(e){
          //console.log(`e`, e)

          const topParent = path.getStatementParent().parentPath;
          const isInsideSwitch = t.isSwitchCase(topParent.node);

          if(isInsideSwitch){
            const caseCtx = {...ast.sandbox};
            const caseNodes = topParent.node.consequent.slice(0, topParent.node.consequent.length - 2).map((n) => generate(n).code);
            vm.runInNewContext(caseNodes.join(`\n`), caseCtx);
            try{
              const evaluatedNode = t.stringLiteral(vm.runInNewContext(generate(path.node).code, caseCtx));
              path.replaceWith(evaluatedNode);
            }catch(e){
            }
          }
        }
      }
    }
  });


}

module.exports = clearConcealedStringsSession;
