const t = require(`@babel/types`);
const generate = require(`@babel/generator`).default;

function getPropertyValue(p){

  if(p.type === `Identifier`){
    return p.node.name;
  }else if(p.type === `StringLiteral`){
    return p.node.value;
  }

}

function findFirstStringifyForward(p){
  let _p = p;

  while(_p.node !== undefined){

    if(!t.isVariableDeclaration(_p.node)){
      _p = _p.getNextSibling();
      continue;
    }

    const code = generate(_p.node).code;

    if(code.match(/var (.*?) = window\.JSON\.stringify\((.*?)\) {/)){
      return _p;
    }

    _p = _p.getNextSibling();
  }
}

function findFirstStringifyBackwards(p){
  let _p = p;

  while(_p.node !== undefined){

    if(!t.isVariableDeclaration(_p.node)){
      _p = _p.getPrevSibling();
      continue;
    }

    const code = generate(_p.node).code;

    if(code.match(/var (.*?) = window\.JSON\.stringify\((.*?)\) {/)){
      return _p;
    }

    _p = _p.getPrevSibling();
  }
}

function findFirstBtoaBackwards(p) {

  let _p = p;

  while(_p.node !== undefined){

    if(!t.isVariableDeclaration(_p.node)){
      _p = _p.getPrevSibling();
      continue;
    }

    const code = generate(_p.node).code;

    if(code.match(/var (.*?) = window\.btoa\((.*?).join\((""|'')\)\);/)){
      return _p;
    }

    _p = _p.getPrevSibling();
  }
};


function findFirstBtoaForward(p) {

  let _p = p;

  while(_p.node !== undefined){
    if(!t.isVariableDeclaration(_p.node)){
      _p = _p.getNextSibling();
      continue;
    }
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

const findFirstTryForward = (p) => {
  let _p = p;
  while(_p.node !== undefined){

    if(_p.type === `TryStatement`){
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



function findTimestampProperty({key,index}){

  let currentIndex = 0;
  let found = false;
  let value = undefined;

  path.traverse({
    ExpressionStatement(path){
      const code = generate(path.node).code;

      if(!code.endsWith(`"FINDME";`)){
        return;
      }

      if(index === currentIndex){
        found = true;
        const leftProp = path.get(`expression.left.property`);
        value = getPropertyValue(leftProp);
      }

      currentIndex++;
    }
  });

  return { found, value };

}

const FINDERS = {
  'events' : false,
  'events.mouse' : false,
  'events.mouse.type' : false,
  'events.mouse.timestamp' : false,
  'events.mouse.client_x' : false,
  'events.mouse.client_y' : false,
  'events.mouse.screen_x' : false,
  'events.mouse.screen_y' : false,
  'events.touch' : false,
  'events.touch.type' : false,
  'events.touch.timestamp' : false,
  'events.touch.identifier' : false,
  'events.touch.client_x' : false,
  'events.touch.client_y' : false,
  'events.touch.screen_x' : false,
  'events.touch.screen_y' : false,
  'events.touch.radius_x' : false,
  'events.touch.radius_y' : false,
  'events.touch.rotation_angle' : false,
  'events.touch.force' : false,
  'interrogator_id' : false,
  'user_agent' : false,
  'navigator_language' : false,
  'navigator_languages' : false,
  'navigator_languages.languages_is_not_undefined' : false,
  'navigator_languages.languages' : false,
  'navigator_build_id' : false,
  'timestamps' : false,
  'timestamps.date_get_time' : false,
  'timestamps.file_last_modified' : false,
  'timestamps.performance_now' : false,
  'timestamps.document_timeline' : false,
  'timestamps.performance_timing' : false,
  'mime_types' : false,
  'mime_types.suffixes' : false,
  'mime_types.type' : false,
  'mime_types.file_name' : false,
  'window_size' : false,
  'window_size.window_screen_width' : false,
  'window_size.window_screen_height' : false,
  'window_size.window_screen_avail_height' : false,
  'window_size.window_screen_avail_left' : false,
  'window_size.window_screen_avail_top' : false,
  'window_size.window_screen_avail_width' : false,
  'window_size.window_screen_pixel_depth' : false,
  'window_size.window_inner_width' : false,
  'window_size.window_inner_height' : false,
  'window_size.window_outer_width' : false,
  'window_size.window_outer_height' : false,
  'window_size.window_device_pixel_ratio' : false,
  'window_size.window_screen_orientation_type' : false,
  'window_size.window_screenX' : false,
  'window_size.window_screenY' : false,
  'date_get_time_zone_off_set' : false,
  'has_indexed_db' : false,
  'has_body_add_behaviour' : false,
  'iframe_null' : false,
  'open_database' : false,
  'cpu_class' : false,
  'platform' : false,
  'do_not_track' : false,
  'plugins_or_active_x_object' : false,
  'plugins_named_item_item_refresh' : false,
  'plugins_named_item_item_refresh.named_item' : false,
  'plugins_named_item_item_refresh.item' : false,
  'plugins_named_item_item_refresh.refresh' : false,
  'canvas_hash' : false,
  'canvas_hash.is_point_in_path' : false,
  'canvas_hash.to_data_url_image' : false,
  'canvas_hash.screen_is_global_composite_operation' : false,
  'canvas_hash.hash' : false,
  'webgl' : false,
  'webgl.canvas_hash' : false,
  'webgl.get_supported_extensions' : false,
  'webgl.aliased_line_width_range' : false,
  'webgl.aliased_point_size_range' : false,
  'webgl.alpha_bits' : false,
  'webgl.antialias' : false,
  'webgl.blue_bits' : false,
  'webgl.depth_bits' : false,
  'webgl.green_bits' : false,
  'webgl.all_bits' : false,
  'webgl.max_combined_texture_image_units' : false,
  'webgl.max_cube_map_texture_size' : false,
  'webgl.max_fragment_uniform_vectors' : false,
  'webgl.max_renderbuffer_size' : false,
  'webgl.max_texture_image_units' : false,
  'webgl.max_texture_size' : false,
  'webgl.max_varying_vectors' : false,
  'webgl.max_vertex_attribs' : false,
  'webgl.max_vertex_texture_image_units' : false,
  'webgl.max_vertex_uniform_vectors' : false,
  'webgl.max_viewport_dims' : false,
  'webgl.red_bits' : false,
  'webgl.renderer' : false,
  'webgl.shading_language_version' : false,
  'webgl.stencil_bits' : false,
  'webgl.vendor' : false,
  'webgl.version' : false,
  'webgl.shader_precision_vertex_high_float' : false,
  'webgl.shader_precision_vertex_high_float_min' : false,
  'webgl.shader_precision_vertex_high_float_max' : false,
  'webgl.shader_precision_vertex_medium_float' : false,
  'webgl.shader_precision_vertex_medium_float_min' : false,
  'webgl.shader_precision_vertex_medium_float_max' : false,
  'webgl.shader_precision_vertex_low_float' : false,
  'webgl.shader_precision_vertex_low_float_min' : false,
  'webgl.shader_precision_vertex_low_float_max' : false,
  'webgl.shader_precision_fragment_high_float' : false,
  'webgl.shader_precision_fragment_high_float_min' : false,
  'webgl.shader_precision_fragment_high_float_max' : false,
  'webgl.shader_precision_fragment_medium_float' : false,
  'webgl.shader_precision_fragment_medium_float_min' : false,
  'webgl.shader_precision_fragment_medium_float_max' : false,
  'webgl.shader_precision_fragment_low_float' : false,
  'webgl.shader_precision_fragment_low_float_min' : false,
  'webgl.shader_precision_fragment_low_float_max' : false,
  'webgl.shader_precision_vertex_high_int' : false,
  'webgl.shader_precision_vertex_high_int_min' : false,
  'webgl.shader_precision_vertex_high_int_max' : false,
  'webgl.shader_precision_vertex_medium_int' : false,
  'webgl.shader_precision_vertex_medium_int_min' : false,
  'webgl.shader_precision_vertex_medium_int_max' : false,
  'webgl.shader_precision_vertex_low_int' : false,
  'webgl.shader_precision_vertex_low_int_min' : false,
  'webgl.shader_precision_vertex_low_int_max' : false,
  'webgl.shader_precision_fragment_high_int' : false,
  'webgl.shader_precision_fragment_high_int_min' : false,
  'webgl.shader_precision_fragment_high_int_max' : false,
  'webgl.shader_precision_fragment_medium_int' : false,
  'webgl.shader_precision_fragment_medium_int_min' : false,
  'webgl.shader_precision_fragment_medium_int_max' : false,
  'webgl.shader_precision_fragment_low_int' : false,
  'webgl.shader_precision_fragment_low_int_min' : false,
  'webgl.shader_precision_fragment_low_int_max' : false,
  'webgl.unmasked_vendor_webgl' : false,
  'webgl.unmasked_renderer_webgl' : false,
  'webgl_meta' : false,
  'webgl_meta.webgl_rendering_context_get_parameter' : false,
  'webgl_meta.is_native_webgl_rendering_context_get_parameter' : false,
  'touch_event' : false,
  'touch_event.max_touch_points' : false,
  'touch_event.has_touch_event' : false,
  'touch_event.on_touch_start_is_undefined' : false,
  'video' : false,
  'video.can_play_type_video_ogg' : false,
  'video.can_play_type_video_mp4' : false,
  'video.can_play_type_video_webm' : false,
  'audio' : false,
  'audio.can_play_type_audio_ogg' : false,
  'audio.can_play_type_audio_mpeg' : false,
  'audio.can_play_type_audio_wav' : false,
  'audio.can_play_type_audio_xm4a' : false,
  'audio.can_play_type_audio_empty_array' : false,
  'audio.can_play_type_audio_mp4' : false,
  'navigator_vendor' : false,
  'navigator_product' : false,
  'navigator_product_sub' : false,
  'browser' : false,
  'browser.is_internet_explorer' : false,
  'browser.chrome' : false,
  'browser.chrome.load_times' : false,
  'browser.chrome.app' : false,
  'browser.chrome.chrome' : false,
  'browser.webdriver' : false,
  'browser.is_chrome' : false,
  'browser.connection_rtt' : false,
  'window' : false,
  'window.history_length' : false,
  'window.navigator_hardware_concurrency' : false,
  'window.is_window_self_not_window_top' : false,
  'window.is_native_navigator_get_battery' : false,
  'window.console_debug_name' : false,
  'window.is_native_console_debug' : false,
  'window._phantom' : false,
  'window.call_phantom' : false,
  'window.empty' : false,
  'window.persistent' : false,
  'window.temporary' : false,
  'window.performance_observer' : false,
  'window.performance_observer.supported_entry_types' : false,
  'document' : false,
  'document.document_location_protocol' : false,
  'canvas_fonts' : false,
  'document_children' : false,
  'document_children.document_with_src' : false,
  'document_children.document_without_src' : false,
  'document_children.document_script_element_children' : false,
  'document_children.document_head_element_children' : false,
  'document_children.document_body_element_children' : false,
  'webgl_rendering_call' : false,
  'webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_a' : false,
  'webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_b' : false,
  'webgl_rendering_call.hash' : false,
  'window_object_get_own_property_names_a' : false,
  'window_object_get_own_property_names_b' : false,
  'window_object_get_own_property_names_b.prev' : false,
  'window_object_get_own_property_names_b.next' : false,
  'window_object_get_own_property_names_last_30' : false,
  'visual_view_port' : false,
  'visual_view_port.visual_view_port_width' : false,
  'visual_view_port.visual_view_port_height' : false,
  'visual_view_port.visual_view_port_scale' : false,
  'create_html_document' : false,
  'performance_difference' : false,
  'performance_difference.btoa_a' : false,
  'performance_difference.btoa_b' : false,
  'performance_difference.dump_a' : false,
  'performance_difference.dump_b' : false,
  'tampering' : false,
  'tampering.prototype_of_navigator_vendor' : false,
  'tampering.prototype_of_navigator_mimetypes' : false,
  'tampering.prototype_of_navigator_languages' : false,
  'tampering.webgl2_rendering_context_to_string' : false,
  'tampering.function_to_string' : false,
  'tampering.prototype_of_navigator_hardware_concurrency' : false,
  'tampering.webgl2_rendering_context_get_parameter' : false,
  'tampering.prototype_of_navigator_device_memory' : false,
  'tampering.prototype_of_navigator_permissions' : false,
  'tampering.yes' : false,
  'tampering.no' : false,
  'vendor_name' : false,
  'vendor_value' : false,
  'value_vendor_name' : false,
  'value_vendor_value' : false,
};

function extractSignalKeys(ast){
  let findMeIndex = 0;
  traverse(ast, {
    VariableDeclaration(path){

      const findInVar = (({key, valueToFind, mode, siblingKey}) => {
        const foundKeys = getKeyFromDeclaration({path, valueToFind, mode, siblingKey});
        if(foundKeys !== null){
          FINDERS[key] = foundKeys['value'];
        }
      });

      findInVar({key: 'webgl.all_bits', valueToFind : `"getContextAttributes"]()`, mode : `endsWith`, siblingKey : 5});
      findInVar({key: 'user_agent', valueToFind : `["userAgent"]`, mode : `endsWith`, siblingKey : 1});
      findInVar({key: 'navigator_language', valueToFind : `["language"]`, mode : `endsWith`, siblingKey : 1});
      findInVar({key: 'date_get_time_zone_off_set', valueToFind : `new window["Date"]()["getTimezoneOffset"]() / -60`, mode : `endsWith`, siblingKey : 1});
      findInVar({key: 'open_database', valueToFind : `["openDatabase"] ? true : false`, mode : `endsWith`, siblingKey : 1});
      findInVar({key: 'cpu_class', valueToFind : `["cpuClass"]`, mode : `endsWith`, siblingKey : 2});
      findInVar({key: 'platform', valueToFind : `["platform"]`, mode : `endsWith`, siblingKey : 2});
      findInVar({key: 'do_not_track', valueToFind : `["doNotTrack"]`, mode : `endsWith`, siblingKey : 2});
      findInVar({key: 'has_body_add_behaviour', valueToFind : `["body"]["addBehavior"] ? true : false`, mode : `endsWith`, siblingKey : 1});
      findInVar({key: 'webgl.get_supported_extensions', valueToFind : `["getSupportedExtensions"]()`, mode : `endsWith`, siblingKey : 1});
      findInVar({key: 'navigator_vendor', valueToFind : /(.*?)\["vendor"\]/, mode : `regex`, siblingKey : 1});
      findInVar({key: 'navigator_product', valueToFind : /(.*?)\["product"\]/, mode : `regex`, siblingKey : 1});
      findInVar({key: 'navigator_product_sub', valueToFind : /(.*?)\["productSub"\]/, mode : `regex`, siblingKey : 1});
      findInVar({key: 'browser.is_internet_explorer', valueToFind : /"Netscape" \&\& (.*?)\["test"\]\((.*?)\["userAgent"\]\)/, mode : `regex`, siblingKey : 1});
      findInVar({key: 'browser.webdriver', valueToFind : /(.*?)\["webdriver"\] \? true : false/, mode : `regex`, siblingKey : 1});

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["userAgent"];`)){
          return;
        }

        const nextPath = path.parentPath.parentPath.parentPath.parentPath.getPrevSibling();
        const leftProp = nextPath.get(`expression.arguments.0.body.body.0.consequent.body.0.expression.left.property`);
        FINDERS['interrogator_id'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["webdriver"] ? true : false;`)){
          return;
        }

        const leftProp = path.getSibling(path.key+2).get(`consequent.body.0.expression.left.property`);
        FINDERS['browser.is_chrome'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["webdriver"] ? true : false;`)){
          return;
        }

        const leftProp = path.getSibling(path.key-1).get(`consequent.body.0.block.body`).slice(-1)[0].get(`expression.left.property`);
        FINDERS['browser.chrome'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["String"]["prototype"]["replace"];`)){
          return;
        }
        const nextPath = path.getNextSibling();
        const leftProp = findFirstBtoaForward(nextPath).getNextSibling().get(`expression.left.property`);
        FINDERS['tampering'] = getPropertyValue(leftProp);
      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["String"]["prototype"]["replace"];`)){
          return;
        }

        const nextSibling = path.getNextSibling();
        const leftProp = nextSibling.get('block.body.0.right.elements.0.elements.0');
        FINDERS['tampering.prototype_of_navigator_vendor'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["String"]["prototype"]["replace"];`)){
          return;
        }

        const nextSibling = path.getNextSibling();
        const leftProp = nextSibling.get('block.body.0.right.elements.1.elements.0');
        FINDERS['tampering.prototype_of_navigator_mimetypes'] = getPropertyValue(leftProp);
      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["String"]["prototype"]["replace"];`)){
          return;
        }

        const nextSibling = path.getNextSibling();
        const leftProp = nextSibling.get('block.body.0.right.elements.2.elements.0');
        FINDERS['tampering.prototype_of_navigator_languages'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["String"]["prototype"]["replace"];`)){
          return;
        }

        const nextSibling = path.getNextSibling();
        const leftProp = nextSibling.get('block.body.0.right.elements.3.elements.0');
        FINDERS['tampering.webgl2_rendering_context_to_string'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["String"]["prototype"]["replace"];`)){
          return;
        }

        const nextSibling = path.getNextSibling();
        const leftProp = nextSibling.get('block.body.0.right.elements.4.elements.0');
        FINDERS['tampering.function_to_string'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["String"]["prototype"]["replace"];`)){
          return;
        }

        const nextSibling = path.getNextSibling();
        const leftProp = nextSibling.get('block.body.0.right.elements.5.elements.0');
        FINDERS['tampering.prototype_of_navigator_hardware_concurrency'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["String"]["prototype"]["replace"];`)){
          return;
        }

        const nextSibling = path.getNextSibling();
        const leftProp = nextSibling.get('block.body.0.right.elements.6.elements.0');
        FINDERS['tampering.webgl2_rendering_context_get_parameter'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["String"]["prototype"]["replace"];`)){
          return;
        }

        const nextSibling = path.getNextSibling();
        const leftProp = nextSibling.get('block.body.0.right.elements.7.elements.0');
        FINDERS['tampering.prototype_of_navigator_device_memory'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["String"]["prototype"]["replace"];`)){
          return;
        }

        const nextSibling = path.getNextSibling();
        const leftProp = nextSibling.get('block.body.0.right.elements.8.elements.0');
        FINDERS['tampering.prototype_of_navigator_permissions'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["String"]["prototype"]["replace"];`)){
          return;
        }

        const nextSibling = path.getNextSibling();
        const leftProp = nextSibling.get('block.body.0.body.body.1.consequent.body.0.expression.callee.body.body.0.declarations.0.init.elements.1');
        FINDERS['tampering.no'] = getPropertyValue(leftProp);

      })();

      (() => {

        if(!code.endsWith(`["String"]["prototype"]["replace"];`)){
          return;
        }
        const nextSibling = path.getNextSibling();
        const leftProp = nextSibling.get('block.body.0.body.body.1.consequent.body.0.expression.callee.body.body.1.expression.right.body.body.0.expression.right.elements.1');
        FINDERS['tampering.yes'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["dump"];`)){
          return;
        }

        let nextPath = findFirstBtoaForward(path);
        nextPath = findFirstBtoaForward(nextPath.getNextSibling());
        nextPath = findFirstBtoaForward(nextPath);
        const leftProp = nextPath.getNextSibling().get(`expression.left.property`);
        FINDERS['vendor_name'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["dump"];`)){
          return;
        }


        let nextPath = findFirstBtoaForward(path);
        nextPath = findFirstBtoaForward(nextPath.getNextSibling());
        nextPath = findFirstBtoaForward(nextPath.getNextSibling());
        const leftProp = nextPath.getNextSibling().get(`expression.left.property`);
        FINDERS['vendor_value'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["dump"];`)){
          return;
        }

        let nextPath = findFirstStringifyForward(path);
        nextPath = findFirstStringifyForward(nextPath.getNextSibling());
        FINDERS['value_vendor_name'] = nextPath.get("declarations.0.init.arguments.0").node.value;
      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["dump"];`)){
          return;
        }

        let nextPath = findFirstStringifyForward(path);
        nextPath = findFirstStringifyForward(nextPath.getNextSibling());
        nextPath = findFirstStringifyForward(nextPath.getNextSibling());
        FINDERS['value_vendor_value'] = nextPath.get("declarations.0.init.arguments.0").node.value;
      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["dump"];`)){
          return;
        }

        const nextPath = path.parentPath.parentPath.parentPath.parentPath.getPrevSibling();
        const leftProp = nextPath.get(`expression.arguments.0.body.body`).slice(-1)[0].get(`consequent.body.0.expression.left.property`);
        FINDERS['create_html_document'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["dump"];`)){
          return;
        }

        const leftProp = path.getSibling(path.key + 5).get(`consequent.body`).slice(-1)[0].get(`expression.left.property`);
        FINDERS['performance_difference'] = getPropertyValue(leftProp);
      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["dump"];`)){
          return;
        }

        const leftProp = path.getSibling(path.key + 2).get(`block.body.6.consequent.body.1.expression.left.property`);
        FINDERS['performance_difference.dump_a'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["dump"];`)){
          return;
        }

        const leftProp = path.getSibling(path.key + 2).get(`block.body.6.consequent.body.2.expression.left.property`);
        FINDERS['performance_difference.dump_b'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["dump"];`)){
          return;
        }

        const leftProp = path.getSibling(path.key + 2).get(`block.body.6.consequent.body.8.consequent.body.0.expression.left.property`);
        FINDERS['performance_difference.btoa_a']= getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["dump"];`)){
          return;
        }

        const leftProp = path.getSibling(path.key + 2).get(`block.body.6.consequent.body.8.consequent.body.1.expression.left.property`);
        FINDERS['performance_difference'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;
        const codeNext = generate(path.getNextSibling().node).code;

        if(!code.endsWith(`window["Object"]["getOwnPropertyNames"](window);`)){
          return;
        }

        if(codeNext.endsWith(`\\\\udbff]$");`)){
          return;
        }

        const leftProp = findFirstTryBackwards(path).getPrevSibling().getPrevSibling().get(`block.body.0.expression.left.property`);
        FINDERS['webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_a']= getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;
        const codeNext = generate(path.getNextSibling().node).code;

        if(!code.endsWith(`window["Object"]["getOwnPropertyNames"](window);`)){
          return;
        }

        if(codeNext.endsWith(`\\\\udbff]$");`)){
          return;
        }

        const leftProp = findFirstTryBackwards(path).getPrevSibling().get(`block.body.0.expression.left.property`);
        FINDERS['webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_b'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;
        const codeNext = generate(path.getNextSibling().node).code;

        if(!code.endsWith(`window["Object"]["getOwnPropertyNames"](window);`)){
          return;
        }

        if(codeNext.endsWith(`\\\\udbff]$");`)){
          return;
        }

        const leftProp = findFirstTryBackwards(path).get(`block.body.0.expression.left.property`);
        FINDERS['webgl_rendering_call.hash'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;
        const codeNext = generate(path.getNextSibling().node).code;

        if(!code.endsWith(`window["Object"]["getOwnPropertyNames"](window);`)){
          return;
        }

        if(codeNext.endsWith(`\\\\udbff]$");`)){
          return;
        }

        const leftProp = findFirstBtoaForward(path).getNextSibling().get(`expression.left.property`);
        FINDERS['window_object_get_own_property_names_a'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;
        const codeNext = generate(path.getNextSibling().node).code;

        if(!code.endsWith(`window["Object"]["getOwnPropertyNames"](window);`)){
          return;
        }

        if(codeNext.endsWith(`\\\\udbff]$");`)){
          return;
        }

        const nextPath = findFirstBtoaForward(path);
        const leftProp = findFirstBtoaForward(nextPath.getNextSibling()).getNextSibling().get(`expression.left.property`);
        FINDERS['window_object_get_own_property_names_b'] = getPropertyValue(leftProp);
      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["mimeTypes"];`)){
          return;
        }

        const nextPath = path.parentPath.parentPath;
        const leftProp = findFirstBtoaForward(nextPath).getNextSibling().get(`expression.left.property`);
        FINDERS['mime_types'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["mimeTypes"];`)){
          return;
        }

        let nextPath = path.getNextSibling();
        const leftProp = nextPath.get(`body.body.1.consequent.body.0.expression.callee.body.body.0.block.body.2.expression.left.property`);
        FINDERS['mime_types.suffixes'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["mimeTypes"];`)){
          return;
        }

        let nextPath = path.getNextSibling();
        const leftProp = nextPath.get(`body.body.1.consequent.body.0.expression.callee.body.body.0.block.body.3.expression.left.property`);
        FINDERS['mime_types.type'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["mimeTypes"];`)){
          return;
        }

        let nextPath = path.getNextSibling();
        const leftProp = nextPath.get(`body.body.1.consequent.body.0.expression.callee.body.body.0.block.body.4.expression.left.property`);
        FINDERS['mime_types.file_name'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`new window["Date"]()["getTimezoneOffset"]() / -60;`)){
          return;
        }

        const leftProp = findFirstBtoaBackwards(path).getNextSibling().get(`expression.left.property`);
        FINDERS['window_size'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(code.endsWith(`["openDatabase"] ? true : false;`)){
          const leftProp = path.getSibling(path.key - 1).get(`expression.left.property`);
          FINDERS['iframe_null'] = getPropertyValue(leftProp);
        }
      })();

      (() => {
        const code = generate(path.node).code;
        const codeNext = generate(path.getNextSibling().node).code;

        if(!code.endsWith(`window["Object"]["getOwnPropertyNames"](window);`)){
          return;
        }

        if(codeNext.endsWith(`\\\\udbff]$");`)){
          return;
        }

        const leftProp = findFirstBtoaBackwards(path).getNextSibling().get(`expression.left.property`);
        FINDERS['webgl_rendering_call'] = getPropertyValue(leftProp);
      })();

      (() => {
        const code = generate(path.node).code;
        const codeNext = generate(path.getNextSibling().node).code;

        if(!code.endsWith(`window["Object"]["getOwnPropertyNames"](window);`)){
          return;
        }

        if(!codeNext.endsWith(`\\\\udbff]$");`)){
          return;
        }

        const leftProp = findFirstBtoaForward(path).getNextSibling().get(`expression.left.property`);
        FINDERS['window_object_get_own_property_names_last_30'] = getPropertyValue(leftProp);
      })();

    },
    MemberExpression(path){
      const { property } = path.node;

      (() => {

        let index = 0;
        if(t.isStringLiteral(property) && property.value === "abort" && t.isAssignmentExpression(path.parentPath.node)){
          const topPath = path.getStatementParent();

          for(let currentSibling = topPath;;){

            if(
              t.isExpressionStatement(currentSibling.node) && t.isCallExpression(currentSibling.node.expression) &&
              generate(currentSibling.node.expression.callee).code.endsWith(`["push"]`)
            ){
              index++;
              if(index === 2){
                FINDERS['events'] = getPropertyValue(currentSibling.getSibling(currentSibling.key + 3).get(`expression.left.property`));
                break;
              }
            }

            currentSibling = currentSibling.getNextSibling();

            if(generate(currentSibling.node).code === ''){
              break;
            }
          }
        }
      })();

      (() => {
        let index = 0;
        if(t.isStringLiteral(property) && property.value === "abort" && t.isAssignmentExpression(path.parentPath.node)){
          const topPath = path.getStatementParent();
          for(let currentSibling = topPath;;){

            if(
              t.isExpressionStatement(currentSibling.node) && t.isCallExpression(currentSibling.node.expression) &&
              generate(currentSibling.node.expression.callee).code.endsWith(`["push"]`)
            ){
              index++;
              if(index === 1){
                FINDERS['events.mouse'] = getPropertyValue(currentSibling.getNextSibling().get(`expression.left.property`));
                break;
              }
            }

            currentSibling = currentSibling.getNextSibling();

            if(generate(currentSibling.node).code === ''){
              break;
            }
          }

        }

      })();

      (() => {
        let index = 0;

        if(t.isStringLiteral(property) && property.value === "abort" && t.isAssignmentExpression(path.parentPath.node)){
          const topPath = path.getStatementParent();

          for(let currentSibling = topPath;;){

            if(
              t.isExpressionStatement(currentSibling.node) && t.isCallExpression(currentSibling.node.expression) &&
              generate(currentSibling.node.expression.callee).code.endsWith(`["push"]`)
            ){
              index++;
              if(index === 2){
                FINDERS['events.touch'] = getPropertyValue(currentSibling.getNextSibling().get(`expression.left.property`));
                break;
              }
            }

            currentSibling = currentSibling.getNextSibling();

            if(generate(currentSibling.node).code === ''){
              break;
            }
          }

        }

      })();

    },
    ExpressionStatement(path){

      const findInExpression = (({key, valueToFind, mode, siblingKey}) => {

        const foundKeys = getKeyIfFound({pathQuery : path.get(`expression`), path, valueToFind, mode, siblingKey});
        if(foundKeys !== null){
          FINDERS[key] = foundKeys['value'];

        }
      });
      findInExpression({key: 'touch_event.has_touch_event', valueToFind : /(.*?)\["createEvent"\]\("TouchEvent"\)/, mode : `regex`, siblingKey : 1});
      findInExpression({key: 'document', valueToFind : /(.*?)\["startInternal"\]\("canvas_fonts"\)/, mode : `regex`, siblingKey : -1});
      findInExpression({key: 'canvas_fonts', valueToFind : /(.*?)\["stopInternal"\]\("canvas_fonts"\)/, mode : `regex`, siblingKey : 2});
      findInExpression({key: 'document_children', valueToFind : /(.*?)\["stopInternal"\]\("canvas_fonts"\)/, mode : `regex`, siblingKey : 10});

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["startInternal"]("video");`)){
          return;
        }

        const leftProp = findFirstBtoaBackwards(path).getNextSibling().get(`expression.left.property`);
        FINDERS['touch_event'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["startInternal"]("audio");`)){
          return;
        }

        const leftProp = findFirstBtoaBackwards(path).getNextSibling().get(`expression.left.property`);
        FINDERS["video"] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(
          !hasValueInCode({
          code,
          valueToFind : /(.*?)\["canPlayType"\]\("video\/ogg; codecs=\\"theora/,
          mode : `regex`
        })){
          return;
        }
        const topPath = path.parentPath.parentPath;
        const leftProp = topPath.getSibling(topPath.key + 2).get(`expression.left.property`)
        FINDERS['video.can_play_type_video_ogg'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(
          !hasValueInCode({
          code,
          valueToFind : /(.*?)\["canPlayType"\]\("video\/mp4; codecs=\\"avc1.42E01E\\""/,
          mode : `regex`
        })){
          return;
        }
        const topPath = path.parentPath.parentPath;
        const leftProp = topPath.getSibling(topPath.key + 2).get(`expression.left.property`)
        FINDERS['video.can_play_type_video_mp4'] = getPropertyValue(leftProp);
      })();

      (() => {

        const code = generate(path.node).code;

        if(
          !hasValueInCode({
          code,
          valueToFind : /(.*?)\["canPlayType"\]\("video\/webm; codecs=\\"vp8, vorbis\\""/,
          mode : `regex`
        })){
          return;
        }
        const topPath = path.parentPath.parentPath;
        const leftProp = topPath.getSibling(topPath.key + 2).get(`expression.left.property`)
        FINDERS['video.can_play_type_video_webm'] = getPropertyValue(leftProp);
      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["stopInternal"]("audio");`)){
          return;
        }

        const leftProp = findFirstBtoaForward(path).getNextSibling().get(`expression.left.property`);
        FINDERS['audio'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(
          !hasValueInCode({
          code,
          valueToFind : /(.*?)\["canPlayType"\]\("audio\/ogg; codecs=\\"vorbis\\""/,
          mode : `regex`
        })){
          return;
        }
        const topPath = path.parentPath.parentPath;
        const leftProp = topPath.getSibling(topPath.key + 2).get(`expression.left.property`)
        FINDERS['audio.can_play_type_audio_ogg'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(
          !hasValueInCode({
          code,
          valueToFind : /(.*?)\["canPlayType"\]\("audio\/mpeg"/,
          mode : `regex`
        })){
          return;
        }
        const topPath = path.parentPath.parentPath;
        const leftProp = topPath.getSibling(topPath.key + 2).get(`expression.left.property`)
        FINDERS['audio.can_play_type_audio_mpeg'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(
          !hasValueInCode({
          code,
          valueToFind : /(.*?)\["canPlayType"\]\("audio\/wav; codecs=\\"1\\""/,
          mode : `regex`
        })){
          return;
        }
        const topPath = path.parentPath.parentPath;
        const leftProp = topPath.getSibling(topPath.key + 2).get(`expression.left.property`)
        FINDERS['audio.can_play_type_audio_wav'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(
          !hasValueInCode({
          code,
          valueToFind : /(.*?)\["canPlayType"\]\("audio\/x-m4a;"\) \|\| (.*?)\["canPlayType"\]\("audio\/aac;"/,
          mode : `regex`
        })){
          return;
        }
        const topPath = path.parentPath.parentPath;
        const leftProp = topPath.getSibling(topPath.key + 2).get(`expression.left.property`)
        FINDERS['audio.can_play_type_audio_xm4a'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(
          !hasValueInCode({
          code,
          valueToFind : /(.*?)\["canPlayType"\]\(\[\]\)/,
          mode : `regex`
        })){
          return;
        }

        const topPath = path.parentPath.parentPath;
        const leftProp = topPath.getSibling(topPath.key + 2).get(`expression.left.property`)
        FINDERS['audio.can_play_type_audio_empty_array'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(
          !hasValueInCode({
          code,
          valueToFind : /(.*?)\["canPlayType"\]\("video\/mp4; codecs=\\"avc1\.4D401E\\""/,
          mode : `regex`
        })){
          return;
        }
        const topPath = path.parentPath.parentPath;
        const leftProp = topPath.getSibling(topPath.key + 2).get(`expression.left.property`)
        FINDERS['audio.can_play_type_audio_mp4']= getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`window["self"] !== window["top"];`)){
          return;
        }

        const leftProp = findFirstBtoaBackwards(path).getNextSibling().get(`expression.left.property`);
        FINDERS['browser'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["loadTimes"]);`)){
          return;
        }

        const leftProp = path.getSibling(path.key+1).get(`block.body.1.consequent.body.5.expression.left.property`);
        FINDERS['browser.chrome.app'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["loadTimes"]);`)){
          return;
        }

        const leftProp = path.getSibling(path.key+2).get(`block.body.3.expression.left.property`);
        FINDERS['browser.chrome.chrome'] = getPropertyValue(leftProp);

      })(),

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`["startInternal"]("canvas_fonts");`)){
          return;
        }
        const leftProp = path.getSibling(path.key - 5).get(`expression.left.property`);
        FINDERS['window'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["stopInternal"]("webgl_meta");`)){
          return;
        }

        const leftProp = path.getSibling(path.key + 2).get(`expression.left.property`);
        FINDERS['webgl_meta'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`window["screen"]["width"];`)){
          return;
        }

        let nextPath = findFirstBtoaBackwards(path);
        nextPath = findFirstBtoaBackwards(nextPath.getPrevSibling())
        const leftProp = nextPath.getNextSibling().get(`expression.left.property`);
        FINDERS['timestamps'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node).code;

        if(!code.endsWith(`window["visualViewport"]["scale"];`)){
          return;
        }

        const leftProp = findFirstBtoaForward(path.parentPath.parentPath.parentPath.parentPath).getNextSibling().get(`expression.left.property`);
        FINDERS['visual_view_port'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["stopInternal"]("canvas_fonts");`)){
          return;
        }
        const leftProp = path.getSibling(path.key + 4).get(`expression.left.property`);
        FINDERS['document_children.document_with_src'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["stopInternal"]("canvas_fonts");`)){
          return;
        }
        const leftProp = path.getSibling(path.key + 5).get(`expression.left.property`);
        FINDERS['document_children.document_without_src'] = getPropertyValue(leftProp);
      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["stopInternal"]("webgl_o");`)){
          return;
        }

        const leftProp = findFirstBtoaBackwards(path).getNextSibling().get(`expression.left.property`);
        FINDERS['webgl'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["stopInternal"]("canvas_o");`)){
          return;
        }

        const leftProp = findFirstBtoaBackwards(path).getNextSibling().get(`expression.left.property`);
        FINDERS['canvas_hash'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["stopInternal"]("canvas_io");`)){
          return;
        }

        const leftProp = findFirstBtoaBackwards(path).getNextSibling().get(`expression.left.property`);
        FINDERS['canvas_hash.hash'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["stopInternal"]("canvas_d");`)){
          return;
        }

        const leftProp = path.getSibling(path.key - 1).get(`handler.body.body.0.expression.left.property`);
        FINDERS['canvas_hash.to_data_url_image_error'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["stopInternal"]("plugins");`)){
          return;
        }

        const leftProp = path.getSibling(path.key + 2).get(`expression.left.property`);
        FINDERS['plugins_or_active_x_object'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["startInternal"]("canvas_d");`)){
          return;
        }

        const leftProp = path.getPrevSibling().get(`expression.left.property`);
        FINDERS['plugins_named_item_item_refresh'] = getPropertyValue(leftProp);
      })();


      const code = generate(path.node).code;

      if(code.endsWith(`"FINDME";`)){
        let keyName = null;
        switch(findMeIndex){
          case 0:
            keyName = 'timestamps.date_get_time';
            break;
          case 1:
            keyName = 'timestamps.file_last_modified';
            break;
          case 2:
            keyName = 'timestamps.performance_now';
            break;
          case 3:
            keyName = 'timestamps.document_timeline';
            break;
          case 4:
            keyName = 'timestamps.performance_timing';
        }

        const leftProp = path.get(`expression.left.property`);
        FINDERS[keyName] = getPropertyValue(leftProp);

        findMeIndex++;
      }

    },
    AssignmentExpression(path){

      const findInAssignment = (({key, valueToFind, mode, siblingKey, instance = 0}) => {
        let currentInstance = 0;

        const foundKeys = getKeyIfFound({pathQuery : path.get(`right`), path, valueToFind, mode, siblingKey});
        if(foundKeys !== null){

          if(currentInstance === instance){
            FINDERS[key] = foundKeys[`value`];
          }else{
            currentInstance++;
          }
        }
      });

      findInAssignment({key : 'events.mouse.type', valueToFind : `["type"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'events.mouse.timestamp', valueToFind : `["timeStamp"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'events_mouse.client_x', valueToFind : `["clientX"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'events.mouse.client_y', valueToFind : `["clientY"]`, mode : `events_mouse_client_y'], endsWith`, siblingKey : 0});
      findInAssignment({key : 'events.mouse.screen_x', valueToFind : `["screenX"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'events.mouse.screen_y', valueToFind : `["screenY"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'events.touch.type', valueToFind : `["type"]`, mode : `endsWith`, siblingKey : 0, instance : 1});
      findInAssignment({key : 'events.touch.timestamp', valueToFind : `["timeStamp"]`, mode : `endsWith`, siblingKey : 0, instance : 1});
      findInAssignment({key : 'events.touch.identifier', valueToFind : `["identifier"]`, mode : `endsWith`, siblingKey : 0, instance : 0});
      findInAssignment({key : 'events.touch.client_x', valueToFind : `["clientX"]`, mode : `endsWith`, siblingKey : 0, instance : 1});
      findInAssignment({key : 'events.touch.client_y', valueToFind : `["clientY"]`, mode : `endsWith`, siblingKey : 0, instance : 1});
      findInAssignment({key : 'events.touch.screen_x', valueToFind : `["screenX"]`, mode : `endsWith`, siblingKey : 0, instance : 1});
      findInAssignment({key : 'events.touch.screen_y', valueToFind : `["screenY"]`, mode : `endsWith`, siblingKey : 0, instance : 1});
      findInAssignment({key : 'events.touch.radius_x', valueToFind : `["radiusX"]`, mode : `endsWith`, siblingKey : 0, instance : 0});
      findInAssignment({key : 'events.touch.radius_y', valueToFind : `["radiusY"]`, mode : `endsWith`, siblingKey : 0, instance : 0});
      findInAssignment({key : 'events.touch.rotation_angle', valueToFind : `["rotationAngle"]`, mode : `endsWith`, siblingKey : 0, instance : 0});
      findInAssignment({key : 'events.touch.force', valueToFind : `["force"]`, mode : `endsWith`, siblingKey : 0, instance : 0});
      findInAssignment({key : 'navigator_languages.languages_is_not_undefined', valueToFind : `"languages") !== undefined`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'window_size.window_screen_width', valueToFind : `window["screen"]["width"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'window_size.window_screen_height', valueToFind : `window["screen"]["height"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'window_size.window_screen_avail_height', valueToFind : `window["screen"]["availHeight"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'window_size.window_screen_avail_left', valueToFind : `window["screen"]["availLeft"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'window_size.window_screen_avail_top', valueToFind : `window["screen"]["availTop"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'window_size.window_screen_avail_width', valueToFind : `window["screen"]["availWidth"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'window_size.window_screen_pixel_depth', valueToFind : `window["screen"]["pixelDepth"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'window_size.window_inner_width', valueToFind : `window["innerWidth"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'window_size.window_inner_height', valueToFind : `window["innerHeight"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'window_size.window_outer_width', valueToFind : `window["outerWidth"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'window_size.window_outer_height', valueToFind : `window["outerHeight"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'window_size.window_device_pixel_ratio', valueToFind : `["devicePixelRatio"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'window_size.window_screen_orientation_type', valueToFind : `["screen"]["orientation"]["type"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'window_size.window_screenX', valueToFind : `window["screenX"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'window_size.window_screenY', valueToFind : `window["screenY"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.aliased_line_width_range', valueToFind : `["ALIASED_LINE_WIDTH_RANGE"]))`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.aliased_point_size_range', valueToFind : `["ALIASED_POINT_SIZE_RANGE"]))`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.alpha_bits', valueToFind : `["ALPHA_BITS"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.antialias', valueToFind : `["antialias"] ? true : false : null`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.blue_bits', valueToFind : `["BLUE_BITS"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.green_bits', valueToFind : `["GREEN_BITS"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.depth_bits', valueToFind : `["DEPTH_BITS"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.max_combined_texture_image_units', valueToFind : `["MAX_COMBINED_TEXTURE_IMAGE_UNITS"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.max_cube_map_texture_size', valueToFind : `["MAX_CUBE_MAP_TEXTURE_SIZE"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.max_fragment_uniform_vectors', valueToFind : `["MAX_FRAGMENT_UNIFORM_VECTORS"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.max_renderbuffer_size', valueToFind : `["MAX_RENDERBUFFER_SIZE"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.max_texture_image_units', valueToFind : `["MAX_TEXTURE_IMAGE_UNITS"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.max_texture_size', valueToFind : `["MAX_TEXTURE_SIZE"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.max_varying_vectors', valueToFind : `["MAX_VARYING_VECTORS"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.max_vertex_attribs', valueToFind : `["MAX_VERTEX_ATTRIBS"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.max_vertex_texture_image_units', valueToFind : `["MAX_VERTEX_TEXTURE_IMAGE_UNITS"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.max_vertex_uniform_vectors', valueToFind : `["MAX_VERTEX_UNIFORM_VECTORS"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.max_viewport_dims', valueToFind : `["MAX_VIEWPORT_DIMS"]))`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.red_bits', valueToFind : `["RED_BITS"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.renderer', valueToFind : `["RENDERER"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.shading_language_version', valueToFind : `["SHADING_LANGUAGE_VERSION"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.stencil_bits', valueToFind : `["STENCIL_BITS"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.vendor', valueToFind : `["VENDOR"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.version', valueToFind : `["VERSION"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl.shader_precision_vertex_low_float', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/ , mode : `regex`, siblingKey : 1});
      findInAssignment({key : 'webgl.shader_precision_vertex_low_float_min', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/, mode : `regex`, siblingKey : 2});
      findInAssignment({key : 'webgl.shader_precision_vertex_low_float_max', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/, mode : `regex`, siblingKey : 3});
      findInAssignment({key : 'webgl.shader_precision_vertex_medium_float', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 1});
      findInAssignment({key : 'webgl.shader_precision_vertex_medium_float_min', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 2});
      findInAssignment({key : 'webgl.shader_precision_vertex_medium_float_max', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 3});
      findInAssignment({key : 'webgl.shader_precision_vertex_high_float', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : -3});
      findInAssignment({key : 'webgl.shader_precision_vertex_high_float_min', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : -2});
      findInAssignment({key : 'webgl.shader_precision_vertex_high_float_max', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : -1});
      findInAssignment({key : 'webgl.shader_precision_vertex_low_int', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 1});
      findInAssignment({key : 'webgl.shader_precision_vertex_low_int_min', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 2});
      findInAssignment({key : 'webgl.shader_precision_vertex_low_int_max', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 3});
      findInAssignment({key : 'webgl.shader_precision_vertex_medium_int', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 1});
      findInAssignment({key : 'webgl.shader_precision_vertex_medium_int_min', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 2});
      findInAssignment({key : 'webgl.shader_precision_vertex_medium_int_max', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 3});
      findInAssignment({key : 'webgl.shader_precision_vertex_high_int', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 1});
      findInAssignment({key : 'webgl.shader_precision_vertex_high_int_min', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 2});
      findInAssignment({key : 'webgl.shader_precision_vertex_high_int_max', valueToFind : /(.*?)\["VERTEX_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 3});
      findInAssignment({key : 'webgl.shader_precision_fragment_low_float', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/, mode : `regex`, siblingKey : 1});
      findInAssignment({key : 'webgl.shader_precision_fragment_low_float_min', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/, mode : `regex`, siblingKey : 2});
      findInAssignment({key : 'webgl.shader_precision_fragment_low_float_max', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_FLOAT"\]\)/, mode : `regex`, siblingKey : 3});
      findInAssignment({key : 'webgl.shader_precision_fragment_medium_float', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 1});
      findInAssignment({key : 'webgl.shader_precision_fragment_medium_float_min', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 2});
      findInAssignment({key : 'webgl.shader_precision_fragment_medium_float_max', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_FLOAT"\]\)/, mode : `regex`, siblingKey : 3});
      findInAssignment({key : 'webgl.shader_precision_fragment_high_float', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_FLOAT"\]\)/, mode : `regex`, siblingKey : 1});
      findInAssignment({key : 'webgl.shader_precision_fragment_high_float_min', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_FLOAT"\]\)/, mode : `regex`, siblingKey : 2});
      findInAssignment({key : 'webgl.shader_precision_fragment_high_float_max', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_FLOAT"\]\)/, mode : `regex`, siblingKey : 3});
      findInAssignment({key : 'webgl.shader_precision_fragment_low_int', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 1});
      findInAssignment({key : 'webgl.shader_precision_fragment_low_int_min', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 2});
      findInAssignment({key : 'webgl.shader_precision_fragment_low_int_max', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["LOW_INT"\]\)/, mode : `regex`, siblingKey : 3});
      findInAssignment({key : 'webgl.shader_precision_fragment_medium_int', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 1});
      findInAssignment({key : 'webgl.shader_precision_fragment_medium_int_min', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 2});
      findInAssignment({key : 'webgl.shader_precision_fragment_medium_int_max', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["MEDIUM_INT"\]\)/, mode : `regex`, siblingKey : 3});
      findInAssignment({key : 'webgl.shader_precision_fragment_high_int', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 1});
      findInAssignment({key : 'webgl.shader_precision_fragment_high_int_min', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 2});
      findInAssignment({key : 'webgl.shader_precision_fragment_high_int_max', valueToFind : /(.*?)\["FRAGMENT_SHADER"\], (.*?)\["HIGH_INT"\]\)/, mode : `regex`, siblingKey : 3});
      findInAssignment({key : 'webgl.unmasked_vendor_webgl', valueToFind : /(.*?)\["getParameter"\]\((.*?)\["UNMASKED_VENDOR_WEBGL"\]\)/, mode : `regex`, siblingKey : 0});
      findInAssignment({key : 'webgl.unmasked_renderer_webgl', valueToFind : /(.*?)\["getParameter"\]\((.*?)\["UNMASKED_RENDERER_WEBGL"\]\)/, mode : `regex`, siblingKey : 0});
      findInAssignment({key : 'canvas_hash.is_point_in_path', valueToFind : `["isPointInPath"](6, 6, "evenodd") === false`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'canvas_hash.to_data_url_image', valueToFind : `["indexOf"]("data:image/webp")`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl_meta.webgl_rendering_context_get_parameter', valueToFind : `window["WebGLRenderingContext"]["prototype"]["getParameter"]["name"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key : 'webgl_meta.is_native_webgl_rendering_context_get_parameter', valueToFind : `window["WebGLRenderingContext"]["prototype"]["getParameter"])`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key: 'touch_event.max_touch_points', valueToFind : /(.*?)\["maxTouchPoints"\]/, mode : `regex`, siblingKey : 0});
      findInAssignment({key: 'touch_event.on_touch_start_is_undefined', valueToFind : /(.*?)\["ontouchstart"\] !== undefined/, mode : `regex`, siblingKey : 0});
      findInAssignment({key: 'browser.chrome.load_times', valueToFind : /(.*?)\["loadTimes"\]/, mode : `regex`, siblingKey : 0});
      findInAssignment({key: 'browser.connection_rtt', valueToFind : /(.*?)\["connection"\]\["rtt"\]/, mode : `regex`, siblingKey : 0});
      findInAssignment({key: 'window.history_length', valueToFind : /window\["history"\]\["length"\]/, mode : `regex`, siblingKey : 0});
      findInAssignment({key: 'window.navigator_hardware_concurrency', valueToFind : /window\["navigator"\]\["hardwareConcurrency"\]/, mode : `regex`, siblingKey : 0});
      findInAssignment({key: 'window.is_window_self_not_window_top', valueToFind : `window["self"] !== window["top"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key: 'window.is_native_navigator_get_battery', valueToFind : /window\["navigator"\]\["getBattery"\]/, mode : `regex`, siblingKey : 0});
      findInAssignment({key: 'window.console_debug_name', valueToFind : /window\["console"\]\["debug"\]\["name"\]/, mode : `regex`, siblingKey : 0});
      findInAssignment({key: 'window.is_native_console_debug', valueToFind : /window\["console"\]\["debug"\]\)/, mode : `regex`, siblingKey : 0});
      findInAssignment({key: 'window._phantom', valueToFind : /window\["_phantom"\] \!== undefined/, mode : `regex`, siblingKey : 0});
      findInAssignment({key: 'window.call_phantom', valueToFind : /window\["callPhantom"\] \!== undefined/, mode : `regex`, siblingKey : 0});
      findInAssignment({key: 'window.empty', valueToFind : /window\["callPhantom"\] \!== undefined/, mode : `regex`, siblingKey : 3});
      findInAssignment({key: 'window.persistent', valueToFind : `window["PERSISTENT"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key: 'window.temporary', valueToFind : `window["TEMPORARY"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key: 'document.document_location_protocol', valueToFind : /(.*?)\["location"\]\["protocol"\]/, mode : `regex`, siblingKey : 0});
      findInAssignment({key: 'visual_view_port.visual_view_port_width', valueToFind : `window["visualViewport"]["width"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key: 'visual_view_port.visual_view_port_height', valueToFind : `window["visualViewport"]["height"]`, mode : `endsWith`, siblingKey : 0});
      findInAssignment({key: 'visual_view_port.visual_view_port_scale', valueToFind : `window["visualViewport"]["scale"]`, mode : `endsWith`, siblingKey : 0});

      (() => {

        const right = path.get(`right`);
        const rightCode = generate(right.node).code;

        if(!rightCode.match(/(.*?)\["canvas"\]\["toDataURL"\]\(\)/)){
          return;
        }

        const tryStatement = path.getStatementParent().parentPath.parentPath;
        const leftProp = tryStatement.getPrevSibling().get(`expression.left.property`);
        FINDERS['webgl.canvas_hash'] = getPropertyValue(leftProp);
      })();

      (() => {

        const right = path.get(`right`);
        const rightCode = generate(right.node).code;

        if(!rightCode.match(/(.*?)\["canvas"\]\["toDataURL"\]\(\)/)){
          return;
        }

        const tryStatement = path.getStatementParent().parentPath.parentPath;

        const leftProp = tryStatement.get(`handler.body.body.0.expression.left.property`);
        FINDERS['webgl.canvas_hash_error'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node).code;

        if(!code.endsWith(`["textBaseline"] = "alphabetic"`)){
          return;
        }

        const leftProp = path.getStatementParent().getPrevSibling().get(`expression.left.property`);
        FINDERS['canvas_hash.screen_is_global_composite_operation'] = getPropertyValue(leftProp);

      })();

    },
    IfStatement(path){

      (() => {
        const { test } = path.node;

        if(!(generate(test).code === `window["navigator"]["buildID"] !== undefined`)){
          return;
        }

        if(!t.isBlockStatement(path.node.consequent)){
          return;
        }

        const leftProp = path.getPrevSibling().get("expression.left.property")
        FINDERS['navigator_languages'] = getPropertyValue(leftProp);

      })();

      (() => {
        const code = generate(path.node.test).code;

        if(!code.endsWith(`window["navigator"]["languages"] !== undefined`)){
          return;
        }
        const leftProp = path.get(`consequent.body`).slice(-1)[0].get(`expression.left.property`);
        FINDERS['navigator_languages.languages'] = getPropertyValue(leftProp);

      })();

      (() => {
        const { test } = path.node;

        if(!(generate(test).code === `window["navigator"]["buildID"] !== undefined`)){
          return;
        }

        if(!t.isBlockStatement(path.node.consequent)){
          return;
        }

        const bodyLength = path.get("consequent.body").length;
        const leftProp = path.get(`consequent.body.${bodyLength - 1}.expression.left.property`);
        FINDERS['navigator_build_id'] = getPropertyValue(leftProp);
      })();

      (() => {
        const code = generate(path.node.test).code;

        if(!code.endsWith(' === "oncontextmenu"')){
          return;
        }

        const leftProp = path.get("consequent.body.0.consequent.body.0.expression.left.property")
        FINDERS['window_object_get_own_property_names_b.prev'] = getPropertyValue(leftProp);
      })();

      (() => {

        const code = generate(path.node.test).code;

        if(!code.endsWith(' === "oncontextmenu"')){
          return;
        }

        const leftProp = path.get("consequent.body.1.consequent.body.0.expression.left.property")
        FINDERS['window_object_get_own_property_names_b.next'] = getPropertyValue(leftProp);
      })();

      (() => {
        const code = generate(path.node.test).code;

        if(!code.endsWith(`["PerformanceObserver"] !== undefined`)){
          return;
        }
        const leftProp = path.get(`consequent.body`).slice(-1)[0].get(`expression.left.property`);
        FINDERS['window.performance_observer'] = getPropertyValue(leftProp);

      })();

      (() => {

        const code = generate(path.node.test).code;

        if(!code.startsWith(`window["PerformanceObserver"]["supportedEntryTypes"]`)){
          return;
        }

        const leftProp = path.get(`consequent.body`).slice(-1)[0].get(`expression.left.property`);
        FINDERS['window.performance_observer.supported_entry_types'] = getPropertyValue(leftProp);

      })();

    },
    TryStatement(path){
      (() => {
        const block = path.get(`block`);

        const nodeCode = generate(block.get(`body.0`).node).code;

        if(nodeCode.endsWith(`["indexedDB"] ? true : false;`)){
          const leftProp = path.getSibling(path.key + 2).get(`expression.left.property`);
          FINDERS['has_indexed_db'] = getPropertyValue(leftProp);
        }

      })();

      (() => {
        const block = path.get(`block.body`);

        if(block.length !== 3){
          return;
        }
        const line = block[0];
        const nodeCode = generate(line.node).code;

        if(nodeCode.endsWith(`window["navigator"]["plugins"]["namedItem"]["name"];`)){
          const leftProp = line.get(`expression.left.property`);
          FINDERS['plugins_named_item_item_refresh.named_item'] = getPropertyValue(leftProp);

        }

      })();
      (() => {
        const block = path.get(`block.body`);

        if(block.length !== 3){
          return;
        }
        const line = block[1];
        const nodeCode = generate(line.node).code;

        if(nodeCode.endsWith(`window["navigator"]["plugins"]["item"]["name"];`)){
          const leftProp = line.get(`expression.left.property`);
          FINDERS['plugins_named_item_item_refresh.item'] = getPropertyValue(leftProp);
        }

      })();

      (() => {
        const block = path.get(`block.body`);

        if(block.length !== 3){
          return;
        }
        const line = block[2];
        const nodeCode = generate(line.node).code;

        if(nodeCode.endsWith(`window["navigator"]["plugins"]["refresh"]["name"];`)){
          const leftProp = line.get(`expression.left.property`);
          FINDERS['plugins_named_item_item_refresh.refresh'] = getPropertyValue(leftProp);
        }

      })();

    },
    ForInStatement(path){

      (() => {
        const code = generate(path.get(`right`).node).code;

        if(!(code.endsWith(`window["document"]["documentElement"]["children"]`))){
          return;
        }

        const leftProp = path.getSibling(path.key + 1).get(`expression.left.property`);
        FINDERS['document_children.document_script_element_children'] = getPropertyValue(leftProp);
      })();

      (() => {

        const code = generate(path.get(`right`).node).code;

        if(!(code.endsWith(`window["document"]["head"]["children"]`))){
          return;
        }

        const leftProp = path.getSibling(path.key + 1).get(`expression.left.property`);
        FINDERS['document_children.document_head_element_children'] = getPropertyValue(leftProp);
      })();

      (() => {
        const code = generate(path.get(`right`).node).code;

        if(!(code.endsWith(`window["document"]["body"]["children"]`))){
          return;
        }

        const leftProp = path.getSibling(path.key + 1).get(`expression.left.property`);
        FINDERS['document_children.document_body_element_children'] = getPropertyValue(leftProp);
      })();

    },

  });
}


module.exports = FINDERS;
