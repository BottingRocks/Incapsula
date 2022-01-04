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

    if(code.match(/var (.*?) = window\.btoa\((.*?).join\(""\)\);/)){
      return _p;
    }

    _p = _p.getPrevSibling();
  }
};


function findFirstBtoaForwards(p) {

  let _p = p;

  while(_p.node !== undefined){

    const code = generate(_p.node).code;

    if(code.match(/var (.*?) = window\.btoa\((.*?).join\(""\)\);/)){
      return _p;
    }

    _p = _p.getNextSibling();
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

const FINDERS = {
  "user_agent" : {
    finder : function(path){
      return findInVar({path, valueToFind : `["userAgent"]`, mode : `endsWith`, siblingKey : 1});
    }
  },
  "navigator_language" : {
    finder : function(path){
      return findInVar({path, valueToFind : `["language"]`, mode : `endsWith`, siblingKey : 1});
    }
  },
  "navigator_languages" : {
    finder : function(path){
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
    properties : {
      "languages_is_not_undefined" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `"languages") !== undefined`, mode : `endsWith`, siblingKey : 0});
        },
      },
      "languages" : {
        finder : function(path){
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
      },
    }
  },
  "window_size" : {
    finder : function(path){
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
    properties : {
      "window_screen_width" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `window["screen"]["width"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "window_screen_height" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `window["screen"]["height"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "window_screen_avail_height" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `window["screen"]["availHeight"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "window_screen_avail_left" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `window["screen"]["availLeft"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "window_screen_avail_top" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `window["screen"]["availTop"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "window_screen_avail_width" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `window["screen"]["availWidth"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "window_screen_pixel_depth" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `window["screen"]["pixelDepth"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "window_inner_width" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `window["innerWidth"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "window_inner_height" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `window["innerHeight"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "window_outer_width" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `window["outerWidth"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "window_outer_height" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `window["outerHeight"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "window_device_pixel_ratio" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["devicePixelRatio"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "window_screen_orientation_type" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["screen"]["orientation"]["type"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "window_screenX" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `window["screenX"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "window_screenY" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `window["screenY"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
    }
  },
  "date_get_time_zone_off_set" : {
    finder : function (path){
      return findInVar({path, valueToFind : `new window["Date"]()["getTimezoneOffset"]() / -60`, mode : `endsWith`, siblingKey : 1});
    }
  },
  "has_indexed_db" : {
    finder : function (path){

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

    }
  },
  "has_body_add_behaviour" : {
    finder : function (path){
      return findInVar({path, valueToFind : `["body"]["addBehavior"] ? true : false`, mode : `endsWith`, siblingKey : 1});
    }
  },
  "open_database" : {
    finder : function (path){
      return findInVar({path, valueToFind : `["openDatabase"] ? true : false`, mode : `endsWith`, siblingKey : 1});
    }
  },
  "cpu_class" : {
    finder : function (path){
      return findInVar({path, valueToFind : `["cpuClass"]`, mode : `endsWith`, siblingKey : 2});
    }
  },
  "platform" : {
    finder : function (path){
      return findInVar({path, valueToFind : `["platform"]`, mode : `endsWith`, siblingKey : 2});
    }
  },
  "do_not_track" : {
    finder : function (path){
      return findInVar({path, valueToFind : `["doNotTrack"]`, mode : `endsWith`, siblingKey : 2});
    }
  },
  "plugins_or_active_x_object" : {
    finder : function (path){
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
    }
  },
  "plugins_named_item_item_refresh" : {
    finder : function(path){
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
    properties : {
      "named_item" : {
        finder : function (path){
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
      },
      "item" : {
        finder : function (path){
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
      },
      "refresh" : {
        finder : function (path){
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
      },
    }
  },
  "canvas_hash" : {
    finder : function(path){
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
    properties : {
      "is_point_in_path" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["isPointInPath"](6, 6, "evenodd") === false`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "to_data_url_image" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["indexOf"]("data:image/webp")`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "to_data_url_image_error" : {
        finder : function (path){
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
        }
      },
      "screen_is_global_composite_operation" : {
        finder : function (path){
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
        }
      },
      "hash" : {
        finder : function(path){
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
        }
      },
    }
  },
  "webgl" : {
    finder : function(path){
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
    properties : {
      "get_supported_extensions" : {
        finder : function(path){
          return findInVar({path, valueToFind : `["getSupportedExtensions"]()`, mode : `endsWith`, siblingKey : 1});
        }
      },
      "canvas_hash" : {
        finder : function (path){

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
        }
      },
      "canvas_hash_error" : {
        finder : function (path){

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
        }
      },
      "aliased_line_width_range" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["ALIASED_LINE_WIDTH_RANGE"]))`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "aliased_point_size_range" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["ALIASED_POINT_SIZE_RANGE"]))`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "alpha_bits" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["ALPHA_BITS"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "antialias" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["antialias"] ? true : false : null`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "blue_bits" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["BLUE_BITS"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "green_bits" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["GREEN_BITS"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "depth_bits" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["DEPTH_BITS"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "all_bits" : {
        finder : function (path){
          return findInVar({path, valueToFind : `"getContextAttributes"]()`, mode : `endsWith`, siblingKey : 5});
        }
      },
      "max_combined_texture_image_units" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["MAX_COMBINED_TEXTURE_IMAGE_UNITS"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "max_cube_map_texture_size" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["MAX_CUBE_MAP_TEXTURE_SIZE"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "max_fragment_uniform_vectors" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["MAX_FRAGMENT_UNIFORM_VECTORS"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "max_renderbuffer_size" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["MAX_RENDERBUFFER_SIZE"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "max_texture_image_units" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["MAX_TEXTURE_IMAGE_UNITS"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "max_texture_size" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["MAX_TEXTURE_SIZE"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "max_varying_vectors" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["MAX_VARYING_VECTORS"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "max_vertex_attribs" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["MAX_VERTEX_ATTRIBS"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "max_vertex_texture_image_units" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["MAX_VERTEX_TEXTURE_IMAGE_UNITS"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "max_vertex_uniform_vectors" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["MAX_VERTEX_UNIFORM_VECTORS"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "max_viewport_dims" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["MAX_VIEWPORT_DIMS"]))`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "red_bits" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["MAX_COMBINED_TEXTURE_IMAGE_UNITS"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "renderer" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["RENDERER"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "shading_language_version" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["SHADING_LANGUAGE_VERSION"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "stencil_bits" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["STENCIL_BITS"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "vendor" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["VENDOR"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "version" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `["VERSION"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "shader_precision_vertex_low_float" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/ , mode : `regex`, siblingKey : 1});
        }
      },
      "shader_precision_vertex_low_float_min" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/, mode : `regex`, siblingKey : 2});
        }
      },
      "shader_precision_vertex_low_float_max" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/, mode : `regex`, siblingKey : 3});
        }
      },
      "shader_precision_vertex_medium_float" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 1});
        }
      },
      "shader_precision_vertex_medium_float_min" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 2});
        }
      },
      "shader_precision_vertex_medium_float_max" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 3});
        }
      },
      "shader_precision_vertex_high_float" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : -3});
        }
      },
      "shader_precision_vertex_high_float_min" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : -2});
        }
      },
      "shader_precision_vertex_high_float_max" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : -1});
        }
      },
      "shader_precision_vertex_low_int" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 1});
        }
      },
      "shader_precision_vertex_low_int_min" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 2});
        }
      },
      "shader_precision_vertex_low_int_max" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 2});
        }
      },
      "shader_precision_vertex_medium_int" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 1});
        }
      },
      "shader_precision_vertex_medium_int_min" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 2});
        }
      },
      "shader_precision_vertex_medium_int_max" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 3});
        }
      },
      "shader_precision_vertex_high_int" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 1});
        }
      },
      "shader_precision_vertex_high_int_min" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 2});
        }
      },
      "shader_precision_vertex_high_int_max" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 3});
        }
      },
      "shader_precision_fragment_low_float" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/, mode : `regex`, siblingKey : 1});
        }
      },
      "shader_precision_fragment_low_float_min" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/, mode : `regex`, siblingKey : 2});
        }
      },
      "shader_precision_fragment_low_float_max" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/, mode : `regex`, siblingKey : 3});
        }
      },
      "shader_precision_fragment_medium_float" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 1});
        }
      },
      "shader_precision_fragment_medium_float_min" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 2});
        }
      },
      "shader_precision_fragment_medium_float_max" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 3});
        }
      },
      "shader_precision_fragment_high_float" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_FLOAT"\]\)/, mode : `regex`, siblingKey : 1});
        }
      },
      "shader_precision_fragment_high_float_min" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_FLOAT"\]\)/, mode : `regex`, siblingKey : 2});
        }
      },
      "shader_precision_fragment_high_float_max" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_FLOAT"\]\)/, mode : `regex`, siblingKey : 3});
        }
      },
      "shader_precision_fragment_low_int" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 1});
        }
      },
      "shader_precision_fragment_low_int_min" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 2});
        }
      },
      "shader_precision_fragment_low_int_max" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 3});
        }
      },
      "shader_precision_fragment_medium_int" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 1});
        }
      },
      "shader_precision_fragment_medium_int_min" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 2});
        }
      },
      "shader_precision_fragment_medium_int_max" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 3});
        }
      },
      "shader_precision_fragment_high_int" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 1});
        }
      },
      "shader_precision_fragment_high_int_min" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 2});
        }
      },
      "shader_precision_fragment_high_int_max" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 3});
        }
      },
      "unmasked_vendor_webgl" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["getParameter"\]\((.*?)\["UNMASKED_VENDOR_WEBGL"\]\)/, mode : `regex`, siblingKey : 0});
        }
      },
      "unmasked_renderer_webgl" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["getParameter"\]\((.*?)\["UNMASKED_RENDERER_WEBGL"\]\)/, mode : `regex`, siblingKey : 0});
        }
      }
    }
  },
  "webgl_meta" : {
    finder : function(path){
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
    properties : {
      "webgl_rendering_context_get_parameter" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `window["WebGLRenderingContext"]["prototype"]["getParameter"]["name"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "is_native_webgl_rendering_context_get_parameter" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : `window["WebGLRenderingContext"]["prototype"]["getParameter"])`, mode : `endsWith`, siblingKey : 0});
        }
      },
    }
  },
  "touch_event" : {
    finder : function(path){
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
    properties : {
      "max_touch_points" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["maxTouchPoints"\]/, mode : `regex`, siblingKey : 0});
        }
      },
      "has_touch_event" : {
        finder : function (path){
          return findInExpression({path, valueToFind : /(.*?)\["createEvent"\]\("TouchEvent"\)/, mode : `regex`, siblingKey : 1});
        }
      },
      "on_touch_start_is_undefined" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["ontouchstart"\] !== undefined/, mode : `regex`, siblingKey : 0});
        }
      },
    }
  },
  "video" : {
    finder : function(path){
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
    properties : {
      "can_play_type_video_ogg" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["canPlayType"\]\("video\/ogg; codecs=\\"theora\\""\) \|\| "nope"/, mode : `regex`, siblingKey : 0});
        }
      },
      "can_play_type_video_mp4" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["canPlayType"\]\("video\/mp4; codecs=\\"avc1.42E01E\\""\) \|\| "nope"/, mode : `regex`, siblingKey : 0});
        }
      },
      "can_play_type_video_webm" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["canPlayType"\]\("video\/webm; codecs=\\"vp8, vorbis\\""\) \|\| "nope"/, mode : `regex`, siblingKey : 0});
        }
      },
    }
  },
  "audio" : {
    finder : function(path){
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
    properties : {
      "can_play_type_audio_ogg" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["canPlayType"\]\("audio\/ogg; codecs=\\"vorbis\\""\) \|\| "nope"/, mode : `regex`, siblingKey : 0});
        }
      },
      "can_play_type_audio_mpeg" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["canPlayType"\]\("audio\/mpeg"\) \|\| "nope"/, mode : `regex`, siblingKey : 0});
        }
      },
      "can_play_type_audio_wav" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["canPlayType"\]\("audio\/wav; codecs=\\"1\\""\) \|\| "nope"/, mode : `regex`, siblingKey : 0});
        }
      },
      "can_play_type_audio_xm4a" : {
        finder : function (path){
          return findInAssignment({path, valueToFind : /(.*?)\["canPlayType"\]\("audio\/x-m4a;"\) \|\| (.*?)\["canPlayType"\]\("audio\/aac;"\) \|\| "nope"/, mode : `regex`, siblingKey : 0});
        }
      },
    }
  },
  "navigator_vendor" : {
    finder : function(path){
      return findInVar({path, valueToFind : /(.*?)\["vendor"\]/, mode : `regex`, siblingKey : 1});
    },
  },
  "navigator_product" : {
    finder : function(path){
      return findInVar({path, valueToFind : /(.*?)\["product"\]/, mode : `regex`, siblingKey : 1});
    }
  },
  "navigator_product_sub" : {
    finder : function(path){
      return findInVar({path, valueToFind : /(.*?)\["productSub"\]/, mode : `regex`, siblingKey : 1});
    }
  },
  "browser" : {
    finder : function(path){
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
    properties : {
      "is_internet_explorer" : {
        finder : function(path){
          return findInVar({path, valueToFind : /"Netscape" \&\& (.*?)\["test"\]\((.*?)\["userAgent"\]\)/, mode : `regex`, siblingKey : 1});
        }
      },
      "is_chrome" : {
        finder : function(path){
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
        }
      },
      "chrome" : {
        finder : function(path){
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
        properties : {
          "load_times" : {
            finder : function(path){
              return findInAssignment({path, valueToFind : /(.*?)\["loadTimes"\]/, mode : `regex`, siblingKey : 0});
            },
          },
          "app" : {
            finder : function(path){
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
          }
        }
      },
      "webdriver" : {
        finder : function(path){
          return findInVar({path, valueToFind : /(.*?)\["webdriver"\] \? true : false/, mode : `regex`, siblingKey : 1});
        }
      },
      "connection_rtt" : {
        finder : function(path){
          return findInAssignment({path, valueToFind : /(.*?)\["connection"\]\["rtt"\]/, mode : `regex`, siblingKey : 0});
        }
      }
    }
  },
  "window" : {
    finder : function(path){
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
    properties : {
      "history_length" : {
        finder : function(path){
          return findInAssignment({path, valueToFind : /window\["history"\]\["length"\]/, mode : `regex`, siblingKey : 0});
        }
      },
      "navigator_hardware_concurrency" : {
        finder : function(path){
          return findInAssignment({path, valueToFind : /window\["navigator"\]\["hardwareConcurrency"\]/, mode : `regex`, siblingKey : 0});
        }
      },
      "is_window_self_not_window_top" : {
        finder : function(path){
          return findInAssignment({path, valueToFind : `window["self"] !== window["top"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "is_native_navigator_get_battery" : {
        finder : function(path){
          return findInAssignment({path, valueToFind : /window\["navigator"\]\["getBattery"\]/, mode : `regex`, siblingKey : 0});
        }
      },
      "console_debug_name" : {
        finder : function(path){
          return findInAssignment({path, valueToFind : /window\["console"\]\["debug"\]\["name"\]/, mode : `regex`, siblingKey : 0});
        }
      },
      "is_native_console_debug" : {
        finder : function(path){
          return findInAssignment({path, valueToFind : /window\["console"\]\["debug"\]\)/, mode : `regex`, siblingKey : 0});
        }
      },
      "_phantom" : {
        finder : function(path){
          return findInAssignment({path, valueToFind : /window\["_phantom"\] \!== undefined/, mode : `regex`, siblingKey : 0});
        }
      },
      "call_phantom" : {
        finder : function(path){
          return findInAssignment({path, valueToFind : /window\["callPhantom"\] \!== undefined/, mode : `regex`, siblingKey : 0});
        }
      },
      "empty" : {
        finder : function(path){
          return findInAssignment({path, valueToFind : /window\["callPhantom"\] \!== undefined/, mode : `regex`, siblingKey : 3});
        }
      },
      "persistent" : {
        finder : function(path){
          return findInAssignment({path, valueToFind : `window["PERSISTENT"]`, mode : `endsWith`, siblingKey : 0});
        },
      },
      "temporary" : {
        finder : function(path){
          return findInAssignment({path, valueToFind : `window["TEMPORARY"]`, mode : `endsWith`, siblingKey : 0});
        },
      },
      "performance_observer" : {
        finder : function(path){
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
        properties : {
          "supported_entry_types" : {
            finder : function(path) {
              return findInAssignment({path, valueToFind : `window["PerformanceObserver"]["supportedEntryTypes"]`, mode : `endsWith`, siblingKey : 0});
            }
          }
        }
      },
    }
  },
  "document" : {
    finder : function(path){
      return findInExpression({path, valueToFind : /(.*?)\["startInternal"\]\("canvas_fonts"\)/, mode : `regex`, siblingKey : -1});
    },
    properties : {
      "document_location_protocol" : {
        finder : function(path){
          return findInAssignment({path, valueToFind : /(.*?)\["location"\]\["protocol"\]/, mode : `regex`, siblingKey : 0});
        }
      }
    }
  },
  "canvas_fonts" : {
    finder : function(path){
      return findInExpression({path, valueToFind : /(.*?)\["stopInternal"\]\("canvas_fonts"\)/, mode : `regex`, siblingKey : 2});
    },
  },
  "document_children" : {
    finder : function(path){
      return findInExpression({path, valueToFind : /(.*?)\["stopInternal"\]\("canvas_fonts"\)/, mode : `regex`, siblingKey : 7});
    },
    properties : {
      "document_script_element_children" : {
        finder : function(path){
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
        }
      },
      "document_head_element_children" : {
        finder : function(path){
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
        }
      }
    }
  },
  "webgl_rendering_call" : {
    finder : function(path){
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

    properties : {
      "webgl_rendering_context_prototype_get_parameter_call_a" : {
        finder : function(path){
          let found = false;
          let value = undefined;

          const findFirstTryBackwards = (p) => {
            let _p = p;
            while(_p.node !== undefined){

              if(_p.type === `TryStatement`){
                return _p;
              }
              _p = _p.getPrevSibling();
            }
          };

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
        }
      },
      "webgl_rendering_context_prototype_get_parameter_call_b" : {
        finder : function(path){
          let found = false;
          let value = undefined;

          const findFirstTryBackwards = (p) => {
            let _p = p;
            while(_p.node !== undefined){

              if(_p.type === `TryStatement`){
                return _p;
              }
              _p = _p.getPrevSibling();
            }
          };

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
        }
      }
    }
  },
  "window_object_get_own_property_names" : {
    finder : function(path){
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
    }
  },
  "visual_view_port" : {
    finder : function(path){
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
    properties : {
      "visual_view_port_width" : {
        finder : function(path){
          return findInAssignment({path, valueToFind : `window["visualViewport"]["width"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "visual_view_port_height" : {
        finder : function(path){
          return findInAssignment({path, valueToFind : `window["visualViewport"]["height"]`, mode : `endsWith`, siblingKey : 0});
        }
      },
      "visual_view_port_scale" : {
        finder : function(path){
          return findInAssignment({path, valueToFind : `window["visualViewport"]["scale"]`, mode : `endsWith`, siblingKey : 0});
        }
      }
    },
  },
  "key" : {
    finder : function(path){
      let found = false;
      let value = undefined;

      path.traverse({
        VariableDeclaration(varPath){

          const code = generate(varPath.node).code;

          if(!(code.match(/window\.btoa\((.*?)\.join\(""\)/))){
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
    }
  },
  "key_value" : {
    finder : function(path){
      let found = false;
      let value = undefined;

      path.traverse({
        VariableDeclaration(varPath){

          const code = generate(varPath.node).code;

          if(!(code.match(/window\.btoa\((.*?)\.join\(""\)/))){
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
  }
};

module.exports = FINDERS;
