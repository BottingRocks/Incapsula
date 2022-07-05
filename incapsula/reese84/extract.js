const generate = require(`@babel/generator`).default;
const jtraverse = require(`json-schema-traverse`);
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

function createEncoderFromPath({
  path,
  type
}) {
  //Good
  const handleWhileAndByOneByte = (path) => {

    const rounds = path.node.test.right.value;
    const staticXor = path.getSibling(path.key - 3).get(`declarations.0.init.arguments.0.value`).node;

    return {
      "encoder" : function (xor) {

        const xored = xorShift128(staticXor, xor);

        const bytes = [];
        let index = 0;

        while (index < rounds) {
          bytes.push(xored() & 255);
          index += 1;
        }

        return bytes;
      },
      "decoder" : function (xor) {

        const xored = xorShift128(staticXor, xor);

        const bytes = [];
        let index = 0;

        while (index < rounds) {
          bytes.push(xored() & 255);
          index += 1;
        }

        return bytes;
      },
      type
    };

  };
  //Good
  const handleWhileCharCodeAt = (path) => {

    return {
      "encoder" : function (data, xor) {

        const newData = [];

        let i = 0;

        while (i < data.length) {
          newData.push(data.charCodeAt(i));
          i++;
        }

        return newData;
      },
      "decoder" : function (data, xor) {

        const newData = [];

        let i = 0;

        while (i < data.length) {
          newData.push(String.fromCharCode(data[i]));
          i++;
        }

        return newData;
      },
      type
    };
  };
  //Good
  const handleWhileShuffle = (path) => {

    const xorIndex = path.get(`body.body.0.expression.arguments.0.property.left.right.property.value`).node;

    return {
      "encoder" : function (data, xor) {

        const newData = [];

        for (let i = 0; i < data.length; i++) {
          newData.push(data[(i + xor[xorIndex]) % data.length]);
        }

        return newData;

      },
      "decoder" : function (data, xor) {

        const tail = [...data];
        const head = [];

        for (let i = 0, start = xor[xorIndex] % data.length, maxIterations = data.length - start; i < maxIterations; i++) {
          head.push(tail.shift());
        }

        return [...tail, ...head];

      },
      type
    };

  };
  //Good
  const handleWhilePushToArrayReverse = (path) => {

    return {
      "encoder" : function (data, xor) {

        return [...data.reverse()];
      },
      "decoder" : function (data, xor) {
        return [...data.reverse()];
      },
      type
    };

  };
  //Good
  const handleWhileExtraByte = (path) => {

    const startSlice = path.get(`body.body.1.expression.arguments.0.object.arguments.0.value`).node;
    const endSlice = path.get(`body.body.1.expression.arguments.0.object.arguments.1.value`).node;

    return {
      "encoder" : function (data, xor) {

        const newData = [];

        const slicedLength = xor.slice(startSlice, endSlice).length;

        for (let i = 0, maxIterations = data.length; i < maxIterations; i++) {
          newData.push(data[i]);

          const extraByte = xor.slice(startSlice, endSlice)[i % slicedLength];
          newData.push(extraByte);

        }

        return newData;
      },
      "decoder" : function (data, xor) {
        return [...data.filter((d, i) => !(i % 2))];
      },
      type
    };
  };
  //Good
  const handleWhileSwapValues = (path) => {
    return {
      "encoder" : function (data, xor) {

        const newData = [...data];

        for (let i = 0, maxIterations = data.length; i + 1 < maxIterations; i += 2) {
          const current = newData[i];

          newData[i] = newData[i + 1];
          newData[i + 1] = current;

        }

        return newData;

      },
      "decoder" : function (data, xor) {

        const newData = [...data];

        for (let i = 0, maxIterations = data.length; i + 1 < maxIterations; i += 2) {
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
      "encoder" : function (data, xor) {
        return [...data.map((d) => String.fromCharCode(d))];
      },
      "decoder" : function (data, xor) {
        return [...data.map((d) => d.charCodeAt(0))];
      },
      type
    };

  };
  //Good
  const handleWhileXorBySeed = (path) => {

    const startSlice = path.get(`body.body.1.declarations.0.init.object.arguments.0.value`).node;
    const endSlice = path.get(`body.body.1.declarations.0.init.object.arguments.1.value`).node;

    return {
      "encoder" : function (data, xor) {

        const newData = [];

        const slicedLength = xor.slice(startSlice, endSlice).length;

        for (let i = 0, maxIterations = data.length; i < maxIterations; i++) {
          const extraByte = xor.slice(startSlice, endSlice)[i % slicedLength];
          newData.push(data[i] ^ extraByte);
        }

        return newData;

      },
      "decoder" : function (data, xor) {

        const newData = [];

        const slicedLength = xor.slice(startSlice, endSlice).length;

        for (let i = 0, maxIterations = data.length; i < maxIterations; i++) {
          const extraByte = xor.slice(startSlice, endSlice)[i % slicedLength];
          newData.push(data[i] ^ extraByte);
        }

        return newData;
      },
      type
    };
  };
  //Good
  const handleForFromCharCode = (path) => {
    return {
      "encoder" : function (data, xor) {

        return [...data.map((d) => String.fromCharCode(d))];
      },
      "decoder" : function (data, xor) {
        return [...data].map((d, i) => d.charCodeAt(0));
      },
      type
    };

  };
  //Good
  const handleforOrTopByBottom = (path) => {

    return {
      "encoder" : function (data, xor) {
        return [...data.map((d) => d << 4 & 240 | d >> 4)];
      },
      "decoder" : function (data, xor) {
        return [...data.map((d) => d << 4 & 240 | d >> 4)];

      },
      type
    };

  };
  //Good
  const handleForPushToArray = (path) => {
    return {
      "encoder" : function (data, xor) {
        return [...data];
      },
      "decoder" : function (data, xor) {
        return [...data];
      },
      type
    };

  };

  switch (type) {
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

function extractEncoderType(path) {

  const body = path.get(`body.body`);
  const firstNode = body[0].node;
  const secondNode = body.length >= 2 ? body[1].node : null;
  const thirdNode = body.length >= 3 ? body[2].node : null;
  const lastNode = body.slice(-1)[0].node;

  if (!LOOP_TYPES.includes(path.type)) {
    return false;
  }

  if (path.type === `WhileStatement`) {

    switch (body.length) {
      case 2:

        const firstNodeCode = generate(firstNode).code;

        if (firstNodeCode.endsWith(`& 255);`)) {
          return `whileAndByOneByte`;
        }

        if (firstNodeCode.includes(`charCodeAt`)) {
          return `whileCharCodeAt`;
        }

        let hasShuffle = false;

        body.forEach((bodyNodePath) => {
          const bodyNodeCode = generate(bodyNodePath.node).code;
          if (bodyNodeCode.match(/([a-zA-Z0-9].*)\.push\(([a-zA-Z0-9].*)\[\(([a-zA-Z0-9].*) \+ ([a-zA-Z0-9].*)\[([0-9].*)\]\) \% ([a-zA-Z0-9].*)\]\);/)) {
            hasShuffle = true;
          }

        });

        if (hasShuffle) {
          return `whileShuffle`;
        }

        const test = path.get(`test`);

        if (
          test.type === `BinaryExpression` && test.node.operator === `>=` && test.node.right.type === `NumericLiteral` &&
          test.node.right.value === 0
        ) {

          return `whilePushToArrayReverse`;

        }

        return false;

      case 3:

        if (secondNode.type === `IfStatement`) {
          return false;
        }

        const nodes = [firstNode, secondNode];

        const hasNonPush = nodes.filter((n) =>
          n.type === `ExpressionStatement` && n.expression.type === `CallExpression` && n.expression.callee.type === `MemberExpression` &&
          n.expression.callee.property.type === `Identifier` && n.expression.callee.property.name === `push`
        );

        if (hasNonPush.length === 2) {
          return `whileExtraByte`;
        }

        if (firstNodeCode.includes(`charCodeAt`)) {
          return `whileCharCodeAt`;
        }

        return false;

      case 4:
        if (
          lastNode.type === `ExpressionStatement` && lastNode.expression.type === `AssignmentExpression` &&
          lastNode.expression.operator === `+=` && lastNode.expression.right.type === `NumericLiteral` &&
          lastNode.expression.right.value === 2
        ) {
          return `whileSwapValues`;
        }

        if (
          secondNode.type === `VariableDeclaration` && secondNode.declarations.length === 1 && secondNode.declarations[0].init === `CallExpression` &&
          generate(secondNode.declarations[0].init.callee).code.includes(`String.fromCharCode`)
        ) {

          return `WhileFromCharCode`;
        }

        if (
          thirdNode.type === `ExpressionStatement` && thirdNode.expression.type === `CallExpression` && thirdNode.expression.arguments.length === 1 &&
          thirdNode.expression.arguments[0].type === `BinaryExpression` && thirdNode.expression.arguments[0].operator === `^`
        ) {
          return `whileXorBySeed`;

        }

        return false;
    }

    return false;

  } else {
    const lastNode = body.slice(-1)[0].node;

    if (!(lastNode.type === `IfStatement` && generate(lastNode.test).code.includes(`hasOwnProperty`))) {
      return false;
    }

    const firstNodeOfLast = lastNode.consequent.body[0];

    switch (firstNodeOfLast.type) {
      case `VariableDeclaration`:
        const init = firstNodeOfLast.declarations[0].init;

        if (init.type === `CallExpression` && generate(init.callee).code.includes(`String.fromCharCode`)) {
          return `forFromCharCode`;
        }

        if (init.type === `BinaryExpression` && generate(init).code.includes(`<< 4 & 240`)) {
          return `forOrTopByBottom`;
        }
        break;

      case `ExpressionStatement`:
        const expression = firstNodeOfLast.expression;

        if (
          expression.type === `CallExpression` && expression.callee.type === `MemberExpression` &&
          expression.callee.property.type === `Identifier` && expression.callee.property.name === `push`
        ) {
          return `forPushToArray`;
        }

        break;
    }

    return false;
  }

}

function getXorEncoderFromPath(path) {

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

  while (currentPath.node !== undefined || currentPath.node !== null) {

    if (isStartOfEncoder(currentPath.node)) {
      //SKIP THE NEXT TIME
      currentPath.setData(`skip`, true);

      const subEncoders = getXorEncoderFromPath(currentPath);

      subEncoders.forEach((subEncoder) => encoders.push(subEncoder));
      const lastSubEncoder = subEncoders.slice(-1)[0][`nextPath`];

      currentPath = lastSubEncoder.getNextSibling();
      continue;
    }

    if (isEndOfEncoder(currentPath.node)) {
      break;
    }

    if (LOOP_TYPES.includes(currentPath.type)) {
      const encoderType = extractEncoderType(currentPath);

      if (encoderType) {
        const encoderPath = createEncoderFromPath({ path : currentPath, type : encoderType});
        loopEncoders.push(encoderPath);
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

function buildEncoderAndDecoder(encoders) {
  return {
    "encoder" : function (data, xor) {
      const _encs = [...encoders];
      const firstEncoder = _encs.shift()[`encoder`];
      const xored = firstEncoder(xor);
      const encodeFuncs = [..._encs];

      let mutable = data;

      for (let i = 0, maxIterations = encodeFuncs.length; i < maxIterations; i++) {

        const enc = encodeFuncs[i];
        mutable = enc[`encoder`](mutable, xored);

      }

      return btoa(mutable.join(``));

    },
    "decoder" : function (data, xor) {

      const _encs = [...encoders];
      const xored = _encs.shift()[`decoder`](xor);
      const decodeFuncs = [..._encs].reverse();

      let mutable = atob(data);

      for (let i = 0, maxIterations = decodeFuncs.length; i < maxIterations; i++) {

        const enc = decodeFuncs[i];
        mutable = enc[`decoder`](mutable, xored);

      }

      return JSON.parse(mutable.join(``));

    }
  };
}

function getSignalsPaths(ast) {

  const paths = [];

  traverse(ast, {

    Program(path) {

      const mainFuncPath = path.get(`body.0.expression.callee.body.body`).slice(-2)[0];
      let currentPath = mainFuncPath.get(`body.body.0.expression.right.body.body.0.block.body.2.expression.arguments.1.body.body.0.block.body.14`);

      for (let i = 1, startingKey = currentPath.key; i < 10; i++) {

        currentPath = currentPath.getSibling(startingKey + i);
        paths.push(currentPath);
      }
    }
  });

  return paths;
}

function extractXorEncoders(ast){

  const xorEncoders = [];
  const signalsPaths = getSignalsPaths(ast);

  signalsPaths.forEach((currentPath, index) => {

    const currentEncoders = [];

    if(index === 1){
      currentPath.traverse({
        TryStatement(tryPath){

           const block = tryPath.get(`block`);
           const firstNode = block.get(`body.0`).node;
           if(!
           (t.isIfStatement(firstNode) && generate(firstNode.test).code.endsWith(`() !== undefined`))
           ){
             return;
           }
           const tryEncoders = [];
           tryPath.get(`block.body.0.consequent.body.0.expression.right.callee.body`).traverse({
             CallExpression(callPath) {

               const callee = callPath.get(`callee`);

               if (!(callee.type === `Identifier` && callee.node.name === XOR_SHIFT_128)) {
                 return;
               }
               const statementPath = callPath.getStatementParent();

               if (!statementPath.getData(`skip`, false)) {

                 const encoders = getXorEncoderFromPath(statementPath);
                 encoders.forEach((encoder) =>
                   tryEncoders.push(buildEncoderAndDecoder(encoder[`encoders`]))
                 );
               }

             }
           });

           const timestampProp = tryPath.get(`block.body.0.consequent.body.0.expression.left.property`).node;
           ast.restorePaths.push([tryPath, t.cloneNode(tryPath.node)]);

           tryPath.replaceWith(
             t.expressionStatement(
               t.assignmentExpression(
                 `=`, t.memberExpression(
                   t.identifier(`TIMESTAMPS`), timestampProp, true
                 ), t.stringLiteral(`FINDME`),
               )
             )
           );
           xorEncoders.push(tryEncoders);
        }
      });
    }

    currentPath.traverse({
      CallExpression(callPath) {

        const callee = callPath.get(`callee`);

        if (!(callee.type === `Identifier` && callee.node.name === XOR_SHIFT_128)) {
          return;
        }

        const statementPath = callPath.getStatementParent();

        if (!statementPath.getData(`skip`, false)) {

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

function extractSignalsKeys(ast) {


  const paths = getSignalsPaths(ast);
  const getValue = (key) => {

    const func = FINDERS[key];
    let foundKey = false;

    if(key.startsWith("events.")){
      const { found, value } = func(paths[0]);

      if(found){
        foundKey = value;
      }
    }else{

      paths.forEach((currentPath) => {
        const { found, value } = func(currentPath);

        if(foundKey){
          return;
        }
        if(found){
          foundKey = value;
        }
      });
    }

    if(!foundKey){
      throw Error(`Could not find key:${key} in ast`);
    }

    return foundKey;

  };

  return {
    'events' : getValue(`events`),
    'events.mouse' : getValue(`events.mouse`),
    'events.mouse.type' : getValue(`events.mouse.type`),
    'events.mouse.timestamp' : getValue(`events.mouse.timestamp`),
    'events.mouse.client_x' : getValue(`events.mouse.client_x`),
    'events.mouse.client_y' : getValue(`events.mouse.client_y`),
    'events.mouse.screen_x' : getValue(`events.mouse.screen_x`),
    'events.mouse.screen_y' : getValue(`events.mouse.screen_y`),
    'events.touch.' : getValue(`events.touch`),
    'events.touch.type' : getValue(`events.touch.type`),
    'events.touch.timestamp' : getValue(`events.touch.timestamp`),
    'events.touch.identifier' : getValue(`events.touch.identifier`),
    'events.touch.client_x' : getValue(`events.touch.client_x`),
    'events.touch.client_y' : getValue(`events.touch.client_y`),
    'events.touch.screen_x' : getValue(`events.touch.screen_x`),
    'events.touch.screen_y' : getValue(`events.touch.screen_y`),
    'events.touch.radius_x' : getValue(`events.touch.radius_x`),
    'events.touch.radius_y' : getValue(`events.touch.radius_y`),
    'events.touch.rotation_angle' : getValue(`events.touch.rotation_angle`),
    'events.touch.force' : getValue(`events.touch.force`),
    'user_agent' : getValue(`user_agent`),
    'navigator_language' : getValue(`navigator_language`),
    'navigator_languages' : getValue(`navigator_languages`),
    'navigator_languages.languages_is_not_undefined' : getValue(`navigator_languages.languages_is_not_undefined`),
    'navigator_languages.languages' : getValue(`navigator_languages.languages`),
    'timestamps' : getValue(`timestamps`),
    'timestamps.date_get_time' : getValue(`timestamps.date_get_time`),
    'timestamps.file_last_modified' : getValue(`timestamps.file_last_modified`),
    'timestamps.performance_now' : getValue(`timestamps.performance_now`),
    'timestamps.document_timeline' : getValue(`timestamps.document_timeline`),
    'timestamps.performance_timing' : getValue(`timestamps.performance_timing`),
    'window_size' : getValue(`window_size`),
    'window_size.window_screen_width' : getValue(`window_size.window_screen_width`),
    'window_size.window_screen_height' : getValue(`window_size.window_screen_height`),
    'window_size.window_screen_avail_height' : getValue(`window_size.window_screen_avail_height`),
    'window_size.window_screen_avail_left' : getValue(`window_size.window_screen_avail_left`),
    'window_size.window_screen_avail_top' : getValue(`window_size.window_screen_avail_top`),
    'window_size.window_screen_avail_width' : getValue(`window_size.window_screen_avail_width`),
    'window_size.window_screen_pixel_depth' : getValue(`window_size.window_screen_pixel_depth`),
    'window_size.window_inner_width' : getValue(`window_size.window_inner_width`),
    'window_size.window_inner_height' : getValue(`window_size.window_inner_height`),
    'window_size.window_outer_width' : getValue(`window_size.window_outer_width`),
    'window_size.window_outer_height' : getValue(`window_size.window_outer_height`),
    'window_size.window_device_pixel_ratio' : getValue(`window_size.window_device_pixel_ratio`),
    'window_size.window_screen_orientation_type' : getValue(`window_size.window_screen_orientation_type`),
    'window_size.window_screenX' : getValue(`window_size.window_screenX`),
    'window_size.window_screenY' : getValue(`window_size.window_screenY`),
    'date_get_time_zone_off_set' : getValue(`date_get_time_zone_off_set`),
    'has_indexed_db' : getValue(`has_indexed_db`),
    'has_body_add_behaviour' : getValue(`has_body_add_behaviour`),
    'open_database' : getValue(`open_database`),
    'cpu_class' : getValue(`cpu_class`),
    'platform' : getValue(`platform`),
    'do_not_track' : getValue(`do_not_track`),
    'plugins_or_active_x_object' : getValue(`plugins_or_active_x_object`),
    'plugins_named_item_item_refresh' : getValue(`plugins_named_item_item_refresh`),
    'plugins_named_item_item_refresh.named_item' : getValue(`plugins_named_item_item_refresh.named_item`),
    'plugins_named_item_item_refresh.item' : getValue(`plugins_named_item_item_refresh.item`),
    'plugins_named_item_item_refresh.refresh' : getValue(`plugins_named_item_item_refresh.refresh`),
    'canvas_hash' : getValue(`canvas_hash`),
    'canvas_hash.is_point_in_path' : getValue(`canvas_hash.is_point_in_path`),
    'canvas_hash.to_data_url_image' : getValue(`canvas_hash.to_data_url_image`),
    'canvas_hash.screen_is_global_composite_operation' : getValue(`canvas_hash.screen_is_global_composite_operation`),
    'canvas_hash.hash' : getValue(`canvas_hash.hash`),
    'webgl' : getValue(`webgl`),
    'webgl.canvas_hash' : getValue(`webgl.canvas_hash`),
    'webgl.get_supported_extensions' : getValue(`webgl.get_supported_extensions`),
    'webgl.aliased_line_width_range' : getValue(`webgl.aliased_line_width_range`),
    'webgl.aliased_point_size_range' : getValue(`webgl.aliased_point_size_range`),
    'webgl.alpha_bits' : getValue(`webgl.alpha_bits`),
    'webgl.antialias' : getValue(`webgl.antialias`),
    'webgl.blue_bits' : getValue(`webgl.blue_bits`),
    'webgl.depth_bits' : getValue(`webgl.depth_bits`),
    'webgl.green_bits' : getValue(`webgl.green_bits`),
    'webgl.all_bits' : getValue(`webgl.all_bits`),
    'webgl.max_combined_texture_image_units' : getValue(`webgl.max_combined_texture_image_units`),
    'webgl.max_cube_map_texture_size' : getValue(`webgl.max_cube_map_texture_size`),
    'webgl.max_fragment_uniform_vectors' : getValue(`webgl.max_fragment_uniform_vectors`),
    'webgl.max_renderbuffer_size' : getValue(`webgl.max_renderbuffer_size`),
    'webgl.max_texture_image_units' : getValue(`webgl.max_texture_image_units`),
    'webgl.max_texture_size' : getValue(`webgl.max_texture_size`),
    'webgl.max_varying_vectors' : getValue(`webgl.max_varying_vectors`),
    'webgl.max_vertex_attribs' : getValue(`webgl.max_vertex_attribs`),
    'webgl.max_vertex_texture_image_units' : getValue(`webgl.max_vertex_texture_image_units`),
    'webgl.max_vertex_uniform_vectors' : getValue(`webgl.max_vertex_uniform_vectors`),
    'webgl.max_viewport_dims' : getValue(`webgl.max_viewport_dims`),
    'webgl.red_bits' : getValue(`webgl.red_bits`),
    'webgl.renderer' : getValue(`webgl.renderer`),
    'webgl.shading_language_version' : getValue(`webgl.shading_language_version`),
    'webgl.stencil_bits' : getValue(`webgl.stencil_bits`),
    'webgl.vendor' : getValue(`webgl.vendor`),
    'webgl.version' : getValue(`webgl.version`),
    'webgl.shader_precision_vertex_high_float' : getValue(`webgl.shader_precision_vertex_high_float`),
    'webgl.shader_precision_vertex_high_float_min' : getValue(`webgl.shader_precision_vertex_high_float_min`),
    'webgl.shader_precision_vertex_high_float_max' : getValue(`webgl.shader_precision_vertex_high_float_max`),
    'webgl.shader_precision_vertex_medium_float' : getValue(`webgl.shader_precision_vertex_medium_float`),
    'webgl.shader_precision_vertex_medium_float_min' : getValue(`webgl.shader_precision_vertex_medium_float_min`),
    'webgl.shader_precision_vertex_medium_float_max' : getValue(`webgl.shader_precision_vertex_medium_float_max`),
    'webgl.shader_precision_vertex_low_float' : getValue(`webgl.shader_precision_vertex_low_float`),
    'webgl.shader_precision_vertex_low_float_min' : getValue(`webgl.shader_precision_vertex_low_float_min`),
    'webgl.shader_precision_vertex_low_float_max' : getValue(`webgl.shader_precision_vertex_low_float_max`),
    'webgl.shader_precision_fragment_high_float' : getValue(`webgl.shader_precision_fragment_high_float`),
    'webgl.shader_precision_fragment_high_float_min' : getValue(`webgl.shader_precision_fragment_high_float_min`),
    'webgl.shader_precision_fragment_high_float_max' : getValue(`webgl.shader_precision_fragment_high_float_max`),
    'webgl.shader_precision_fragment_medium_float' : getValue(`webgl.shader_precision_fragment_medium_float`),
    'webgl.shader_precision_fragment_medium_float_min' : getValue(`webgl.shader_precision_fragment_medium_float_min`),
    'webgl.shader_precision_fragment_medium_float_max' : getValue(`webgl.shader_precision_fragment_medium_float_max`),
    'webgl.shader_precision_fragment_low_float' : getValue(`webgl.shader_precision_fragment_low_float`),
    'webgl.shader_precision_fragment_low_float_min' : getValue(`webgl.shader_precision_fragment_low_float_min`),
    'webgl.shader_precision_fragment_low_float_max' : getValue(`webgl.shader_precision_fragment_low_float_max`),
    'webgl.shader_precision_vertex_high_int' : getValue(`webgl.shader_precision_vertex_high_int`),
    'webgl.shader_precision_vertex_high_int_min' : getValue(`webgl.shader_precision_vertex_high_int_min`),
    'webgl.shader_precision_vertex_high_int_max' : getValue(`webgl.shader_precision_vertex_high_int_max`),
    'webgl.shader_precision_vertex_medium_int' : getValue(`webgl.shader_precision_vertex_medium_int`),
    'webgl.shader_precision_vertex_medium_int_min' : getValue(`webgl.shader_precision_vertex_medium_int_min`),
    'webgl.shader_precision_vertex_medium_int_max' : getValue(`webgl.shader_precision_vertex_medium_int_max`),
    'webgl.shader_precision_vertex_low_int' : getValue(`webgl.shader_precision_vertex_low_int`),
    'webgl.shader_precision_vertex_low_int_min' : getValue(`webgl.shader_precision_vertex_low_int_min`),
    'webgl.shader_precision_vertex_low_int_max' : getValue(`webgl.shader_precision_vertex_low_int_max`),
    'webgl.shader_precision_fragment_high_int' : getValue(`webgl.shader_precision_fragment_high_int`),
    'webgl.shader_precision_fragment_high_int_min' : getValue(`webgl.shader_precision_fragment_high_int_min`),
    'webgl.shader_precision_fragment_high_int_max' : getValue(`webgl.shader_precision_fragment_high_int_max`),
    'webgl.shader_precision_fragment_medium_int' : getValue(`webgl.shader_precision_fragment_medium_int`),
    'webgl.shader_precision_fragment_medium_int_min' : getValue(`webgl.shader_precision_fragment_medium_int_min`),
    'webgl.shader_precision_fragment_medium_int_max' : getValue(`webgl.shader_precision_fragment_medium_int_max`),
    'webgl.shader_precision_fragment_low_int' : getValue(`webgl.shader_precision_fragment_low_int`),
    'webgl.shader_precision_fragment_low_int_min' : getValue(`webgl.shader_precision_fragment_low_int_min`),
    'webgl.shader_precision_fragment_low_int_max' : getValue(`webgl.shader_precision_fragment_low_int_max`),
    'webgl.unmasked_vendor_webgl' : getValue(`webgl.unmasked_vendor_webgl`),
    'webgl.unmasked_renderer_webgl' : getValue(`webgl.unmasked_renderer_webgl`),
    'webgl_meta' : getValue(`webgl_meta`),
    'webgl_meta.webgl_rendering_context_get_parameter' : getValue(`webgl_meta.webgl_rendering_context_get_parameter`),
    'webgl_meta.is_native_webgl_rendering_context_get_parameter' : getValue(`webgl_meta.is_native_webgl_rendering_context_get_parameter`),
    'touch_event' : getValue(`touch_event`),
    'touch_event.max_touch_points' : getValue(`touch_event.max_touch_points`),
    'touch_event.has_touch_event' : getValue(`touch_event.has_touch_event`),
    'touch_event.on_touch_start_is_undefined' : getValue(`touch_event.on_touch_start_is_undefined`),
    'video' : getValue(`video`),
    'video.can_play_type_video_ogg' : getValue(`video.can_play_type_video_ogg`),
    'video.can_play_type_video_mp4' : getValue(`video.can_play_type_video_mp4`),
    'video.can_play_type_video_webm' : getValue(`video.can_play_type_video_webm`),
    'audio' : getValue(`audio`),
    'audio.can_play_type_audio_ogg' : getValue(`audio.can_play_type_audio_ogg`),
    'audio.can_play_type_audio_mpeg' : getValue(`audio.can_play_type_audio_mpeg`),
    'audio.can_play_type_audio_wav' : getValue(`audio.can_play_type_audio_wav`),
    'audio.can_play_type_audio_xm4a' : getValue(`audio.can_play_type_audio_xm4a`),
    'navigator_vendor' : getValue(`navigator_vendor`),
    'navigator_product' : getValue(`navigator_product`),
    'navigator_product_sub' : getValue(`navigator_product_sub`),
    'browser' : getValue(`browser`),
    'browser.is_internet_explorer' : getValue(`browser.is_internet_explorer`),
    'browser.chrome' : getValue(`browser.chrome`),
    'browser.chrome.load_times' : getValue(`browser.chrome.load_times`),
    'browser.chrome.app' : getValue(`browser.chrome.app`),
    'browser.webdriver' : getValue(`browser.webdriver`),
    'browser.is_chrome' : getValue(`browser.is_chrome`),
    'browser.connection_rtt' : getValue(`browser.connection_rtt`),
    'window' : getValue(`window`),
    'window.history_length' : getValue(`window.history_length`),
    'window.navigator_hardware_concurrency' : getValue(`window.navigator_hardware_concurrency`),
    'window.is_window_self_not_window_top' : getValue(`window.is_window_self_not_window_top`),
    'window.is_native_navigator_get_battery' : getValue(`window.is_native_navigator_get_battery`),
    'window.console_debug_name' : getValue(`window.console_debug_name`),
    'window.is_native_console_debug' : getValue(`window.is_native_console_debug`),
    'window._phantom' : getValue(`window._phantom`),
    'window.call_phantom' : getValue(`window.call_phantom`),
    'window.empty' : getValue(`window.empty`),
    'window.persistent' : getValue(`window.persistent`),
    'window.temporary' : getValue(`window.temporary`),
    'window.performance_observer' : getValue(`window.performance_observer`),
    'window.performance_observer.supported_entry_types' : getValue(`window.performance_observer.supported_entry_types`),
    'document' : getValue(`document`),
    'document.document_location_protocol' : getValue(`document.document_location_protocol`),
    'canvas_fonts' : getValue(`canvas_fonts`),
    'document_children' : getValue(`document_children`),
    'document_children.document_script_element_children' : getValue(`document_children.document_script_element_children`),
    'document_children.document_head_element_children' : getValue(`document_children.document_head_element_children`),
    'webgl_rendering_call' : getValue(`webgl_rendering_call`),
    'webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_a' : getValue(`webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_a`),
    'webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_b' : getValue(`webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_b`),
    'webgl_rendering_call.hash' : getValue(`webgl_rendering_call.hash`),
    'window_object_get_own_property_names' : getValue(`window_object_get_own_property_names`),
    'visual_view_port' : getValue(`visual_view_port`),
    'visual_view_port.visual_view_port_width' : getValue(`visual_view_port.visual_view_port_width`),
    'visual_view_port.visual_view_port_height' : getValue(`visual_view_port.visual_view_port_height`),
    'visual_view_port.visual_view_port_scale' : getValue(`visual_view_port.visual_view_port_scale`),
    'key' : getValue(`key`),
    'key_value' : getValue(`key_value`),
  };
}

function extractStAndSr(ast) {
  const mainFuncPath = ast.program.body[0].expression.callee.body.body.slice(-2)[0];

  let st = null;
  let sr = null;

  mainFuncPath.body.body[0].expression.right.body.body[0].handler.body.body.forEach((n) => {

    if (n.type === `ExpressionStatement` && n.expression.type === `CallExpression`) {
      return;
    }

    const key = n.expression.left.property.value;

    if (key === `st`) {
      st = n.expression.right.value;
    } else if (key === `sr`) {
      sr = n.expression.right.value;
    }

  });

  return {
    st,
    sr
  };

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
