const t = require(`@babel/types`);
const generate = require(`@babel/generator`).default;

function getPropertyValue(p){

  if(p.type === `Identifier`){
    return p.node.name;
  }else if(p.type === `StringLiteral`){
    return p.node.value;
  }

}

function findFirstBtoaBackwards(p) {

  let _p = p;

  while(_p.node !== undefined){

    const code = generate(_p.node).code;

    if(code.match(/var (.*?) = window\.btoa\((.*?).join\((""|'')\)\);/)){
      return _p;
    }

    _p = _p.getPrevSibling();
  }
};


function findFirstBtoaForwards(p) {

  let _p = p;

  while(_p.node !== undefined){

    const code = generate(_p.node).code;

    if(code.match(/var (.*?) = window\.btoa\((.*?).join\((""|'')\)\);/)){
      return _p;
    }

    _p = _p.getNextSibling();
  }
};

const findFirstTryBackwards = (p) => {
  let _p = p;
  while(_p.node !== undefined){

    if(_p.type === `TryStatement`){
      return _p;
    }
    _p = _p.getPrevSibling();
  }
};


function hasValueInCode({code, valueToFind, mode}){

  let hasBeenFound = false;

  switch(mode){
    case `endsWith`:
      hasBeenFound = code.endsWith(valueToFind);
      break;
    case `startsWith`:
      hasBeenFound = code.startsWith(valueToFind);
      break;
    case `includes`:
      hasBeenFound = code.includes(valueToFind);
      break;
    case `regex`:
      hasBeenFound = code.match(valueToFind) !== null;
      break;
  }

  return hasBeenFound;

}

function getPropertyValueInAssignment({path, siblingKey}){

  const statementParent = path.getStatementParent();
  const nextPath = statementParent.getSibling(statementParent.key + siblingKey);

  if(!
  (nextPath.type === `ExpressionStatement` && nextPath.get(`expression`).type === `AssignmentExpression` &&
    nextPath.get(`expression.left`).type === `MemberExpression` &&
    (
      (nextPath.get(`expression.left.property`).type === `StringLiteral` && nextPath.get(`expression.left.computed`).node) ||
      (nextPath.get(`expression.left.property`).type === `Identifier` && !nextPath.get(`expression.left.computed`).node)
    )
  )
  ){
    return null;
  }

  const computed = nextPath.get(`expression.left.computed`).node;
  const foundKeyValue = nextPath.get(`expression.left.property.${computed ? `value` : `name`}`).node;

  return { value : foundKeyValue };
}

function getKeyFromDeclaration({path, valueToFind, mode, siblingKey}){

  if(path.get(`declarations`).length !== 1){
    return null;
  }

  const init = path.get(`declarations.0.init`);
  const initCode = generate(init.node).code;

  const hasBeenFound = hasValueInCode({code : initCode, valueToFind, mode});

  if(hasBeenFound){
    return getPropertyValueInAssignment({path, siblingKey});
  }

  return null;

}


function getKeyIfFound({pathQuery, path, valueToFind, mode, siblingKey}){

  const code = generate(pathQuery.node).code;
  const hasBeenFound = hasValueInCode({code, valueToFind, mode});

  if(hasBeenFound){
    return getPropertyValueInAssignment({path, siblingKey});
  }

  return null;

}

function findInVar({path, valueToFind, mode, siblingKey}){
  let found = false;
  let value = undefined;

  path.traverse({
    VariableDeclaration(varPath){
      const foundKeys = getKeyFromDeclaration({path : varPath, valueToFind, mode, siblingKey});
      if(foundKeys !== null){
        found = true;
        value = foundKeys[`value`];

      }
    }
  });

  return { found, value };

}

function findInAssignment({path, valueToFind, mode, siblingKey}){
  let found = false;
  let value = undefined;

  path.traverse({
    AssignmentExpression(assPath){
      const foundKeys = getKeyIfFound({pathQuery : assPath.get(`right`), path : assPath, valueToFind, mode, siblingKey});
      if(foundKeys !== null){
        found = true;
        value = foundKeys[`value`];

      }
    }
  });

  return { found, value };

}

function findInExpression({path, valueToFind, mode, siblingKey}){
  let found = false;
  let value = undefined;

  path.traverse({
    ExpressionStatement(expPath){
      const foundKeys = getKeyIfFound({pathQuery : expPath.get(`expression`), path : expPath, valueToFind, mode, siblingKey});
      if(foundKeys !== null){
        found = true;
        value = foundKeys[`value`];

      }
    }
  });

  return { found, value };

}

function findTimestampProperty({path, index}){

  let currentIndex = 0;
  let found = false;
  let value = undefined;

  path.traverse({
    ExpressionStatement(expPath){
      const code = generate(expPath.node).code;

      if(!code.endsWith(`"FINDME";`)){
        return;
      }

      if(index === currentIndex){
        found = true;
        const leftProp = expPath.get(`expression.left.property`);
        value = getPropertyValue(leftProp);
      }

      currentIndex++;
    }
  });

  return { found, value };

}
const FINDERS = {
  "events" : function(path) {
    let found = false;
    let value = undefined;
    let index = 0;

    path.traverse({
      MemberExpression(memberPath){
        const { property } = memberPath.node;

        if(t.isStringLiteral(property) && property.value === "abort" && t.isAssignmentExpression(memberPath.parentPath.node)){
          const topPath = memberPath.getStatementParent();

          for(let currentSibling = topPath;;){

            if(
              t.isExpressionStatement(currentSibling.node) && t.isCallExpression(currentSibling.node.expression) &&
              generate(currentSibling.node.expression.callee).code.endsWith(`["push"]`)
            ){
              index++;
              if(index === 2){
                value = getPropertyValue(currentSibling.getSibling(currentSibling.key + 3).get(`expression.left.property`));
                found = true;
                path.stop()
                break;
              }
            }

            currentSibling = currentSibling.getNextSibling();

            if(generate(currentSibling.node).code === ''){
              break;
            }
          }

        }
      }
    })

    return { found, value };
  },
  "events.mouse" : function(path) {
    let found = false;
    let value = undefined;
    let index = 0;

    path.traverse({
      MemberExpression(memberPath){
        const { property } = memberPath.node;

        if(t.isStringLiteral(property) && property.value === "abort" && t.isAssignmentExpression(memberPath.parentPath.node)){
          const topPath = memberPath.getStatementParent();

          for(let currentSibling = topPath;;){

            if(
              t.isExpressionStatement(currentSibling.node) && t.isCallExpression(currentSibling.node.expression) &&
              generate(currentSibling.node.expression.callee).code.endsWith(`["push"]`)
            ){
              index++;
              if(index === 1){
                value = getPropertyValue(currentSibling.getNextSibling().get(`expression.left.property`));
                found = true;
                path.stop()
                break;
              }
            }

            currentSibling = currentSibling.getNextSibling();

            if(generate(currentSibling.node).code === ''){
              break;
            }
          }

        }
      }
    })

    return { found, value };
  },
  "events.touch" : function(path) {
    let found = false;
    let value = undefined;
    let index = 0;

    path.traverse({
      MemberExpression(memberPath){
        const { property } = memberPath.node;

        if(t.isStringLiteral(property) && property.value === "abort" && t.isAssignmentExpression(memberPath.parentPath.node)){
          const topPath = memberPath.getStatementParent();

          for(let currentSibling = topPath;;){

            if(
              t.isExpressionStatement(currentSibling.node) && t.isCallExpression(currentSibling.node.expression) &&
              generate(currentSibling.node.expression.callee).code.endsWith(`["push"]`)
            ){
              index++;
              if(index === 2){
                value = getPropertyValue(currentSibling.getNextSibling().get(`expression.left.property`));
                found = true;
                path.stop()
                break;
              }
            }

            currentSibling = currentSibling.getNextSibling();

            if(generate(currentSibling.node).code === ''){
              break;
            }
          }

        }
      }
    })

    return { found, value };
  },
  "user_agent" : function(path) {
    return findInVar({path, valueToFind : `["userAgent"]`, mode : `endsWith`, siblingKey : 1});
  },
  "navigator_language" : function(path) {
    return findInVar({path, valueToFind : `["language"]`, mode : `endsWith`, siblingKey : 1});
  },
  "navigator_languages" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      ExpressionStatement(expPath){

        const code = generate(expPath.node).code;

        if(!code.endsWith(`window["screen"]["width"];`)){
          return;
        }

        let currentPath = expPath;
        for(;;){
          if(generate(currentPath.node).code.indexOf(`xorShift128`) !== -1){
            break;
          }

          currentPath = currentPath.getPrevSibling();
        }

        found = true;
        const leftProp = currentPath.getPrevSibling().get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "navigator_languages.languages_is_not_undefined" : function(path) {
    return findInAssignment({path, valueToFind : `"languages") !== undefined`, mode : `endsWith`, siblingKey : 0});
  },
  "navigator_languages.languages" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      IfStatement(ifPath){

        const code = generate(ifPath.node.test).code;

        if(!code.endsWith(`window["navigator"]["languages"] !== undefined`)){
          return;
        }
        found = true;
        const leftProp = ifPath.get(`consequent.body`).slice(-1)[0].get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "timestamps" : function(path){
    let found = false;
    let value = undefined;
    path.traverse({
      ExpressionStatement(expPath){
        const code = generate(expPath.node).code;

        if(!code.endsWith(`window["screen"]["width"];`)){
          return;
        }

        found = true;

        const leftProp = findFirstBtoaBackwards(expPath).getNextSibling().get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };

  },
  "timestamps.date_get_time" : function(path){
    return findTimestampProperty({path, index : 0});
  },
  "timestamps.file_last_modified" : function(path){
    return findTimestampProperty({path, index : 1});
  },
  "timestamps.performance_now" : function(path){
    return findTimestampProperty({path, index : 2});
  },
  "timestamps.document_timeline" : function(path){
    return findTimestampProperty({path, index : 3});
  },
  "timestamps.performance_timing" : function(path){
    return findTimestampProperty({path, index : 4});
  },
  "window_size" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      VariableDeclaration(varPath){

        const code = generate(varPath.node).code;

        if(!code.endsWith(`new window["Date"]()["getTimezoneOffset"]() / -60;`)){
          return;
        }

        found = true;
        const leftProp = findFirstBtoaBackwards(varPath).getNextSibling().get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "window_size.window_screen_width" : function(path) {
    return findInAssignment({path, valueToFind : `window["screen"]["width"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window_size.window_screen_height" : function(path) {
    return findInAssignment({path, valueToFind : `window["screen"]["height"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window_size.window_screen_avail_height" : function(path) {
    return findInAssignment({path, valueToFind : `window["screen"]["availHeight"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window_size.window_screen_avail_left" : function(path) {
    return findInAssignment({path, valueToFind : `window["screen"]["availLeft"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window_size.window_screen_avail_top" : function(path) {
    return findInAssignment({path, valueToFind : `window["screen"]["availTop"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window_size.window_screen_avail_width" : function(path) {
    return findInAssignment({path, valueToFind : `window["screen"]["availWidth"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window_size.window_screen_pixel_depth" : function(path) {
    return findInAssignment({path, valueToFind : `window["screen"]["pixelDepth"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window_size.window_inner_width" : function(path) {
    return findInAssignment({path, valueToFind : `window["innerWidth"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window_size.window_inner_height" : function(path) {
    return findInAssignment({path, valueToFind : `window["innerHeight"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window_size.window_outer_width" : function(path) {
    return findInAssignment({path, valueToFind : `window["outerWidth"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window_size.window_outer_height" : function(path) {
    return findInAssignment({path, valueToFind : `window["outerHeight"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window_size.window_device_pixel_ratio" : function(path) {
    return findInAssignment({path, valueToFind : `["devicePixelRatio"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window_size.window_screen_orientation_type" : function(path) {
    return findInAssignment({path, valueToFind : `["screen"]["orientation"]["type"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window_size.window_screenX" : function(path) {
    return findInAssignment({path, valueToFind : `window["screenX"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window_size.window_screenY" : function(path) {
    return findInAssignment({path, valueToFind : `window["screenY"]`, mode : `endsWith`, siblingKey : 0});
  },
  "date_get_time_zone_off_set" : function(path) {
    return findInVar({path, valueToFind : `new window["Date"]()["getTimezoneOffset"]() / -60`, mode : `endsWith`, siblingKey : 1});
  },
  "has_indexed_db" : function(path) {

    let found = false, value = undefined;

    path.traverse({
      TryStatement(tryPath){
        const block = tryPath.get(`block`);

        const nodeCode = generate(block.get(`body.0`).node).code;

        if(nodeCode.endsWith(`["indexedDB"] ? true : false;`)){
          found = true;
          const leftProp = tryPath.getSibling(tryPath.key + 2).get(`expression.left.property`);
          value = getPropertyValue(leftProp);

        }

      }
    });

    return { found, value };
  },
  "has_body_add_behaviour" : function(path) {
    return findInVar({path, valueToFind : `["body"]["addBehavior"] ? true : false`, mode : `endsWith`, siblingKey : 1});
  },
  "open_database" : function(path) {
    return findInVar({path, valueToFind : `["openDatabase"] ? true : false`, mode : `endsWith`, siblingKey : 1});
  },
  "cpu_class" : function(path) {
    return findInVar({path, valueToFind : `["cpuClass"]`, mode : `endsWith`, siblingKey : 2});
  },
  "platform" : function(path) {
    return findInVar({path, valueToFind : `["platform"]`, mode : `endsWith`, siblingKey : 2});
  },
  "do_not_track" : function(path) {
    return findInVar({path, valueToFind : `["doNotTrack"]`, mode : `endsWith`, siblingKey : 2});
  },
  "plugins_or_active_x_object" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      ExpressionStatement(expPath){
        const code = generate(expPath.node).code;

        if(!code.endsWith(`["stopInternal"]("plugins");`)){
          return;
        }

        found = true;
        const leftProp = expPath.getSibling(expPath.key + 2).get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "plugins_named_item_item_refresh" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      ExpressionStatement(expPath){

        const code = generate(expPath.node).code;

        if(!code.endsWith(`["startInternal"]("canvas_d");`)){
          return;
        }

        found = true;
        const leftProp = expPath.getPrevSibling().get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "plugins_named_item_item_refresh.named_item" : function(path) {
    let found = false, value = undefined;

    path.traverse({
      TryStatement(tryPath){
        const block = tryPath.get(`block.body`);

        if(block.length !== 3){
          return;
        }
        const line = block[0];
        const nodeCode = generate(line.node).code;

        if(nodeCode.endsWith(`window["navigator"]["plugins"]["namedItem"]["name"];`)){
          found = true;
          const leftProp = line.get(`expression.left.property`);
          value = getPropertyValue(leftProp);

        }

      }
    });

    return { found, value };
  },
  "plugins_named_item_item_refresh.item" : function(path) {
    let found = false, value = undefined;

    path.traverse({
      TryStatement(tryPath){
        const block = tryPath.get(`block.body`);

        if(block.length !== 3){
          return;
        }
        const line = block[1];
        const nodeCode = generate(line.node).code;

        if(nodeCode.endsWith(`window["navigator"]["plugins"]["item"]["name"];`)){
          found = true;
          const leftProp = line.get(`expression.left.property`);
          value = getPropertyValue(leftProp);
        }

      }
    });

    return { found, value };
  },
  "plugins_named_item_item_refresh.refresh" : function(path) {
    let found = false, value = undefined;

    path.traverse({
      TryStatement(tryPath){
        const block = tryPath.get(`block.body`);

        if(block.length !== 3){
          return;
        }
        const line = block[2];
        const nodeCode = generate(line.node).code;

        if(nodeCode.endsWith(`window["navigator"]["plugins"]["refresh"]["name"];`)){
          found = true;
          const leftProp = line.get(`expression.left.property`);
          value = getPropertyValue(leftProp);
        }

      }
    });

    return { found, value };
  },
  "canvas_hash" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      ExpressionStatement(expPath){

        const code = generate(expPath.node).code;

        if(!code.endsWith(`["stopInternal"]("canvas_o");`)){
          return;
        }

        found = true;
        const leftProp = findFirstBtoaBackwards(expPath).getNextSibling().get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "canvas_hash.is_point_in_path" : function(path) {
    return findInAssignment({path, valueToFind : `["isPointInPath"](6, 6, "evenodd") === false`, mode : `endsWith`, siblingKey : 0});
  },
  "canvas_hash.to_data_url_image" : function(path) {
    return findInAssignment({path, valueToFind : `["indexOf"]("data:image/webp")`, mode : `endsWith`, siblingKey : 0});
  },
  "canvas_hash.to_data_url_image_error" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      ExpressionStatement(expPath){
        const code = generate(expPath.node).code;

        if(!code.endsWith(`["stopInternal"]("canvas_d");`)){
          return;
        }

        found = true;
        const leftProp = expPath.getSibling(expPath.key - 1).get(`handler.body.body.0.expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "canvas_hash.screen_is_global_composite_operation" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      AssignmentExpression(assPath){
        const code = generate(assPath.node).code;

        if(!code.endsWith(`["textBaseline"] = "alphabetic"`)){
          return;
        }

        found = true;
        const leftProp = assPath.getStatementParent().getPrevSibling().get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "canvas_hash.hash" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      ExpressionStatement(expPath){

        const code = generate(expPath.node).code;

        if(!code.endsWith(`["stopInternal"]("canvas_io");`)){
          return;
        }

        found = true;
        const leftProp = findFirstBtoaBackwards(expPath).getNextSibling().get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "webgl" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      ExpressionStatement(expPath){

        const code = generate(expPath.node).code;

        if(!code.endsWith(`["stopInternal"]("webgl_o");`)){
          return;
        }

        found = true;
        const leftProp = findFirstBtoaBackwards(expPath).getNextSibling().get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "webgl.get_supported_extensions" : function(path) {
    return findInVar({path, valueToFind : `["getSupportedExtensions"]()`, mode : `endsWith`, siblingKey : 1});
  },
  "webgl.canvas_hash" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      AssignmentExpression(assPath){
        const right = assPath.get(`right`);
        const rightCode = generate(right.node).code;

        if(!rightCode.match(/(.*?)\["canvas"\]\["toDataURL"\]\(\)/)){
          return;
        }

        const tryStatement = assPath.getStatementParent().parentPath.parentPath;
        found = true;
        const leftProp = tryStatement.getPrevSibling().get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "webgl.canvas_hash_error" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      AssignmentExpression(assPath){
        const right = assPath.get(`right`);
        const rightCode = generate(right.node).code;

        if(!rightCode.match(/(.*?)\["canvas"\]\["toDataURL"\]\(\)/)){
          return;
        }

        const tryStatement = assPath.getStatementParent().parentPath.parentPath;

        found = true;
        const leftProp = tryStatement.get(`handler.body.body.0.expression.left.property`);
        value = getPropertyValue(leftProp);


      }
    });

    return { found, value };
  },
  "webgl.aliased_line_width_range" : function(path) {
    return findInAssignment({path, valueToFind : `["ALIASED_LINE_WIDTH_RANGE"]))`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.aliased_point_size_range" : function(path) {
    return findInAssignment({path, valueToFind : `["ALIASED_POINT_SIZE_RANGE"]))`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.alpha_bits" : function(path) {
    return findInAssignment({path, valueToFind : `["ALPHA_BITS"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.antialias" : function(path) {
    return findInAssignment({path, valueToFind : `["antialias"] ? true : false : null`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.blue_bits" : function(path) {
    return findInAssignment({path, valueToFind : `["BLUE_BITS"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.green_bits" : function(path) {
    return findInAssignment({path, valueToFind : `["GREEN_BITS"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.depth_bits" : function(path) {
    return findInAssignment({path, valueToFind : `["DEPTH_BITS"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.all_bits" : function(path) {
    return findInVar({path, valueToFind : `"getContextAttributes"]()`, mode : `endsWith`, siblingKey : 5});
  },
  "webgl.max_combined_texture_image_units" : function(path) {
    return findInAssignment({path, valueToFind : `["MAX_COMBINED_TEXTURE_IMAGE_UNITS"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.max_cube_map_texture_size" : function(path) {
    return findInAssignment({path, valueToFind : `["MAX_CUBE_MAP_TEXTURE_SIZE"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.max_fragment_uniform_vectors" : function(path) {
    return findInAssignment({path, valueToFind : `["MAX_FRAGMENT_UNIFORM_VECTORS"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.max_renderbuffer_size" : function(path) {
    return findInAssignment({path, valueToFind : `["MAX_RENDERBUFFER_SIZE"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.max_texture_image_units" : function(path) {
    return findInAssignment({path, valueToFind : `["MAX_TEXTURE_IMAGE_UNITS"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.max_texture_size" : function(path) {
    return findInAssignment({path, valueToFind : `["MAX_TEXTURE_SIZE"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.max_varying_vectors" : function(path) {
    return findInAssignment({path, valueToFind : `["MAX_VARYING_VECTORS"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.max_vertex_attribs" : function(path) {
    return findInAssignment({path, valueToFind : `["MAX_VERTEX_ATTRIBS"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.max_vertex_texture_image_units" : function(path) {
    return findInAssignment({path, valueToFind : `["MAX_VERTEX_TEXTURE_IMAGE_UNITS"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.max_vertex_uniform_vectors" : function(path) {
    return findInAssignment({path, valueToFind : `["MAX_VERTEX_UNIFORM_VECTORS"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.max_viewport_dims" : function(path) {
    return findInAssignment({path, valueToFind : `["MAX_VIEWPORT_DIMS"]))`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.red_bits" : function(path) {
    return findInAssignment({path, valueToFind : `["RED_BITS"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.renderer" : function(path) {
    return findInAssignment({path, valueToFind : `["RENDERER"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.shading_language_version" : function(path) {
    return findInAssignment({path, valueToFind : `["SHADING_LANGUAGE_VERSION"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.stencil_bits" : function(path) {
    return findInAssignment({path, valueToFind : `["STENCIL_BITS"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.vendor" : function(path) {
    return findInAssignment({path, valueToFind : `["VENDOR"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.version" : function(path) {
    return findInAssignment({path, valueToFind : `["VERSION"])`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl.shader_precision_vertex_low_float" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/ , mode : `regex`, siblingKey : 1});
  },
  "webgl.shader_precision_vertex_low_float_min" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/, mode : `regex`, siblingKey : 2});
  },
  "webgl.shader_precision_vertex_low_float_max" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/, mode : `regex`, siblingKey : 3});
  },
  "webgl.shader_precision_vertex_medium_float" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 1});
  },
  "webgl.shader_precision_vertex_medium_float_min" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 2});
  },
  "webgl.shader_precision_vertex_medium_float_max" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 3});
  },
  "webgl.shader_precision_vertex_high_float" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : -3});
  },
  "webgl.shader_precision_vertex_high_float_min" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : -2});
  },
  "webgl.shader_precision_vertex_high_float_max" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : -1});
  },
  "webgl.shader_precision_vertex_low_int" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 1});
  },
  "webgl.shader_precision_vertex_low_int_min" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 2});
  },
  "webgl.shader_precision_vertex_low_int_max" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 3});
  },
  "webgl.shader_precision_vertex_medium_int" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 1});
  },
  "webgl.shader_precision_vertex_medium_int_min" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 2});
  },
  "webgl.shader_precision_vertex_medium_int_max" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 3});
  },
  "webgl.shader_precision_vertex_high_int" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 1});
  },
  "webgl.shader_precision_vertex_high_int_min" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 2});
  },
  "webgl.shader_precision_vertex_high_int_max" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 3});
  },
  "webgl.shader_precision_fragment_low_float" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/, mode : `regex`, siblingKey : 1});
  },
  "webgl.shader_precision_fragment_low_float_min" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/, mode : `regex`, siblingKey : 2});
  },
  "webgl.shader_precision_fragment_low_float_max" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/, mode : `regex`, siblingKey : 3});
  },
  "webgl.shader_precision_fragment_medium_float" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 1});
  },
  "webgl.shader_precision_fragment_medium_float_min" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 2});
  },
  "webgl.shader_precision_fragment_medium_float_max" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 3});
  },
  "webgl.shader_precision_fragment_high_float" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_FLOAT"\]\)/, mode : `regex`, siblingKey : 1});
  },
  "webgl.shader_precision_fragment_high_float_min" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_FLOAT"\]\)/, mode : `regex`, siblingKey : 2});
  },
  "webgl.shader_precision_fragment_high_float_max" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_FLOAT"\]\)/, mode : `regex`, siblingKey : 3});
  },
  "webgl.shader_precision_fragment_low_int" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 1});
  },
  "webgl.shader_precision_fragment_low_int_min" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 2});
  },
  "webgl.shader_precision_fragment_low_int_max" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 3});
  },
  "webgl.shader_precision_fragment_medium_int" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 1});
  },
  "webgl.shader_precision_fragment_medium_int_min" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 2});
  },
  "webgl.shader_precision_fragment_medium_int_max" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 3});
  },
  "webgl.shader_precision_fragment_high_int" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 1});
  },
  "webgl.shader_precision_fragment_high_int_min" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 2});
  },
  "webgl.shader_precision_fragment_high_int_max" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 3});
  },
  "webgl.unmasked_vendor_webgl" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["getParameter"\]\((.*?)\["UNMASKED_VENDOR_WEBGL"\]\)/, mode : `regex`, siblingKey : 0});
  },
  "webgl.unmasked_renderer_webgl" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["getParameter"\]\((.*?)\["UNMASKED_RENDERER_WEBGL"\]\)/, mode : `regex`, siblingKey : 0});
  },
  "webgl_meta" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      ExpressionStatement(expPath){

        const code = generate(expPath.node).code;

        if(!code.endsWith(`["stopInternal"]("webgl_meta");`)){
          return;
        }

        found = true;
        const leftProp = expPath.getSibling(expPath.key + 2).get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "webgl_meta.webgl_rendering_context_get_parameter" : function(path) {
    return findInAssignment({path, valueToFind : `window["WebGLRenderingContext"]["prototype"]["getParameter"]["name"]`, mode : `endsWith`, siblingKey : 0});
  },
  "webgl_meta.is_native_webgl_rendering_context_get_parameter" : function(path) {
    return findInAssignment({path, valueToFind : `window["WebGLRenderingContext"]["prototype"]["getParameter"])`, mode : `endsWith`, siblingKey : 0});
  },
  "touch_event" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      ExpressionStatement(expPath){

        const code = generate(expPath.node).code;

        if(!code.endsWith(`["startInternal"]("video");`)){
          return;
        }

        found = true;
        const leftProp = findFirstBtoaBackwards(expPath).getNextSibling().get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "touch_event.max_touch_points" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["maxTouchPoints"\]/, mode : `regex`, siblingKey : 0});
  },
  "touch_event.has_touch_event" : function(path) {
    return findInExpression({path, valueToFind : /(.*?)\["createEvent"\]\("TouchEvent"\)/, mode : `regex`, siblingKey : 1});
  },
  "touch_event.on_touch_start_is_undefined" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["ontouchstart"\] !== undefined/, mode : `regex`, siblingKey : 0});
  },
  "video" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      ExpressionStatement(expPath){

        const code = generate(expPath.node).code;

        if(!code.endsWith(`["startInternal"]("audio");`)){
          return;
        }

        found = true;
        const leftProp = findFirstBtoaBackwards(expPath).getNextSibling().get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "video.can_play_type_video_ogg" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["canPlayType"\]\("video\/ogg; codecs=\\"theora\\""\) \|\| "nope"/, mode : `regex`, siblingKey : 0});
  },
  "video.can_play_type_video_mp4" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["canPlayType"\]\("video\/mp4; codecs=\\"avc1.42E01E\\""\) \|\| "nope"/, mode : `regex`, siblingKey : 0});
  },
  "video.can_play_type_video_webm" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["canPlayType"\]\("video\/webm; codecs=\\"vp8, vorbis\\""\) \|\| "nope"/, mode : `regex`, siblingKey : 0});
  },
  "audio" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      ExpressionStatement(expPath){

        const code = generate(expPath.node).code;

        if(!code.endsWith(`["stopInternal"]("audio");`)){
          return;
        }

        found = true;

        const leftProp = findFirstBtoaForwards(expPath).getNextSibling().get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "audio.can_play_type_audio_ogg" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["canPlayType"\]\("audio\/ogg; codecs=\\"vorbis\\""\) \|\| "nope"/, mode : `regex`, siblingKey : 0});
  },
  "audio.can_play_type_audio_mpeg" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["canPlayType"\]\("audio\/mpeg"\) \|\| "nope"/, mode : `regex`, siblingKey : 0});
  },
  "audio.can_play_type_audio_wav" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["canPlayType"\]\("audio\/wav; codecs=\\"1\\""\) \|\| "nope"/, mode : `regex`, siblingKey : 0});
  },
  "audio.can_play_type_audio_xm4a" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["canPlayType"\]\("audio\/x-m4a;"\) \|\| (.*?)\["canPlayType"\]\("audio\/aac;"\) \|\| "nope"/, mode : `regex`, siblingKey : 0});
  },
  "navigator_vendor" : function(path){
    return findInVar({path, valueToFind : /(.*?)\["vendor"\]/, mode : `regex`, siblingKey : 1});
  },
  "navigator_product" : function(path) {
    return findInVar({path, valueToFind : /(.*?)\["product"\]/, mode : `regex`, siblingKey : 1});
  },
  "navigator_product_sub" : function(path) {
    return findInVar({path, valueToFind : /(.*?)\["productSub"\]/, mode : `regex`, siblingKey : 1});
  },
  "browser" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      ExpressionStatement(expPath){

        const code = generate(expPath.node).code;

        if(!code.endsWith(`window["self"] !== window["top"];`)){
          return;
        }

        found = true;
        const leftProp = findFirstBtoaBackwards(expPath).getNextSibling().get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "browser.is_internet_explorer" : function(path) {
    return findInVar({path, valueToFind : /"Netscape" \&\& (.*?)\["test"\]\((.*?)\["userAgent"\]\)/, mode : `regex`, siblingKey : 1});
  },
  "browser.is_chrome" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      VariableDeclaration(varPath){

        const code = generate(varPath.node).code;

        if(!code.endsWith(`["webdriver"] ? true : false;`)){
          return;
        }

        found = true;
        const leftProp = varPath.getSibling(varPath.key+2).get(`consequent.body.0.expression.left.property`);
        value = getPropertyValue(leftProp);

      }

    });

    return { found, value };
  },
  "browser.chrome" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      VariableDeclaration(varPath){

        const code = generate(varPath.node).code;

        if(!code.endsWith(`["webdriver"] ? true : false;`)){
          return;
        }

        found = true;
        const leftProp = varPath.getSibling(varPath.key-1).get(`consequent.body.0.block.body`).slice(-1)[0].get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }

    });

    return { found, value };
  },
  "browser.chrome.load_times" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["loadTimes"\]/, mode : `regex`, siblingKey : 0});
  },
  "browser.chrome.app" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      VariableDeclaration(varPath){

        const code = generate(varPath.node).code;

        if(!code.endsWith(`["app"];`)){
          return;
        }

        found = true;
        const leftProp = varPath.getSibling(varPath.key+1).get(`consequent.body`).slice(-1)[0].get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }

    });
    return { found, value };
  },
  "browser.webdriver" : function(path) {
    return findInVar({path, valueToFind : /(.*?)\["webdriver"\] \? true : false/, mode : `regex`, siblingKey : 1});
  },
  "browser.connection_rtt" : function(path){
    return findInAssignment({path, valueToFind : /(.*?)\["connection"\]\["rtt"\]/, mode : `regex`, siblingKey : 0});
  },
  "window" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      ExpressionStatement(expPath){

        const code = generate(expPath.node).code;

        if(!code.endsWith(`["startInternal"]("canvas_fonts");`)){
          return;
        }
        found = true;
        const leftProp = expPath.getSibling(expPath.key - 5).get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "window.history_length" : function(path) {
    return findInAssignment({path, valueToFind : /window\["history"\]\["length"\]/, mode : `regex`, siblingKey : 0});
  },
  "window.navigator_hardware_concurrency" : function(path) {
    return findInAssignment({path, valueToFind : /window\["navigator"\]\["hardwareConcurrency"\]/, mode : `regex`, siblingKey : 0});
  },
  "window.is_window_self_not_window_top" : function(path) {
    return findInAssignment({path, valueToFind : `window["self"] !== window["top"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window.is_native_navigator_get_battery" : function(path) {
    return findInAssignment({path, valueToFind : /window\["navigator"\]\["getBattery"\]/, mode : `regex`, siblingKey : 0});
  },
  "window.console_debug_name" : function(path) {
    return findInAssignment({path, valueToFind : /window\["console"\]\["debug"\]\["name"\]/, mode : `regex`, siblingKey : 0});
  },
  "window.is_native_console_debug" : function(path) {
    return findInAssignment({path, valueToFind : /window\["console"\]\["debug"\]\)/, mode : `regex`, siblingKey : 0});
  },
  "window._phantom" : function(path) {
    return findInAssignment({path, valueToFind : /window\["_phantom"\] \!== undefined/, mode : `regex`, siblingKey : 0});
  },
  "window.call_phantom" : function(path) {
    return findInAssignment({path, valueToFind : /window\["callPhantom"\] \!== undefined/, mode : `regex`, siblingKey : 0});
  },
  "window.empty" : function(path) {
    return findInAssignment({path, valueToFind : /window\["callPhantom"\] \!== undefined/, mode : `regex`, siblingKey : 3});
  },
  "window.persistent" : function(path) {
    return findInAssignment({path, valueToFind : `window["PERSISTENT"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window.temporary" : function(path) {
    return findInAssignment({path, valueToFind : `window["TEMPORARY"]`, mode : `endsWith`, siblingKey : 0});
  },
  "window.performance_observer" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      IfStatement(ifPath){

        const code = generate(ifPath.node.test).code;

        if(!code.endsWith(`["PerformanceObserver"] !== undefined`)){
          return;
        }
        found = true;
        const leftProp = ifPath.get(`consequent.body`).slice(-1)[0].get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "window.performance_observer.supported_entry_types" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      IfStatement(ifPath){

        const code = generate(ifPath.node.test).code;

        if(!code.startsWith(`window["PerformanceObserver"]["supportedEntryTypes"]`)){
          return;
        }

        const leftProp = ifPath.get(`consequent.body`).slice(-1)[0].get(`expression.left.property`);
        value = getPropertyValue(leftProp);
        found = true;

      }
    });

    return { found, value };
  },
  "document" : function(path) {
    return findInExpression({path, valueToFind : /(.*?)\["startInternal"\]\("canvas_fonts"\)/, mode : `regex`, siblingKey : -1});
  },
  "document.document_location_protocol" : function(path) {
    return findInAssignment({path, valueToFind : /(.*?)\["location"\]\["protocol"\]/, mode : `regex`, siblingKey : 0});
  },
  "canvas_fonts" : function(path) {
    return findInExpression({path, valueToFind : /(.*?)\["stopInternal"\]\("canvas_fonts"\)/, mode : `regex`, siblingKey : 2});
  },
  "document_children" : function(path) {
    return findInExpression({path, valueToFind : /(.*?)\["stopInternal"\]\("canvas_fonts"\)/, mode : `regex`, siblingKey : 7});
  },
  "document_children.document_script_element_children" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      ForInStatement(forPath){

        const code = generate(forPath.get(`right`).node).code;

        if(!(code.endsWith(`window["document"]["documentElement"]["children"]`))){
          return;
        }

        found = true;
        const leftProp = forPath.getSibling(forPath.key + 2).get(`expression.left.property`);
        value = getPropertyValue(leftProp);
      }
    });

    return { found, value };
  },
  "document_children.document_head_element_children" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      ForInStatement(forPath){

        const code = generate(forPath.get(`right`).node).code;

        if(!(code.endsWith(`window["document"]["head"]["children"]`))){
          return;
        }

        found = true;
        const leftProp = forPath.getSibling(forPath.key + 2).get(`expression.left.property`);
        value = getPropertyValue(leftProp);
      }
    });

    return { found, value };
  },
  "webgl_rendering_call" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      VariableDeclaration(varPath){

        const code = generate(varPath.node).code;

        if(!code.endsWith(`window["Object"]["getOwnPropertyNames"](window);`)){
          return;
        }

        found = true;
        const leftProp = findFirstBtoaBackwards(varPath).getNextSibling().get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_a" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      VariableDeclaration(varPath){

        const code = generate(varPath.node).code;

        if(!code.endsWith(`window["Object"]["getOwnPropertyNames"](window);`)){
          return;
        }

        found = true;
        const leftProp = findFirstTryBackwards(varPath).getPrevSibling().getPrevSibling().get(`block.body.0.expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_b" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      VariableDeclaration(varPath){

        const code = generate(varPath.node).code;

        if(!code.endsWith(`window["Object"]["getOwnPropertyNames"](window);`)){
          return;
        }

        found = true;
        const leftProp = findFirstTryBackwards(varPath).getPrevSibling().get(`block.body.0.expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "webgl_rendering_call.hash" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      VariableDeclaration(varPath){

        const code = generate(varPath.node).code;

        if(!code.endsWith(`window["Object"]["getOwnPropertyNames"](window);`)){
          return;
        }

        found = true;
        const leftProp = findFirstTryBackwards(varPath).get(`block.body.0.expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "window_object_get_own_property_names" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      VariableDeclaration(varPath){

        const code = generate(varPath.node).code;

        if(!code.endsWith(`window["Object"]["getOwnPropertyNames"](window);`)){
          return;
        }

        found = true;
        const leftProp = findFirstBtoaForwards(varPath).getNextSibling().get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "visual_view_port" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      ExpressionStatement(expPath){

        const code = generate(expPath.node).code;

        if(!code.endsWith(`window["visualViewport"]["scale"];`)){
          return;
        }

        found = true;
        const leftProp = findFirstBtoaForwards(expPath.parentPath.parentPath.parentPath.parentPath).getNextSibling().get(`expression.left.property`);
        value = getPropertyValue(leftProp);

      }
    });

    return { found, value };
  },
  "visual_view_port.visual_view_port_width" : function(path) {
    return findInAssignment({path, valueToFind : `window["visualViewport"]["width"]`, mode : `endsWith`, siblingKey : 0});
  },
  "visual_view_port.visual_view_port_height" : function(path) {
    return findInAssignment({path, valueToFind : `window["visualViewport"]["height"]`, mode : `endsWith`, siblingKey : 0});
  },
  "visual_view_port.visual_view_port_scale" : function(path) {
    return findInAssignment({path, valueToFind : `window["visualViewport"]["scale"]`, mode : `endsWith`, siblingKey : 0});
  },
  "key" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      VariableDeclaration(varPath){

        const code = generate(varPath.node).code;

        if(!(code.match(/window\.btoa\((.*?)\.join\((""|'')\)/))){
          return;
        }

        const lastPath = varPath.getSibling(varPath.key + 2);

        if(!(
          lastPath.type === `ExpressionStatement` && lastPath.get(`expression`).type === `AssignmentExpression` &&
          lastPath.get(`expression.right`).type === `StringLiteral`)
        ){
          return;
        }

        found = true;
        const leftProp = varPath.getSibling(varPath.key + 2).get(`expression.left.property`);
        value = getPropertyValue(leftProp);
      }
    });
    return { found, value };
  },
  "key_value" : function(path) {
    let found = false;
    let value = undefined;

    path.traverse({
      VariableDeclaration(varPath){

        const code = generate(varPath.node).code;

        if(!(code.match(/window\.btoa\((.*?)\.join\((""|'')\)/))){
          return;
        }

        const lastPath = varPath.getSibling(varPath.key + 2);

        if(!(
          lastPath.type === `ExpressionStatement` && lastPath.get(`expression`).type === `AssignmentExpression` &&
          lastPath.get(`expression.right`).type === `StringLiteral`)
        ){
          return;
        }

        found = true;
        const rightProp = varPath.getSibling(varPath.key + 2).get(`expression.right`);
        value = getPropertyValue(rightProp);
      }
    });

    return { found, value };
  }
};

module.exports = FINDERS;
