const generate = require(`@babel/generator`).default;
const t = require(`@babel/types`);
const traverse = require(`@babel/traverse`).default;

const atob = require(`atob`);
const btoa = require(`btoa`);

const FINDERS = require(`./finders.js`);
const PayloadSchema = require(`./schema.js`);

const XOR_SHIFT_128 = `xorShift128`;
const LOOP_TYPES = [`WhileStatement`, `ForInStatement`];


function xorShift128(_$arg, _$arg2) {
  var rI = _$arg;
  var Vh = _$arg2;
  return function () {
    var di = rI;
    di ^= di << 23;
    di ^= di >> 17;
    var Wu = Vh;
    rI = Wu;
    di ^= Wu;
    di ^= Wu >> 26;
    Vh = di;
    return (rI + Vh) % 4294967296;
  };
}

function createEncoderFromPath({path, type}){

  const handleWhileAndByOneByte = (path) => {

    const rounds = path.node.test.right.value;
    const staticXor = path.getSibling(path.key - 3).get(`declarations.0.init.arguments.0.value`).node;

    return {
      "encoder" : function(xor) {

        const xored = xorShift128(staticXor, xor);

        const bytes = [];
        let index = 0;

        while (index < rounds){
          bytes.push(xored() & 255);
          index += 1;
        }

        return bytes;
      },
      "decoder" : function(xor) {

        const xored = xorShift128(staticXor, xor);

        const bytes = [];
        let index = 0;

        while (index < rounds){
          bytes.push(xored() & 255);
          index += 1;
        }

        return bytes;
      },
      type
    };

  };

  const handleWhileCharCodeAt = (path) => {

    return {
      "encoder" : function(data, xor){

        const newData = [];

        let i = 0;

        while (i < data.length){
          newData.push(data.charCodeAt(i));
          i++;
        }

        return newData;
      },
      "decoder" : function(data, xor){

        const newData = [];

        let i = 0;

        while (i < data.length){
          newData.push(String.fromCharCode(data[i]));
          i++;
        }

        return newData;
      },
      type
    };
  };

  const handleWhileShuffle = (path) => {

    const xorIndex = path.get(`body.body.0.expression.arguments.0.property.left.right.property.value`).node;

    return {
      "encoder" : function(data, xor) {

        const newData = [];

        for(let i = 0; i < data.length; i++){
          newData.push(data[(i + xor[xorIndex]) % data.length]);
        }

        return newData;

      },
      "decoder" : function(data, xor) {

        const tail = [...data];
        const head = [];

        for(let i = 0, start = xor[xorIndex] % data.length, maxIterations = data.length - start; i < maxIterations; i++){
          head.push(tail.shift());
        }

        return [...tail, ...head];

      },
      type
    };

  };

  const handleWhilePushToArrayReverse = (path) => {

    return {
      "encoder" : function(data, xor) {

        return [...data.reverse()];
      },
      "decoder" : function(data, xor) {
        return [...data.reverse()];
      },
      type
    };

  };

  const handleWhileExtraByte = (path) => {

    const startSlice = path.get(`body.body.1.expression.arguments.0.object.arguments.0.value`).node;
    const endSlice = path.get(`body.body.1.expression.arguments.0.object.arguments.1.value`).node;

    return {
      "encoder" : function(data, xor) {

        const newData = [];

        const slicedLength = xor.slice(startSlice, endSlice).length;

        for(let i = 0, maxIterations = data.length; i < maxIterations; i++){
          newData.push(data[i]);

          const extraByte = xor.slice(startSlice, endSlice)[i % slicedLength];
          newData.push(extraByte);

        }

        return newData;
      },
      "decoder" : function(data, xor) {
        return [...data.filter((d, i) => !(i%2))];
      },
      type
    };
  };

  const handleWhileSwapValues = (path) => {
    return {
      "encoder" : function(data, xor) {

        const newData = [...data];

        for(let i = 0, maxIterations = data.length; i + 1 < maxIterations; i+= 2){
          const current = newData[i];

          newData[i] = newData[i + 1];
          newData[i + 1] = current;

        }

        return newData;

      },
      "decoder" : function(data, xor) {

        const newData = [...data];

        for(let i = 0, maxIterations = data.length; i + 1 < maxIterations; i+= 2){
          const current = newData[i];

          newData[i] = newData[i + 1];
          newData[i + 1] = current;

        }

        return newData;

      },
      type
    };

  };

  const handleWhileFromCharCode = (path) => {
    return {
      "encoder" : function(data, xor) {
        return [...data.map((d) => String.fromCharCode(d))];
      },
      "decoder" : function(data, xor) {
        return [...data.map((d) => d.charCodeAt(0))];
      },
      type
    };

  };

  const handleWhileXorBySeed = (path) => {

    const startSlice = path.get(`body.body.1.declarations.0.init.object.arguments.0.value`).node;
    const endSlice = path.get(`body.body.1.declarations.0.init.object.arguments.1.value`).node;

    return {
      "encoder" : function(data, xor) {

        const newData = [];

        const slicedLength = xor.slice(startSlice, endSlice).length;

        for(let i = 0, maxIterations = data.length; i < maxIterations; i++){
          const extraByte = xor.slice(startSlice, endSlice)[i % slicedLength];
          newData.push(data[i] ^ extraByte);
        }

        return newData;

      },
      "decoder" : function(data, xor) {

        const newData = [];

        const slicedLength = xor.slice(startSlice, endSlice).length;

        for(let i = 0, maxIterations = data.length; i < maxIterations; i++){
          const extraByte = xor.slice(startSlice, endSlice)[i % slicedLength];
          newData.push(data[i] ^ extraByte);
        }

        return newData;
      },
      type
    };
  };

  const handleForFromCharCode = (path) => {
    return {
      "encoder" : function(data, xor) {

        return [...data.map((d) => String.fromCharCode(d))];
      },
      "decoder" : function(data, xor) {
        return [...data].map((d, i) => d.charCodeAt(0));
      },
      type
    };

  };

  const handleforOrTopByBottom = (path) => {

    return {
      "encoder" : function(data, xor) {
        return  [...data.map((d) => d << 4 & 240 | d >> 4)];
      },
      "decoder" : function(data, xor) {
        return  [...data.map((d) => d << 4 & 240 | d >> 4)];

      },
      type
    };

  };

  const handleForPushToArray = (path) => {
    return {
      "encoder" : function(data, xor) {
        return [...data];
      },
      "decoder" : function(data, xor) {
        return [...data];
      },
      type
    };

  };

  switch(type){
    case `whileAndByOneByte`:
      return handleWhileAndByOneByte(path);

    case `whileCharCodeAt`:
      return handleWhileCharCodeAt(path);

    case `whileShuffle`:
      return handleWhileShuffle(path);

    case `whilePushToArrayReverse`:
      return handleWhilePushToArrayReverse(path);

    case `whileExtraByte`:
      return handleWhileExtraByte(path);

    case `whileSwapValues`:
      return handleWhileSwapValues(path);

    case `WhileFromCharCode`:
      return handleWhileFromCharCode(path);

    case `whileXorBySeed`:
      return handleWhileXorBySeed(path);

    case `forFromCharCode`:
      return handleForFromCharCode(path);

    case `forOrTopByBottom`:
      return handleforOrTopByBottom(path);

    case `forPushToArray`:
      return handleForPushToArray(path);

    default:
      throw Error(`Unknown type:${type}`);

  }

}

function extractEncoderType(path){

  const body = path.get(`body.body`);
  const firstNode = body[0].node;
  const secondNode = body.length >= 2 ? body[1].node : null;
  const thirdNode = body.length >= 3 ? body[2].node : null;
  const lastNode = body.slice(-1)[0].node;

  if(!LOOP_TYPES.includes(path.type)){
    return false;
  }

  if(path.type === `WhileStatement`){

    switch(body.length){
      case 2:

        const firstNodeCode = generate(firstNode).code;

        if(firstNodeCode.endsWith(`& 255);`)){
          return `whileAndByOneByte`;
        }

        if(firstNodeCode.includes(`charCodeAt`)){
          return `whileCharCodeAt`;
        }

        let hasShuffle = false;

        body.forEach((bodyNodePath) => {
          const bodyNodeCode = generate(bodyNodePath.node).code;
          if(bodyNodeCode.match(/([a-zA-Z0-9].*)\.push\(([a-zA-Z0-9].*)\[\(([a-zA-Z0-9].*) \+ ([a-zA-Z0-9].*)\[([0-9].*)\]\) \% ([a-zA-Z0-9].*)\]\);/)){
            hasShuffle = true;
          }

        });

        if(hasShuffle){
          return `whileShuffle`;
        }

        const test = path.get(`test`);

        if(
          test.type === `BinaryExpression` && test.node.operator === `>=` && test.node.right.type === `NumericLiteral` &&
          test.node.right.value === 0
        ){

          return `whilePushToArrayReverse`;

        }

        return false;

      case 3:

        if(secondNode.type === `IfStatement`){
          return false;
        }

        const nodes = [firstNode, secondNode];

        const hasNonPush = nodes.filter((n) =>
          n.type === `ExpressionStatement` && n.expression.type === `CallExpression` && n.expression.callee.type === `MemberExpression` &&
          n.expression.callee.property.type === `Identifier` && n.expression.callee.property.name === `push`
        );

        if(hasNonPush.length === 2){
          return `whileExtraByte`;
        }

        if(firstNodeCode.includes(`charCodeAt`)){
          return `whileCharCodeAt`;
        }

        return false;

      case 4:
        if(
          lastNode.type === `ExpressionStatement` && lastNode.expression.type === `AssignmentExpression` &&
          lastNode.expression.operator === `+=` && lastNode.expression.right.type === `NumericLiteral` &&
          lastNode.expression.right.value === 2
        ){
          return `whileSwapValues`;
        }

        if(
          secondNode.type === `VariableDeclaration` && secondNode.declarations.length === 1 && secondNode.declarations[0].init === `CallExpression` &&
          generate(secondNode.declarations[0].init.callee).code.includes(`String.fromCharCode`)
        ){

          return `WhileFromCharCode`;
        }

        if(
          thirdNode.type === `ExpressionStatement` && thirdNode.expression.type === `CallExpression` && thirdNode.expression.arguments.length === 1 &&
          thirdNode.expression.arguments[0].type === `BinaryExpression` &&  thirdNode.expression.arguments[0].operator === `^`
        ){
          return `whileXorBySeed`;

        }

        return false;
    }

    return false;

  }else{
    const lastNode = body.slice(-1)[0].node;

    if(!(lastNode.type === `IfStatement` && generate(lastNode.test).code.includes(`hasOwnProperty`))){
      return false;
    }

    const firstNodeOfLast = lastNode.consequent.body[0];

    switch(firstNodeOfLast.type){
      case `VariableDeclaration`:
        const init = firstNodeOfLast.declarations[0].init;

        if(init.type === `CallExpression` && generate(init.callee).code.includes(`String.fromCharCode`)){
          return `forFromCharCode`;
        }

        if(init.type === `BinaryExpression` && generate(init).code.includes(`<< 4 & 240`)){
          return `forOrTopByBottom`;
        }
        break;

      case `ExpressionStatement`:
        const expression = firstNodeOfLast.expression;

        if(
          expression.type === `CallExpression` && expression.callee.type === `MemberExpression` &&
          expression.callee.property.type === `Identifier` && expression.callee.property.name === `push`
        ){
          return `forPushToArray`;
        }

        break;
    }

    return false;
  }

}

function getXorEncoderFromPath(path){

  const encoderVar = path.get(`declarations.0.id.name`).node;

  const isStartOfEncoder = (n) => {
    return n.type === `VariableDeclaration` && n.declarations.length === 1 && n.declarations[0].init.type === `CallExpression` &&
    generate(n.declarations[0].init).code.startsWith(XOR_SHIFT_128);
  };

  const isEndOfEncoder = (n) => {
    return n.type === `VariableDeclaration` && n.declarations.length === 1 && n.declarations[0].init.type === `CallExpression` &&
    generate(n.declarations[0].init).code.includes(`btoa`);
  };

  let currentPath = path.getNextSibling();

  const encoders = [];
  const paths = [];
  const loopEncoders = [];

  while(currentPath.node !== undefined || currentPath.node !== null){

    if(isStartOfEncoder(currentPath.node)){
      //SKIP THE NEXT TIME
      currentPath.setData(`skip`, true);

      const subEncoders = getXorEncoderFromPath(currentPath);

      subEncoders.forEach((subEncoder) => encoders.push(subEncoder));
      const lastSubEncoder = subEncoders.slice(-1)[0][`nextPath`];

      currentPath = lastSubEncoder.getNextSibling();
      continue;
    }

    if(isEndOfEncoder(currentPath.node)){
      break;
    }

    if(LOOP_TYPES.includes(currentPath.type)){
      const encoderType = extractEncoderType(currentPath);

      if(encoderType){
        loopEncoders.push(
          createEncoderFromPath({path : currentPath, type : encoderType}),
        );
      }
    }

    currentPath = currentPath.getNextSibling();
  }

  const nextPath = [undefined, null].includes(currentPath) ? false : currentPath;

  encoders.push({
    "var" : encoderVar,
    "encoders" : loopEncoders,
    "nextPath" : nextPath,
    "path" : t.blockStatement(paths.map((p) => p.node))
  });

  return encoders;

}

function buildEncoderAndDecoder( encoders){

  return {
    "encoder" : function(data, xor){

      const _encs = [...encoders];
      const firstEncoder = _encs.shift()[`encoder`];
      const xored = firstEncoder(xor);
      const encodeFuncs = [..._encs];

      let mutable = String(data);

      for(let i = 0, maxIterations = encodeFuncs.length; i < maxIterations;i++){

        const enc = encodeFuncs[i];
        mutable = enc[`encoder`](mutable, xored);

      }

      return btoa(mutable.join(``));

    },
    "decoder" : function(data, xor){

      const _encs = [...encoders];
      const xored = _encs.shift()[`decoder`](xor);
      const decodeFuncs = [..._encs].reverse();

      let mutable = String(atob(data));
      for(let i = 0, maxIterations = decodeFuncs.length; i < maxIterations;i++){

        const enc = decodeFuncs[i];
        mutable = enc[`decoder`](mutable, xored);

      }
      //console.log(`mutable`, xor);
      return JSON.parse(mutable.join(``));

    }
  };
}
function getSignalsPaths(ast){

  const paths = [];

  traverse(ast, {

    Program(path){

      const mainFuncPath = path.get(`body.0.expression.callee.body.body`).slice(-2)[0];
      let currentPath =  mainFuncPath.get(`body.body.0.expression.right.body.body.0.block.body.2.expression.arguments.1.body.body.0.block.body.13`);

      for(let i = 1, startingKey = currentPath.key; i < 9;i++){

        currentPath = currentPath.getSibling(startingKey + i);
        paths.push(currentPath);
      }
    }
  });

  return paths;
}

function extractXorEncoders(ast){

  const xorEncoders = [];

  getSignalsPaths(ast).forEach((currentPath) => {
    const currentEncoders = [];

    currentPath.traverse({
      CallExpression(callPath){

        const callee = callPath.get(`callee`);

        if(!(callee.type === `Identifier` && callee.node.name === XOR_SHIFT_128)){
          return;
        }

        const statementPath = callPath.getStatementParent();

        if(!statementPath.getData(`skip`, false)){

          const encoders = getXorEncoderFromPath(statementPath);

          encoders.forEach((encoder) => {
            currentEncoders.push(buildEncoderAndDecoder(encoder[`encoders`]));
          });
        }

      }
    });

    xorEncoders.push(currentEncoders);
  });

  return xorEncoders;

}

function extractSignalsKeys(ast){

  const createKeysToFind = ({root, keysToFind, finders} = {}) => {

    root = root || PayloadSchema.properties;
    keysToFind = keysToFind || {};
    finders = finders || FINDERS;

    for(let i = 0, payloadKeys = Object.keys(root); i < payloadKeys.length; i++){

      const currentKey = root[payloadKeys[i]];

      if(currentKey.type === `object`){

        keysToFind[payloadKeys[i]] = {};

        for(let e = 0, _payloadKeys = Object.keys(currentKey.properties); e < _payloadKeys.length; e++){

          if(currentKey.properties[_payloadKeys[e]].type === `object`){
            keysToFind[payloadKeys[i]][_payloadKeys[e]] = {};

            createKeysToFind({
              root : currentKey.properties[_payloadKeys[e]].properties,
              keysToFind : keysToFind[payloadKeys[i]][_payloadKeys[e]],
              finders : finders[payloadKeys[i]].properties[_payloadKeys[e]].properties
            });

            keysToFind[payloadKeys[i]][_payloadKeys[e]][_payloadKeys[e]] = { found : false, value : undefined, func : finders[payloadKeys[i]].properties[_payloadKeys[e]].finder};

          }else{
            keysToFind[payloadKeys[i]][_payloadKeys[e]] = { found : false, value : undefined, func : finders[payloadKeys[i]].properties[_payloadKeys[e]].finder };
          }
        }

        keysToFind[payloadKeys[i]][payloadKeys[i]] = { found : false, value : undefined, func : finders[payloadKeys[i]].finder };

      }else{
        keysToFind[payloadKeys[i]] = { found : false, value : undefined, func : finders[payloadKeys[i]].finder };
      }
    }

    return keysToFind;
  };

  const setDefaultKeysValues = ({signalKeys, currentPath}) => {

    for(let i = 0, payloadKeys = Object.keys(signalKeys); i < payloadKeys.length; i++){

      const currentKey = signalKeys[payloadKeys[i]];

      if(currentKey.func !== undefined){

        if(!currentKey.found){
          const { found, value } = currentKey.func(currentPath);

          currentKey[`found`] = found;
          currentKey[`value`] = value;
        }

      }else{

        for(let e = 0, _payloadKeys = Object.keys(currentKey); e < _payloadKeys.length; e++){

          const _currentKey = currentKey[_payloadKeys[e]];
          if(!_currentKey.found){
            const { found, value } = _currentKey.func(currentPath);
            _currentKey[`found`] = found;
            _currentKey[`value`] = value;
          }

        }

      }
    }

  };

  const signalKeys = createKeysToFind();

  getSignalsPaths(ast).forEach((currentPath) => {

    for(let i = 0, payloadKeys = Object.keys(signalKeys); i < payloadKeys.length; i++){

      const currentKey = signalKeys[payloadKeys[i]];

      if(currentKey.func !== undefined){

        if(!currentKey.found){
          const { found, value } = currentKey.func(currentPath);

          currentKey[`found`] = found;
          currentKey[`value`] = value;
        }

      }else{

        for(let e = 0, _payloadKeys = Object.keys(currentKey); e < _payloadKeys.length; e++){

          const _currentKey = currentKey[_payloadKeys[e]];

          if(_payloadKeys[e] in _currentKey){

            for( let f = 0, __payloadKeys = Object.keys(_currentKey); f < __payloadKeys.length; f++){
              const __currentKey = _currentKey[__payloadKeys[f]];

              if(!__currentKey.found){
                const { found, value } = __currentKey.func(currentPath);
                __currentKey[`found`] = found;
                __currentKey[`value`] = value;
              }

            }

          }else if(!_currentKey.found){
            const { found, value } = _currentKey.func(currentPath);
            _currentKey[`found`] = found;
            _currentKey[`value`] = value;
          }

        }

      }
    }

  });

  return signalKeys;
}

function extractStAndSr(ast){
  const mainFuncPath = ast.program.body[0].expression.callee.body.body.slice(-2)[0];

  let st = null;
  let sr = null;

  mainFuncPath.body.body[0].expression.right.body.body[0].handler.body.body.forEach((n) => {

    if(n.type === `ExpressionStatement` && n.expression.type === `CallExpression`){
      return;
    }

    const key = n.expression.left.property.value;

    if(key === `st`){
      st = n.expression.right.value;
    }else if(key === `sr`){
      sr = n.expression.right.value;
    }

  });

  return {st, sr};

}

module.exports = {
  createEncoderFromPath,
  extractEncoderType,
  getXorEncoderFromPath,
  buildEncoderAndDecoder,
  extractXorEncoders,
  extractSignalsKeys,
  extractStAndSr
};
