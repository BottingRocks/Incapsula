const generate = require(`@babel/generator`).default;
const uaparser = require(`ua-parser-js`);

const {
  extractXorEncoders,
  extractSignalsKeys,
  extractStAndSr
} = require(`./extract.js`);
const {
  fromString,
  fromFile
} = require(`../ast.js`);

const attachWebglRenderingCallHash = require(`./transformations/attach-webgl_rendering_call_hash.js`);
const clearConcealedStringsPayload = require(`./transformations/clear-concealed-strings-payload.js`);
const ensureBlockStatements = require(`./transformations/ensure-block-statements.js`);
const expandSequenceExpressions = require(`./transformations/expand-sequence-expressions.js`);
const removeQueryParamD = require(`./transformations/remove-query-param-d.js`);
const renameXorShift128 = require(`./transformations/rename-xor-shift-128.js`);
const replacePostbackUrl = require(`./transformations/replace-postback-url.js`);
const replaceSubstrStrings = require(`./transformations/replace-substr-strings.js`);

function byteIndex(a) {
  return `\\u` + (`0000` + a.charCodeAt(0).toString(16)).substr(-4);
}

const byteRegex = new RegExp(`[\\u007F-\\uFFFF]`, `g`);

class Reese84 {

  constructor(ast) {
    this.ast = ast;

    this.ast.restorePaths = [];
    this.encoders = extractXorEncoders(ast);
    this.signalKeys = extractSignalsKeys(ast);

    this.ast.restorePaths.forEach(([path, node]) => {
      path.replaceWith(node);
    });

    const {
      st,
      sr
    } = extractStAndSr(ast);

    this.st = st;
    this.sr = sr;
    this.key = this.signalKeys.key;
    this.key_value = this.signalKeys.key_value;
  }

  static fromString(str) {

    const ast = fromString(str);
    Reese84.deobfuscate(ast);
    return new Reese84(ast);

  }

  static fromFile(file) {

    const ast = fromFile(file);
    Reese84.deobfuscate(ast);
    return new Reese84(ast);

  }

  static fromAst(ast) {

    Reese84.deobfuscate(ast);
    return new Reese84(ast);

  }

  static deobfuscate(ast) {
    [
      renameXorShift128,
      ensureBlockStatements,
      clearConcealedStringsPayload,
      expandSequenceExpressions,
      replaceSubstrStrings,
      attachWebglRenderingCallHash
    ].map((t) => t(ast));

  }

  createCollectorScript(payloadUrl) {

    const ast = fromString(generate(this.ast).code);
    ast.postbackUrl = payloadUrl;

    replacePostbackUrl(ast);
    removeQueryParamD(ast);

    return generate(ast).code;

  }

  createPayload(data, options = {}) {

    const error = options.error || null;
    const oldToken = options.old_token || null;
    const interrogation = options.interrogation || (Math.random() * (399 - 180) + 180);
    const cr = options.cr || (Math.random() * 1073741824 | 0);
    const version = options.version || `stable`;

    const encodedPayload = this.encodePayload(data, cr);

    const payload = {
      "solution" : {
        "interrogation" : {
          "p" : encodedPayload,
          "st" : this.st,
          "sr" : this.sr,
          "cr" : cr
        },
        "version" : version,
      },
      "old_token" : oldToken,
      "error" : error,
      "performance" : {
        "interrogation" : parseInt(interrogation)
      }
    };
    return JSON.stringify(payload, function (key, value) {
      return value === undefined ? null : value;
    });

  }

  encodePayload(data, xor) {

    const isChrome = uaparser(data.user_agent).browser.name === `Chrome`;

    const encode = (encoder, data) => {

      let mutatedData = null;
      //Convert the data into a JSON string, replacing undefined values with nulls.

      if (typeof data === `object`) {
        Object.keys(data).forEach((key) => {
          if (key === `undefined`) {
            delete data[key];
          }
        });
      }
      mutatedData = JSON.stringify(data, function (key, value) {
        return value === undefined ? null : value;
      });

      //Replace any byte encoded strings
      mutatedData = mutatedData.replace(byteRegex, byteIndex);
      //Apply the series of encoder loops, and returns the result as a Base64 string
      mutatedData = encoder(mutatedData, xor);

      return mutatedData;

    };

    const encodeEvent = ({event, type}) => {
      switch(type){
        case "mouse":
          return {
            [this.signalKeys[`events.mouse.type`]] : event.type,
            [this.signalKeys[`events.mouse.timestamp`]] : event.type,
            [this.signalKeys[`events.mouse.client_x`]] : event.client_x,
            [this.signalKeys[`events.mouse.client_y`]] : event.client_y,
            [this.signalKeys[`events.mouse.screen_x`]] : event.screen_x,
            [this.signalKeys[`events.mouse.screen_y`]] : event.screen_y,
          };
        case "touch":
          return {
            [this.signalKeys[`events.touch.type`]] : event.type,
            [this.signalKeys[`events.touch.timestamp`]] : event.timestamp,
            [this.signalKeys[`events.touch.identifier`]] : event.identifier,
            [this.signalKeys[`events.touch.client_x`]] : event.client_x,
            [this.signalKeys[`events.touch.client_y`]] : event.client_y,
            [this.signalKeys[`events.touch.screen_x`]] : event.screen_x,
            [this.signalKeys[`events.touch.screen_y`]] : event.screen_y,
            [this.signalKeys[`events.touch.radius_x`]] : event.radius_x,
            [this.signalKeys[`events.touch.radius_y`]] : event.radius_y,
            [this.signalKeys[`events.touch.rotation_angle`]] : event.rotation_angle,
            [this.signalKeys[`events.touch.force`]] : event.force,
          };
      }
    }

    const encodedPayload = encode(this.encoders[13][0].encoder, {
      [this.signalKeys[`events`]] : {
        [this.signalKeys[`events.mouse`]] : data.events.mouse.length
          ? encode(this.encoders[0][0].encoder, data.events.mouse.map(e => encodeEvent({event : e, type :"mouse"})))
          : [],
        [this.signalKeys[`events.touch`]] : data.events.touch.length
          ? encode(this.encoders[0][1].encoder, data.events.touch.map(e => encodeEvent({event : e, type :"touch"})))
          : []
      },
      [this.signalKeys[`events`]] : {
        [this.signalKeys[`events.mouse`]] : [],
        [this.signalKeys[`events.touch`]] : [],
      },
      [this.signalKeys[`user_agent`]] : data.user_agent,
      [this.signalKeys[`navigator_language`]] : data.navigator_language,
      [this.signalKeys[`navigator_languages`]] : {
        [this.signalKeys[`navigator_languages.languages_is_not_undefined`]] : data.navigator_languages.languages_is_not_undefined,
        [this.signalKeys[`navigator_languages.languages`]] : data.navigator_languages.languages
      },
      [this.signalKeys[`navigator_build_id`]] : encode(this.encoders[6][0].encoder, data.navigator_build_id),
      [this.signalKeys[`timestamps`]] : encode(this.encoders[6][1].encoder, {
        [this.signalKeys[`timestamps.date_get_time`]] : encode(this.encoders[1][0].encoder, data.timestamps.date_get_time),
        [this.signalKeys[`timestamps.file_last_modified`]] : encode(this.encoders[2][0].encoder, data.timestamps.file_last_modified),
        [this.signalKeys[`timestamps.performance_now`]] : encode(this.encoders[3][0].encoder, data.timestamps.performance_now),
        [this.signalKeys[`timestamps.document_timeline`]] : encode(this.encoders[4][0].encoder,data.timestamps.document_timeline),
        [this.signalKeys[`timestamps.performance_timing`]] : encode(this.encoders[5][0].encoder, data.timestamps.performance_timing),
      }),
      [this.signalKeys[`window_size`]] : encode(this.encoders[6][2].encoder, {
        [this.signalKeys[`window_size.window_screen_width`]] : data.window_size.window_screen_width,
        [this.signalKeys[`window_size.window_screen_height`]] : data.window_size.window_screen_height,
        [this.signalKeys[`window_size.window_screen_avail_height`]] : data.window_size.window_screen_avail_height,
        [this.signalKeys[`window_size.window_screen_avail_left`]] : data.window_size.window_screen_avail_left,
        [this.signalKeys[`window_size.window_screen_avail_top`]] : data.window_size.window_screen_avail_top,
        [this.signalKeys[`window_size.window_screen_avail_width`]] : data.window_size.window_screen_avail_width,
        [this.signalKeys[`window_size.window_screen_pixel_depth`]] : data.window_size.window_screen_pixel_depth,
        [this.signalKeys[`window_size.window_inner_width`]] : data.window_size.window_inner_width,
        [this.signalKeys[`window_size.window_inner_height`]] : data.window_size.window_inner_height,
        [this.signalKeys[`window_size.window_outer_width`]] : data.window_size.window_outer_width,
        [this.signalKeys[`window_size.window_outer_height`]] : data.window_size.window_outer_height,
        [this.signalKeys[`window_size.window_device_pixel_ratio`]] : data.window_size.window_device_pixel_ratio,
        [this.signalKeys[`window_size.window_screen_orientation_type`]] : data.window_size.window_screen_orientation_type,
        [this.signalKeys[`window_size.window_screenX`]] : data.window_size.window_screenX,
        [this.signalKeys[`window_size.window_screenY`]] : data.window_size.window_screenY,
      }),
      [this.signalKeys[`date_get_time_zone_off_set`]] : data.date_get_time_zone_off_set,
      [this.signalKeys[`has_indexed_db`]] : data.has_indexed_db,
      [this.signalKeys[`has_body_add_behaviour`]] : data.has_body_add_behaviour,
      [this.signalKeys[`open_database`]] : data.open_database,
      [this.signalKeys[`cpu_class`]] : data.cpu_class,
      [this.signalKeys[`platform`]] : data.platform,
      [this.signalKeys[`do_not_track`]] : data.do_not_track,
      [this.signalKeys[`plugins_or_active_x_object`]] : data.plugins_or_active_x_object,
      [this.signalKeys[`plugins_named_item_item_refresh`]] : {
        [this.signalKeys[`plugins_named_item_item_refresh.named_item`]] : data.plugins_named_item_item_refresh.named_item,
        [this.signalKeys[`plugins_named_item_item_refresh.item`]] : data.plugins_named_item_item_refresh.item,
        [this.signalKeys[`plugins_named_item_item_refresh.refresh`]] : data.plugins_named_item_item_refresh.refresh
      },
      [this.signalKeys[`canvas_hash`]] : encode(this.encoders[7][1].encoder, {
        [this.signalKeys[`canvas_hash.is_point_in_path`]] : data.canvas_hash.is_point_in_path,
        [this.signalKeys[`canvas_hash.to_data_url_image`]] : data.canvas_hash.to_data_url_image,
        [this.signalKeys[`canvas_hash.screen_is_global_composite_operation`]] : data.canvas_hash.screen_is_global_composite_operation,
        [this.signalKeys[`canvas_hash.hash`]] : encode(this.encoders[7][0].encoder, data.canvas_hash.hash),
      }),
      [this.signalKeys[`webgl`]] : encode(this.encoders[11][0].encoder, {
        [this.signalKeys[`webgl.canvas_hash`]] : encode(this.encoders[11][1].encoder, data.webgl.canvas_hash),
        [this.signalKeys[`webgl.get_supported_extensions`]] : data.webgl.get_supported_extensions,
        //[this.signalKeys['webgl.canvas_hash_error']] : data.webgl.canvas_hash_error,
        [this.signalKeys[`webgl.aliased_line_width_range`]] : data.webgl.aliased_line_width_range,
        [this.signalKeys[`webgl.aliased_point_size_range`]] : data.webgl.aliased_point_size_range,
        [this.signalKeys[`webgl.alpha_bits`]] : data.webgl.alpha_bits,
        [this.signalKeys[`webgl.antialias`]] : data.webgl.antialias,
        [this.signalKeys[`webgl.blue_bits`]] : data.webgl.blue_bits,
        [this.signalKeys[`webgl.depth_bits`]] : data.webgl.depth_bits,
        [this.signalKeys[`webgl.green_bits`]] : data.webgl.green_bits,
        [this.signalKeys[`webgl.all_bits`]] : data.webgl.all_bits,
        [this.signalKeys[`webgl.max_combined_texture_image_units`]] : data.webgl.max_combined_texture_image_units,
        [this.signalKeys[`webgl.max_cube_map_texture_size`]] : data.webgl.max_cube_map_texture_size,
        [this.signalKeys[`webgl.max_fragment_uniform_vectors`]] : data.webgl.max_fragment_uniform_vectors,
        [this.signalKeys[`webgl.max_renderbuffer_size`]] : data.webgl.max_renderbuffer_size,
        [this.signalKeys[`webgl.max_texture_image_units`]] : data.webgl.max_texture_image_units,
        [this.signalKeys[`webgl.max_texture_size`]] : data.webgl.max_texture_size,
        [this.signalKeys[`webgl.max_varying_vectors`]] : data.webgl.max_varying_vectors,
        [this.signalKeys[`webgl.max_vertex_attribs`]] : data.webgl.max_vertex_attribs,
        [this.signalKeys[`webgl.max_vertex_texture_image_units`]] : data.webgl.max_vertex_texture_image_units,
        [this.signalKeys[`webgl.max_vertex_uniform_vectors`]] : data.webgl.max_vertex_uniform_vectors,
        [this.signalKeys[`webgl.max_viewport_dims`]] : data.webgl.max_viewport_dims,
        [this.signalKeys[`webgl.red_bits`]] : data.webgl.red_bits,
        [this.signalKeys[`webgl.renderer`]] : data.webgl.renderer,
        [this.signalKeys[`webgl.shading_language_version`]] : data.webgl.shading_language_version,
        [this.signalKeys[`webgl.stencil_bits`]] : data.webgl.stencil_bits,
        [this.signalKeys[`webgl.vendor`]] : data.webgl.vendor,
        [this.signalKeys[`webgl.version`]] : data.webgl.version,

        [this.signalKeys[`webgl.shader_precision_vertex_high_float`]] : data.webgl.shader_precision_vertex_high_float,
        [this.signalKeys[`webgl.shader_precision_vertex_high_float_min`]] : data.webgl.shader_precision_vertex_high_float_min,
        [this.signalKeys[`webgl.shader_precision_vertex_high_float_max`]] : data.webgl.shader_precision_vertex_high_float_max,
        [this.signalKeys[`webgl.shader_precision_vertex_medium_float`]] : data.webgl.shader_precision_vertex_medium_float,
        [this.signalKeys[`webgl.shader_precision_vertex_medium_float_min`]] : data.webgl.shader_precision_vertex_medium_float_min,
        [this.signalKeys[`webgl.shader_precision_vertex_medium_float_max`]] : data.webgl.shader_precision_vertex_medium_float_max,
        [this.signalKeys[`webgl.shader_precision_vertex_low_float`]] : data.webgl.shader_precision_vertex_low_float,
        [this.signalKeys[`webgl.shader_precision_vertex_low_float_min`]] : data.webgl.shader_precision_vertex_low_float_min,
        [this.signalKeys[`webgl.shader_precision_vertex_low_float_max`]] : data.webgl.shader_precision_vertex_low_float_max,

        [this.signalKeys[`webgl.shader_precision_fragment_high_float`]] : data.webgl.shader_precision_fragment_high_float,
        [this.signalKeys[`webgl.shader_precision_fragment_high_float_min`]] : data.webgl.shader_precision_fragment_high_float_min,
        [this.signalKeys[`webgl.shader_precision_fragment_high_float_max`]] : data.webgl.shader_precision_fragment_high_float_max,
        [this.signalKeys[`webgl.shader_precision_fragment_medium_float`]] : data.webgl.shader_precision_fragment_medium_float,
        [this.signalKeys[`webgl.shader_precision_fragment_medium_float_min`]] : data.webgl.shader_precision_fragment_medium_float_min,
        [this.signalKeys[`webgl.shader_precision_fragment_medium_float_max`]] : data.webgl.shader_precision_fragment_medium_float_max,
        [this.signalKeys[`webgl.shader_precision_fragment_low_float`]] : data.webgl.shader_precision_fragment_low_float,
        [this.signalKeys[`webgl.shader_precision_fragment_low_float_min`]] : data.webgl.shader_precision_fragment_low_float_min,
        [this.signalKeys[`webgl.shader_precision_fragment_low_float_max`]] : data.webgl.shader_precision_fragment_low_float_max,

        [this.signalKeys[`webgl.shader_precision_vertex_high_int`]] : data.webgl.shader_precision_vertex_high_int,
        [this.signalKeys[`webgl.shader_precision_vertex_high_int_min`]] : data.webgl.shader_precision_vertex_high_int_min,
        [this.signalKeys[`webgl.shader_precision_vertex_high_int_max`]] : data.webgl.shader_precision_vertex_high_int_max,
        [this.signalKeys[`webgl.shader_precision_vertex_medium_int`]] : data.webgl.shader_precision_vertex_medium_int,
        [this.signalKeys[`webgl.shader_precision_vertex_medium_int_min`]] : data.webgl.shader_precision_vertex_medium_int_min,
        [this.signalKeys[`webgl.shader_precision_vertex_medium_int_max`]] : data.webgl.shader_precision_vertex_medium_int_max,
        [this.signalKeys[`webgl.shader_precision_vertex_low_int`]] : data.webgl.shader_precision_vertex_low_int,
        [this.signalKeys[`webgl.shader_precision_vertex_low_int_min`]] : data.webgl.shader_precision_vertex_low_int_min,
        [this.signalKeys[`webgl.shader_precision_vertex_low_int_max`]] : data.webgl.shader_precision_vertex_low_int_max,

        [this.signalKeys[`webgl.shader_precision_fragment_high_int`]] : data.webgl.shader_precision_fragment_high_int,
        [this.signalKeys[`webgl.shader_precision_fragment_high_int_min`]] : data.webgl.shader_precision_fragment_high_int_min,
        [this.signalKeys[`webgl.shader_precision_fragment_high_int_max`]] : data.webgl.shader_precision_fragment_high_int_max,
        [this.signalKeys[`webgl.shader_precision_fragment_medium_int`]] : data.webgl.shader_precision_fragment_medium_int,
        [this.signalKeys[`webgl.shader_precision_fragment_medium_int_min`]] : data.webgl.shader_precision_fragment_medium_int_min,
        [this.signalKeys[`webgl.shader_precision_fragment_medium_int_max`]] : data.webgl.shader_precision_fragment_medium_int_max,
        [this.signalKeys[`webgl.shader_precision_fragment_low_int`]] : data.webgl.shader_precision_fragment_low_int,
        [this.signalKeys[`webgl.shader_precision_fragment_low_int_min`]] : data.webgl.shader_precision_fragment_low_int_min,
        [this.signalKeys[`webgl.shader_precision_fragment_low_int_max`]] : data.webgl.shader_precision_fragment_low_int_max,

        [this.signalKeys[`webgl.unmasked_vendor_webgl`]] : data.webgl.unmasked_vendor_webgl,
        [this.signalKeys[`webgl.unmasked_renderer_webgl`]] : data.webgl.unmasked_renderer_webgl,
      }),
      [this.signalKeys[`webgl_meta`]] : {
        [this.signalKeys[`webgl_meta.webgl_rendering_context_get_parameter`]] : data.webgl_meta.webgl_rendering_context_get_parameter,
        [this.signalKeys[`webgl_meta.is_native_webgl_rendering_context_get_parameter`]] : data.webgl_meta.is_native_webgl_rendering_context_get_parameter
      },
      [this.signalKeys[`touch_event`]] : encode(this.encoders[12][0].encoder, {
        [this.signalKeys[`touch_event.max_touch_points`]] : data.touch_event.max_touch_points,
        [this.signalKeys[`touch_event.has_touch_event`]] : data.touch_event.has_touch_event,
        [this.signalKeys[`touch_event.on_touch_start_is_undefined`]] : data.touch_event.on_touch_start_is_undefined
      }),
      [this.signalKeys[`video`]] : encode(this.encoders[12][1].encoder, {
        [this.signalKeys[`video.can_play_type_video_ogg`]] : data.video.can_play_type_video_ogg,
        [this.signalKeys[`video.can_play_type_video_mp4`]] : data.video.can_play_type_video_mp4,
        [this.signalKeys[`video.can_play_type_video_webm`]] : data.video.can_play_type_video_webm
      }),
      [this.signalKeys[`audio`]] : encode(this.encoders[12][2].encoder, {
        [this.signalKeys[`audio.can_play_type_audio_ogg`]] : data.audio.can_play_type_audio_ogg,
        [this.signalKeys[`audio.can_play_type_audio_mpeg`]] : data.audio.can_play_type_audio_mpeg,
        [this.signalKeys[`audio.can_play_type_audio_wav`]] : data.audio.can_play_type_audio_wav,
        [this.signalKeys[`audio.can_play_type_audio_xm4a`]] : data.audio.can_play_type_audio_xm4a
      }),
      [this.signalKeys[`navigator_vendor`]] : data.navigator_vendor,
      [this.signalKeys[`navigator_product`]] : data.navigator_product,
      [this.signalKeys[`navigator_product_sub`]] : data.navigator_product_sub,
      [this.signalKeys[`browser`]] : encode(this.encoders[12][3].encoder, {
        [this.signalKeys[`browser.is_internet_explorer`]] : data.browser.is_internet_explorer,
        ///*
        [isChrome ? this.signalKeys[`browser.chrome`] : undefined] : isChrome ? {
          [this.signalKeys[`browser.chrome.load_times`]] : data.browser.chrome.load_times,
          [this.signalKeys[`browser.chrome.app`]] : data.browser.chrome.app
        } : undefined,
        [this.signalKeys[`browser.webdriver`]] : data.browser.webdriver,
        [this.signalKeys[`browser.is_chrome`]] : data.browser.is_chrome,
        [isChrome ? this.signalKeys[`browser.connection_rtt`] : undefined] : isChrome ? data.browser.connection_rtt : undefined
      }),
      [this.signalKeys[`window`]] : encode(this.encoders[12][4].encoder, {
        [this.signalKeys[`window.history_length`]] : data.window.history_length,
        [this.signalKeys[`window.navigator_hardware_concurrency`]] : data.window.navigator_hardware_concurrency,
        [this.signalKeys[`window.is_window_self_not_window_top`]] : data.window.is_window_self_not_window_top,
        [this.signalKeys[`window.is_native_navigator_get_battery`]] : data.window.is_native_navigator_get_battery,
        [this.signalKeys[`window.console_debug_name`]] : data.window.console_debug_name,
        [this.signalKeys[`window.is_native_console_debug`]] : data.window.is_native_console_debug,
        [this.signalKeys[`window._phantom`]] : data.window._phantom,
        [this.signalKeys[`window.call_phantom`]] : data.window.call_phantom,
        [this.signalKeys[`window.empty`]] : data.window.empty,
        [isChrome ? this.signalKeys[`window.persistent`] : undefined] : isChrome ? data.window.persistent : undefined,
        [isChrome ? this.signalKeys[`window.temporary`] : undefined] : isChrome ? data.window.temporary : undefined,
        [this.signalKeys[`window.performance_observer`]] : {
          [this.signalKeys[`window.performance_observer.supported_entry_types`]] : data.window.performance_observer.supported_entry_types
        }
      }),
      [this.signalKeys[`document`]] : {
        [this.signalKeys[`document.document_location_protocol`]] : data.document.document_location_protocol,
      },
      [this.signalKeys[`canvas_fonts`]] : data.canvas_fonts,
      [this.signalKeys[`document_children`]] : {
        [this.signalKeys[`document_children.document_script_element_children`]] : data.document_children.document_script_element_children,
        [this.signalKeys[`document_children.document_head_element_children`]] : data.document_children.document_head_element_children
      },
      [this.signalKeys[`webgl_rendering_call`]] : encode(this.encoders[12][5].encoder, {
        [this.signalKeys[`webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_a`]] : data.webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_a,
        [this.signalKeys[`webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_b`]] : data.webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_b,
        [this.signalKeys[`webgl_rendering_call.hash`]] : this.ast.webgl_rendering_call_hash(xor),
      }),
      [this.signalKeys[`window_object_get_own_property_names`]] : encode(this.encoders[12][6].encoder, data.window_object_get_own_property_names),
      [this.signalKeys[`visual_view_port`]] : encode(this.encoders[12][7].encoder, {
        [this.signalKeys[`visual_view_port.visual_view_port_width`]] : data.visual_view_port.visual_view_port_width,
        [this.signalKeys[`visual_view_port.visual_view_port_height`]] : data.visual_view_port.visual_view_port_height,
        [this.signalKeys[`visual_view_port.visual_view_port_scale`]] : data.visual_view_port.visual_view_port_scale
      }),
      [this.key] : this.key_value
    });

    return encodedPayload;
  }

  decodePayload(data, xor, dropUniqueKey = true) {
    const decode = (decoder, data) => {

      if(data instanceof Array){
        return data.map(d => {
          let mutatedData = null;
          //Apply the series of encoder loops, and returns the result as a Base64 string
          mutatedData = decoder(d, Number(xor));
          return mutatedData;
        });
      }

      let mutatedData = null;
      //Apply the series of encoder loops, and returns the result as a Base64 string
      mutatedData = decoder(data, Number(xor));
      return mutatedData;

    };
    const rawDecodedPayload = decode(this.encoders[13][0].decoder, data);
    const decodedPayload = {};

    if (this.signalKeys[`events`] in rawDecodedPayload){
      decodedPayload[`events`] = {}
      const rawPayload = rawDecodedPayload[this.signalKeys[`events`]];

      decodedPayload[`events`][`mouse`] = rawPayload[this.signalKeys[`events.mouse`]].length > 0
        ? decode(this.encoders[0][0].decoder, rawPayload[this.signalKeys[`events.mouse`]])
        : [];

      decodedPayload[`events`][`mouse`].forEach((event, i) => {
        const newEvent = {};

        newEvent['type'] = event[this.signalKeys[`events.mouse.type`]];
        newEvent['timestamp'] = event[this.signalKeys[`events.mouse.timestamp`]];
        newEvent['client_x'] = event[this.signalKeys[`events.mouse.client_x`]];
        newEvent['client_y'] = event[this.signalKeys[`events.mouse.client_y`]];
        newEvent['screen_x'] = event[this.signalKeys[`events.mouse.screen_x`]];
        newEvent['screen_y'] = event[this.signalKeys[`events.mouse.screen_y`]];

        decodedPayload[`events`][`mouse`][i] = newEvent;

      });

      decodedPayload[`events`][`touch`] = rawPayload[this.signalKeys[`events.touch`]].length > 0
        ? decode(this.encoders[0][1].decoder, rawPayload[this.signalKeys[`events.touch`]])
        : [];

      decodedPayload[`events`][`touch`].forEach((event, i) => {
        const newEvent = {};

        newEvent['type'] = event[this.signalKeys[`events.touch.type`]];
        newEvent['timestamp'] = event[this.signalKeys[`events.touch.timestamp`]];
        newEvent['identifier'] = event[this.signalKeys[`events.touch.identifier`]];
        newEvent['client_x'] = event[this.signalKeys[`events.touch.client_x`]];
        newEvent['client_y'] = event[this.signalKeys[`events.touch.client_y`]];
        newEvent['screen_x'] = event[this.signalKeys[`events.touch.screen_x`]];
        newEvent['screen_y'] = event[this.signalKeys[`events.touch.screen_y`]];
        newEvent['radius_x'] = event[this.signalKeys[`events.touch.screen_x`]];
        newEvent['radius_y'] = event[this.signalKeys[`events.touch.screen_y`]];
        newEvent['rotation_angle'] = event[this.signalKeys[`events.touch.rotation_angle`]];
        newEvent['force'] = event[this.signalKeys[`events.touch.force`]];

        decodedPayload[`events`][`touch`][i] = newEvent;

      });

    }

    decodedPayload[`user_agent`] = rawDecodedPayload[this.signalKeys[`user_agent`]];
    decodedPayload[`navigator_language`] = rawDecodedPayload[this.signalKeys[`navigator_language`]];

    if (this.signalKeys[`navigator_languages`] in rawDecodedPayload) {

      decodedPayload[`navigator_languages`] = {};
      const rawPayload = rawDecodedPayload[this.signalKeys[`navigator_languages`]];

      decodedPayload[`navigator_languages`][`languages_is_not_undefined`] = rawPayload[this.signalKeys[`navigator_languages.languages_is_not_undefined`]];
      decodedPayload[`navigator_languages`][`languages`] = rawPayload[this.signalKeys[`navigator_languages.languages`]];
    }

    decodedPayload['navigator_build_id'] = decode(this.encoders[6][0].decoder, rawDecodedPayload[this.signalKeys[`navigator_build_id`]]);

    if(this.signalKeys[`timestamps`] in rawDecodedPayload){
      decodedPayload[`timestamps`] = {};
      const rawPayload = decode(this.encoders[6][1].decoder, rawDecodedPayload[this.signalKeys[`timestamps`]]);

      decodedPayload[`timestamps`][`date_get_time`] = decode(this.encoders[1][0].decoder, rawPayload[this.signalKeys[`timestamps.date_get_time`]]);
      decodedPayload[`timestamps`][`file_last_modified`] = decode(this.encoders[2][0].decoder, rawPayload[this.signalKeys[`timestamps.file_last_modified`]]);
      decodedPayload[`timestamps`][`performance_now`] = decode(this.encoders[3][0].decoder, rawPayload[this.signalKeys[`timestamps.performance_now`]]);
      decodedPayload[`timestamps`][`document_timeline`] = decode(this.encoders[4][0].decoder, rawPayload[this.signalKeys[`timestamps.document_timeline`]]);
      decodedPayload[`timestamps`][`performance_timing`] = decode(this.encoders[5][0].decoder, rawPayload[this.signalKeys[`timestamps.performance_timing`]]);
    }

    if (this.signalKeys[`window_size`] in rawDecodedPayload) {

      decodedPayload[`window_size`] = {};

      const rawPayload = decode(this.encoders[6][2].decoder, rawDecodedPayload[this.signalKeys[`window_size`]]);

      decodedPayload[`window_size`][`window_screen_width`] = rawPayload[this.signalKeys[`window_size.window_screen_width`]];
      decodedPayload[`window_size`][`window_screen_height`] = rawPayload[this.signalKeys[`window_size.window_screen_height`]];
      decodedPayload[`window_size`][`window_screen_avail_height`] = rawPayload[this.signalKeys[`window_size.window_screen_avail_height`]];
      decodedPayload[`window_size`][`window_screen_avail_left`] = rawPayload[this.signalKeys[`window_size.window_screen_avail_left`]];
      decodedPayload[`window_size`][`window_screen_avail_top`] = rawPayload[this.signalKeys[`window_size.window_screen_avail_top`]];
      decodedPayload[`window_size`][`window_screen_avail_width`] = rawPayload[this.signalKeys[`window_size.window_screen_avail_width`]];
      decodedPayload[`window_size`][`window_screen_pixel_depth`] = rawPayload[this.signalKeys[`window_size.window_screen_pixel_depth`]];
      decodedPayload[`window_size`][`window_inner_width`] = rawPayload[this.signalKeys[`window_size.window_inner_width`]];
      decodedPayload[`window_size`][`window_inner_height`] = rawPayload[this.signalKeys[`window_size.window_inner_height`]];
      decodedPayload[`window_size`][`window_outer_width`] = rawPayload[this.signalKeys[`window_size.window_outer_width`]];
      decodedPayload[`window_size`][`window_outer_height`] = rawPayload[this.signalKeys[`window_size.window_outer_height`]];
      decodedPayload[`window_size`][`window_device_pixel_ratio`] = rawPayload[this.signalKeys[`window_size.window_device_pixel_ratio`]];
      decodedPayload[`window_size`][`window_screen_orientation_type`] = rawPayload[this.signalKeys[`window_size.window_screen_orientation_type`]];
      decodedPayload[`window_size`][`window_screenX`] = rawPayload[this.signalKeys[`window_size.window_screenX`]];
      decodedPayload[`window_size`][`window_screenY`] = rawPayload[this.signalKeys[`window_size.window_screenY`]];
    }

    decodedPayload[`date_get_time_zone_off_set`] = rawDecodedPayload[this.signalKeys[`date_get_time_zone_off_set`]];
    decodedPayload[`has_indexed_db`] = rawDecodedPayload[this.signalKeys[`has_indexed_db`]];
    decodedPayload[`has_body_add_behaviour`] = rawDecodedPayload[this.signalKeys[`has_body_add_behaviour`]];
    decodedPayload[`open_database`] = rawDecodedPayload[this.signalKeys[`open_database`]];
    decodedPayload[`cpu_class`] = rawDecodedPayload[this.signalKeys[`cpu_class`]];
    decodedPayload[`platform`] = rawDecodedPayload[this.signalKeys[`platform`]];
    decodedPayload[`do_not_track`] = rawDecodedPayload[this.signalKeys[`do_not_track`]];
    decodedPayload[`plugins_or_active_x_object`] = rawDecodedPayload[this.signalKeys[`plugins_or_active_x_object`]];

    if (this.signalKeys[`plugins_named_item_item_refresh`] in rawDecodedPayload) {

      decodedPayload[`plugins_named_item_item_refresh`] = {};
      const rawPayload = rawDecodedPayload[this.signalKeys[`plugins_named_item_item_refresh`]];

      decodedPayload[`plugins_named_item_item_refresh`][`named_item`] = rawPayload[this.signalKeys[`plugins_named_item_item_refresh.named_item`]];
      decodedPayload[`plugins_named_item_item_refresh`][`item`] = rawPayload[this.signalKeys[`plugins_named_item_item_refresh.item`]];
      decodedPayload[`plugins_named_item_item_refresh`][`refresh`] = rawPayload[this.signalKeys[`plugins_named_item_item_refresh.refresh`]];
    }

    if (this.signalKeys[`canvas_hash`] in rawDecodedPayload) {

      decodedPayload[`canvas_hash`] = {};
      const rawPayload = decode(this.encoders[7][1].decoder, rawDecodedPayload[this.signalKeys[`canvas_hash`]]);

      decodedPayload[`canvas_hash`][`is_point_in_path`] = rawPayload[this.signalKeys[`canvas_hash.is_point_in_path`]];
      decodedPayload[`canvas_hash`][`to_data_url_image`] = rawPayload[this.signalKeys[`canvas_hash.to_data_url_image`]];
      if (rawPayload[this.signalKeys[`canvas_hash.to_data_url_image_error`]]) {
        decodedPayload[`canvas_hash`][`to_data_url_image_error`] = rawPayload[this.signalKeys[`canvas_hash.to_data_url_image_error`]];
      }

      decodedPayload[`canvas_hash`][`screen_is_global_composite_operation`] = rawPayload[this.signalKeys[`canvas_hash.screen_is_global_composite_operation`]];
      decodedPayload[`canvas_hash`][`hash`] = decode(this.encoders[6+1][0].decoder, rawPayload[this.signalKeys[`canvas_hash.hash`]]);
    }

    if (this.signalKeys[`webgl`] in rawDecodedPayload) {

      decodedPayload[`webgl`] = {};
      const rawPayload = decode(this.encoders[11][0].decoder, rawDecodedPayload[this.signalKeys[`webgl`]]);
      decodedPayload[`webgl`][`canvas_hash`] = decode(this.encoders[11][1].decoder, rawPayload[this.signalKeys[`webgl.canvas_hash`]]);
      decodedPayload[`webgl`][`get_supported_extensions`] = rawPayload[this.signalKeys[`webgl.get_supported_extensions`]];

      if (rawPayload[this.signalKeys[`webgl.canvas_hash_error`]]) {
        decodedPayload[`webgl`][`canvas_hash_error`] = rawPayload[this.signalKeys[`webgl.canvas_hash_error`]];
      }

      decodedPayload[`webgl`][`aliased_line_width_range`] = rawPayload[this.signalKeys[`webgl.aliased_line_width_range`]];
      decodedPayload[`webgl`][`aliased_point_size_range`] = rawPayload[this.signalKeys[`webgl.aliased_point_size_range`]];
      decodedPayload[`webgl`][`alpha_bits`] = rawPayload[this.signalKeys[`webgl.alpha_bits`]];
      decodedPayload[`webgl`][`antialias`] = rawPayload[this.signalKeys[`webgl.antialias`]];
      decodedPayload[`webgl`][`blue_bits`] = rawPayload[this.signalKeys[`webgl.blue_bits`]];
      decodedPayload[`webgl`][`depth_bits`] = rawPayload[this.signalKeys[`webgl.depth_bits`]];
      decodedPayload[`webgl`][`green_bits`] = rawPayload[this.signalKeys[`webgl.green_bits`]];
      decodedPayload[`webgl`][`all_bits`] = rawPayload[this.signalKeys[`webgl.all_bits`]];
      decodedPayload[`webgl`][`max_combined_texture_image_units`] = rawPayload[this.signalKeys[`webgl.max_combined_texture_image_units`]];
      decodedPayload[`webgl`][`max_cube_map_texture_size`] = rawPayload[this.signalKeys[`webgl.max_cube_map_texture_size`]];
      decodedPayload[`webgl`][`max_fragment_uniform_vectors`] = rawPayload[this.signalKeys[`webgl.max_fragment_uniform_vectors`]];
      decodedPayload[`webgl`][`max_renderbuffer_size`] = rawPayload[this.signalKeys[`webgl.max_renderbuffer_size`]];
      decodedPayload[`webgl`][`max_texture_image_units`] = rawPayload[this.signalKeys[`webgl.max_texture_image_units`]];
      decodedPayload[`webgl`][`max_texture_size`] = rawPayload[this.signalKeys[`webgl.max_texture_size`]];
      decodedPayload[`webgl`][`max_varying_vectors`] = rawPayload[this.signalKeys[`webgl.max_varying_vectors`]];
      decodedPayload[`webgl`][`max_vertex_attribs`] = rawPayload[this.signalKeys[`webgl.max_vertex_attribs`]];
      decodedPayload[`webgl`][`max_vertex_texture_image_units`] = rawPayload[this.signalKeys[`webgl.max_vertex_texture_image_units`]];
      decodedPayload[`webgl`][`max_vertex_uniform_vectors`] = rawPayload[this.signalKeys[`webgl.max_vertex_uniform_vectors`]];
      decodedPayload[`webgl`][`max_viewport_dims`] = rawPayload[this.signalKeys[`webgl.max_viewport_dims`]];
      decodedPayload[`webgl`][`red_bits`] = rawPayload[this.signalKeys[`webgl.red_bits`]];
      decodedPayload[`webgl`][`renderer`] = rawPayload[this.signalKeys[`webgl.renderer`]];
      decodedPayload[`webgl`][`shading_language_version`] = rawPayload[this.signalKeys[`webgl.shading_language_version`]];
      decodedPayload[`webgl`][`stencil_bits`] = rawPayload[this.signalKeys[`webgl.stencil_bits`]];
      decodedPayload[`webgl`][`vendor`] = rawPayload[this.signalKeys[`webgl.vendor`]];
      decodedPayload[`webgl`][`version`] = rawPayload[this.signalKeys[`webgl.version`]];
      decodedPayload[`webgl`][`shader_precision_vertex_high_float`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_high_float`]];
      decodedPayload[`webgl`][`shader_precision_vertex_high_float_min`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_high_float_min`]];
      decodedPayload[`webgl`][`shader_precision_vertex_high_float_max`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_high_float_max`]];
      decodedPayload[`webgl`][`shader_precision_vertex_medium_float`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_medium_float`]];
      decodedPayload[`webgl`][`shader_precision_vertex_medium_float_min`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_medium_float_min`]];
      decodedPayload[`webgl`][`shader_precision_vertex_medium_float_max`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_medium_float_max`]];
      decodedPayload[`webgl`][`shader_precision_vertex_low_float`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_low_float`]];
      decodedPayload[`webgl`][`shader_precision_vertex_low_float_min`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_low_float_min`]];
      decodedPayload[`webgl`][`shader_precision_vertex_low_float_max`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_low_float_max`]];
      decodedPayload[`webgl`][`shader_precision_fragment_high_float`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_high_float`]];
      decodedPayload[`webgl`][`shader_precision_fragment_high_float_min`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_high_float_min`]];
      decodedPayload[`webgl`][`shader_precision_fragment_high_float_max`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_high_float_max`]];
      decodedPayload[`webgl`][`shader_precision_fragment_medium_float`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_medium_float`]];
      decodedPayload[`webgl`][`shader_precision_fragment_medium_float_min`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_medium_float_min`]];
      decodedPayload[`webgl`][`shader_precision_fragment_medium_float_max`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_medium_float_max`]];
      decodedPayload[`webgl`][`shader_precision_fragment_low_float`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_low_float`]];
      decodedPayload[`webgl`][`shader_precision_fragment_low_float_min`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_low_float_min`]];
      decodedPayload[`webgl`][`shader_precision_fragment_low_float_max`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_low_float_max`]];
      decodedPayload[`webgl`][`shader_precision_vertex_high_int`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_high_int`]];
      decodedPayload[`webgl`][`shader_precision_vertex_high_int_min`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_high_int_min`]];
      decodedPayload[`webgl`][`shader_precision_vertex_high_int_max`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_high_int_max`]];
      decodedPayload[`webgl`][`shader_precision_vertex_medium_int`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_medium_int`]];
      decodedPayload[`webgl`][`shader_precision_vertex_medium_int_min`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_medium_int_min`]];
      decodedPayload[`webgl`][`shader_precision_vertex_medium_int_max`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_medium_int_max`]];
      decodedPayload[`webgl`][`shader_precision_vertex_low_int`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_low_int`]];
      decodedPayload[`webgl`][`shader_precision_vertex_low_int_min`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_low_int_min`]];
      decodedPayload[`webgl`][`shader_precision_vertex_low_int_max`] = rawPayload[this.signalKeys[`webgl.shader_precision_vertex_low_int_max`]];
      decodedPayload[`webgl`][`shader_precision_fragment_high_int`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_high_int`]];
      decodedPayload[`webgl`][`shader_precision_fragment_high_int_min`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_high_int_min`]];
      decodedPayload[`webgl`][`shader_precision_fragment_high_int_max`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_high_int_max`]];
      decodedPayload[`webgl`][`shader_precision_fragment_medium_int`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_medium_int`]];
      decodedPayload[`webgl`][`shader_precision_fragment_medium_int_min`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_medium_int_min`]];
      decodedPayload[`webgl`][`shader_precision_fragment_medium_int_max`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_medium_int_max`]];
      decodedPayload[`webgl`][`shader_precision_fragment_low_int`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_low_int`]];
      decodedPayload[`webgl`][`shader_precision_fragment_low_int_min`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_low_int_min`]];
      decodedPayload[`webgl`][`shader_precision_fragment_low_int_max`] = rawPayload[this.signalKeys[`webgl.shader_precision_fragment_low_int_max`]];
      decodedPayload[`webgl`][`unmasked_vendor_webgl`] = rawPayload[this.signalKeys[`webgl.unmasked_vendor_webgl`]];
      decodedPayload[`webgl`][`unmasked_renderer_webgl`] = rawPayload[this.signalKeys[`webgl.unmasked_renderer_webgl`]];
    }

    if (this.signalKeys[`webgl_meta`] in rawDecodedPayload) {

      decodedPayload[`webgl_meta`] = {};
      const rawPayload = rawDecodedPayload[this.signalKeys[`webgl_meta`]];

      decodedPayload[`webgl_meta`][`webgl_rendering_context_get_parameter`] = rawPayload[this.signalKeys[`webgl_meta.webgl_rendering_context_get_parameter`]];
      decodedPayload[`webgl_meta`][`is_native_webgl_rendering_context_get_parameter`] = rawPayload[this.signalKeys[`webgl_meta.is_native_webgl_rendering_context_get_parameter`]];
    }

    if (this.signalKeys[`touch_event`] in rawDecodedPayload) {

      decodedPayload[`touch_event`] = {};
      const rawPayload = decode(this.encoders[12][0].decoder, rawDecodedPayload[this.signalKeys[`touch_event`]]);

      decodedPayload[`touch_event`][`max_touch_points`] = rawPayload[this.signalKeys[`touch_event.max_touch_points`]];
      decodedPayload[`touch_event`][`has_touch_event`] = rawPayload[this.signalKeys[`touch_event.has_touch_event`]];
      decodedPayload[`touch_event`][`on_touch_start_is_undefined`] = rawPayload[this.signalKeys[`touch_event.on_touch_start_is_undefined`]];
    }

    if (this.signalKeys[`video`] in rawDecodedPayload) {

      decodedPayload[`video`] = {};
      const rawPayload = decode(this.encoders[12][1].decoder, rawDecodedPayload[this.signalKeys[`video`]]);

      decodedPayload[`video`][`can_play_type_video_ogg`] = rawPayload[this.signalKeys[`video.can_play_type_video_ogg`]];
      decodedPayload[`video`][`can_play_type_video_mp4`] = rawPayload[this.signalKeys[`video.can_play_type_video_mp4`]];
      decodedPayload[`video`][`can_play_type_video_webm`] = rawPayload[this.signalKeys[`video.can_play_type_video_webm`]];
    }

    if (this.signalKeys[`audio`] in rawDecodedPayload) {

      decodedPayload[`audio`] = {};
      const rawPayload = decode(this.encoders[12][2].decoder, rawDecodedPayload[this.signalKeys[`audio`]]);

      decodedPayload[`audio`][`can_play_type_audio_ogg`] = rawPayload[this.signalKeys[`audio.can_play_type_audio_ogg`]];
      decodedPayload[`audio`][`can_play_type_audio_mpeg`] = rawPayload[this.signalKeys[`audio.can_play_type_audio_mpeg`]];
      decodedPayload[`audio`][`can_play_type_audio_wav`] = rawPayload[this.signalKeys[`audio.can_play_type_audio_wav`]];
      decodedPayload[`audio`][`can_play_type_audio_xm4a`] = rawPayload[this.signalKeys[`audio.can_play_type_audio_xm4a`]];
    }

    decodedPayload[`navigator_vendor`] = rawDecodedPayload[this.signalKeys[`navigator_vendor`]];
    decodedPayload[`navigator_product`] = rawDecodedPayload[this.signalKeys[`navigator_product`]];
    decodedPayload[`navigator_product_sub`] = rawDecodedPayload[this.signalKeys[`navigator_product_sub`]];

    if (this.signalKeys[`browser`] in rawDecodedPayload) {

      decodedPayload[`browser`] = {};
      const rawPayload = decode(this.encoders[12][3].decoder, rawDecodedPayload[this.signalKeys[`browser`]]);

      decodedPayload[`browser`][`is_internet_explorer`] = rawPayload[this.signalKeys[`browser.is_internet_explorer`]];
      decodedPayload[`browser`][`is_chrome`] = rawPayload[this.signalKeys[`browser.is_chrome`]];

      const chrome = this.signalKeys[`browser.chrome`];

      if (chrome in rawPayload) {
        decodedPayload[`browser`][`chrome`] = {};
        decodedPayload[`browser`][`chrome`][`load_times`] = rawPayload[chrome][this.signalKeys[`browser.chrome.load_times`]];
        decodedPayload[`browser`][`chrome`][`app`] = rawPayload[chrome][this.signalKeys[`browser.chrome.app`]];
      }

      decodedPayload[`browser`][`webdriver`] = rawPayload[this.signalKeys[`browser.webdriver`]];
      decodedPayload[`browser`][`connection_rtt`] = rawPayload[this.signalKeys[`browser.connection_rtt`]];
    }

    if (this.signalKeys[`window`] in rawDecodedPayload) {

      decodedPayload[`window`] = {};
      const rawPayload = decode(this.encoders[12][4].decoder, rawDecodedPayload[this.signalKeys[`window`]]);

      decodedPayload[`window`][`history_length`] = rawPayload[this.signalKeys[`window.history_length`]];
      decodedPayload[`window`][`navigator_hardware_concurrency`] = rawPayload[this.signalKeys[`window.navigator_hardware_concurrency`]];
      decodedPayload[`window`][`is_window_self_not_window_top`] = rawPayload[this.signalKeys[`window.is_window_self_not_window_top`]];
      decodedPayload[`window`][`is_native_navigator_get_battery`] = rawPayload[this.signalKeys[`window.is_native_navigator_get_battery`]];
      decodedPayload[`window`][`console_debug_name`] = rawPayload[this.signalKeys[`window.console_debug_name`]];
      decodedPayload[`window`][`is_native_console_debug`] = rawPayload[this.signalKeys[`window.is_native_console_debug`]];
      decodedPayload[`window`][`_phantom`] = rawPayload[this.signalKeys[`window._phantom`]];
      decodedPayload[`window`][`call_phantom`] = rawPayload[this.signalKeys[`window.call_phantom`]];
      decodedPayload[`window`][`empty`] = rawPayload[this.signalKeys[`window.empty`]];
      decodedPayload[`window`][`persistent`] = rawPayload[this.signalKeys[`window.persistent`]];
      decodedPayload[`window`][`temporary`] = rawPayload[this.signalKeys[`window.temporary`]];

      const performanceObserver = this.signalKeys[`window.performance_observer`];
      if (performanceObserver in rawPayload) {
        decodedPayload[`window`][`performance_observer`] = {};
        decodedPayload[`window`][`performance_observer`][`supported_entry_types`] = rawPayload[performanceObserver][this.signalKeys[`window.performance_observer.supported_entry_types`]];
      }
    }

    if (this.signalKeys[`document`] in rawDecodedPayload) {

      decodedPayload[`document`] = {};
      const rawPayload = rawDecodedPayload[this.signalKeys[`document`]];

      decodedPayload[`document`][`document_location_protocol`] = rawPayload[this.signalKeys[`document.document_location_protocol`]];

    }

    decodedPayload[`canvas_fonts`] = rawDecodedPayload[this.signalKeys[`canvas_fonts`]];

    if (this.signalKeys[`document_children`] in rawDecodedPayload) {

      decodedPayload[`document_children`] = {};
      const rawPayload = rawDecodedPayload[this.signalKeys[`document_children`]];

      decodedPayload[`document_children`][`document_script_element_children`] = rawPayload[this.signalKeys[`document_children.document_script_element_children`]];
      decodedPayload[`document_children`][`document_head_element_children`] = rawPayload[this.signalKeys[`document_children.document_head_element_children`]];
    }


    if (this.signalKeys[`webgl_rendering_call`] in rawDecodedPayload) {

      decodedPayload[`webgl_rendering_call`] = {};
      const rawPayload = decode(this.encoders[12][5].decoder, rawDecodedPayload[this.signalKeys[`webgl_rendering_call`]]);

      decodedPayload[`webgl_rendering_call`][`webgl_rendering_context_prototype_get_parameter_call_a`] = rawPayload[this.signalKeys[`webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_a`]];
      decodedPayload[`webgl_rendering_call`][`webgl_rendering_context_prototype_get_parameter_call_b`] = rawPayload[this.signalKeys[`webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_b`]];
      decodedPayload[`webgl_rendering_call`][`hash`] = rawPayload[this.signalKeys[`webgl_rendering_call.hash`]];
    }

    decodedPayload[`window_object_get_own_property_names`] = decode(this.encoders[12][6].decoder, rawDecodedPayload[this.signalKeys[`window_object_get_own_property_names`]]);

    if (this.signalKeys[`visual_view_port`] in rawDecodedPayload) {

      decodedPayload[`visual_view_port`] = {};
      const rawPayload = decode(this.encoders[12][7].decoder, rawDecodedPayload[this.signalKeys[`visual_view_port`]]);

      decodedPayload[`visual_view_port`][`visual_view_port_width`] = rawPayload[this.signalKeys[`visual_view_port.visual_view_port_width`]];
      decodedPayload[`visual_view_port`][`visual_view_port_height`] = rawPayload[this.signalKeys[`visual_view_port.visual_view_port_height`]];
      decodedPayload[`visual_view_port`][`visual_view_port_scale`] = rawPayload[this.signalKeys[`visual_view_port.visual_view_port_scale`]];
    }

    if (!dropUniqueKey) {
      decodedPayload[this.key] = this.key_value;
    }

    return decodedPayload;
  }

}


module.exports = Reese84;
