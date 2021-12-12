
const ajv = require(`ajv`);
const generate = require(`@babel/generator`).default;

const { extractXorEncoders, extractSignalsKeys, extractStAndSr } = require(`./extract.js`);
const { fromString, fromFile } = require(`../ast.js`);

const clearConcealedStringsPayload = require(`./transformations/clear-concealed-strings-payload.js`);
const ensureBlockStatements = require(`./transformations/ensure-block-statements.js`);
const expandSequenceExpressions = require(`./transformations/expand-sequence-expressions.js`);
const removeQueryParamD = require(`./transformations/remove-query-param-d.js`);
const renameXorShift128 = require(`./transformations/rename-xor-shift-128.js`);
const replacePostbackUrl = require(`./transformations/replace-postback-url.js`);
const replaceSubstrStrings = require(`./transformations/replace-substr-strings.js`);

const PayloadSchema = require(`./schema.js`);

function byteIndex(a) {
  return `\\u` + (`0000` + a.charCodeAt(0).toString(16)).substr(-4);
}

const byteRegex = new RegExp(`[\\u007F-\\uFFFF]`, `g`);

class Reese84 {

  constructor(ast) {
    this.ast = ast;

    this.encoders = extractXorEncoders(ast);
    this.signalKeys = extractSignalsKeys(ast);

    const { st, sr } = extractStAndSr(ast);

    this.st = st;
    this.sr = sr;
    this.key = this.signalKeys.key.value;
    this.key_value = this.signalKeys.key_value.value;

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
    ].map((t) => t(ast));

  }

  createCollectorScript(payloadUrl){

    const ast = fromString(generate(this.ast).code);
    ast.postbackUrl = payloadUrl;

    replacePostbackUrl(ast);
    removeQueryParamD(ast);

    return generate(ast).code;

  }

  createPayload(data, options = {}) {

    const error = options.error || null;
    const oldToken = options.old_token || null;
    const interrogation = options.interrogation || (Math.random() * (1000 - 100) + 100);
    const cr = options.cr || (Math.random() * 1073741824 | 0);
    const version = options.version || `stable`;

    const encodedPayload = this.encodePayload(data, cr);

    return {
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
        "interrogation" : interrogation
      }
    };

  }

  encodePayload(data, xor) {

    const encode = (encoder, data) => {
      let mutatedData = null;
      //Convert the data into a JSON string, replacing undefined values with nulls.
      mutatedData = JSON.stringify(data, function (key, value) {
        return value === undefined ? null : value;
      });
      //Replace any byte encoded strings
      mutatedData = mutatedData.replace(byteRegex, byteIndex);
      //Apply the series of encoder loops, and returns the result as a Base64 string
      mutatedData = encoder(mutatedData, Number(xor));

      return mutatedData;

    };

    console.log(data);
    const encodedPayload = encode(this.encoders[7][0].encoder, {
      [this.signalKeys.user_agent.value] : data.user_agent,
      [this.signalKeys.navigator_language.value] : data.navigator_language,
      [this.signalKeys.navigator_languages.navigator_languages.value] : {
        [this.signalKeys.navigator_languages.languages_is_not_undefined.value] : data.navigator_languages?.languages_is_not_undefined
      },
      [this.signalKeys.window_size.window_size.value] : encode(this.encoders[0][0].encoder, {
        [this.signalKeys.window_size.window_screen_width.value] : data.window_size?.window_screen_width,
        [this.signalKeys.window_size.window_screen_height.value] : data.window_size?.window_screen_height,
        [this.signalKeys.window_size.window_screen_avail_height.value] : data.window_size?.window_screen_avail_height,
        [this.signalKeys.window_size.window_screen_avail_left.value] : data.window_size?.window_screen_avail_left,
        [this.signalKeys.window_size.window_screen_avail_top.value] : data.window_size?.window_screen_avail_top,
        [this.signalKeys.window_size.window_screen_avail_width.value] : data.window_size?.window_screen_avail_width,
        [this.signalKeys.window_size.window_screen_pixel_depth.value] : data.window_size?.window_screen_pixel_depth,
        [this.signalKeys.window_size.window_inner_width.value] : data.window_size?.window_inner_width,
        [this.signalKeys.window_size.window_inner_height.value] : data.window_size?.window_inner_height,
        [this.signalKeys.window_size.window_outer_width.value] : data.window_size?.window_outer_width,
        [this.signalKeys.window_size.window_outer_height.value] : data.window_size?.window_outer_height,
        [this.signalKeys.window_size.window_device_pixel_ratio.value] : data.window_size?.window_device_pixel_ratio,
        [this.signalKeys.window_size.window_screen_orientation_type.value] : data.window_size?.window_screen_orientation_type,
        [this.signalKeys.window_size.window_screenX.value] : data.window_size?.window_screenX,
        [this.signalKeys.window_size.window_screenY.value] : data.window_size?.window_screenY,
      }),
      [this.signalKeys.date_get_time_zone_off_set.value] : data.date_get_time_zone_off_set,
      [this.signalKeys.has_indexed_db.value] : data.has_indexed_db,
      [this.signalKeys.has_body_add_behaviour.value] : data.has_body_add_behaviour,
      [this.signalKeys.open_database.value] : data.open_database,
      [this.signalKeys.cpu_class.value] : data.cpu_class,
      [this.signalKeys.platform.value] : data.platform,
      [this.signalKeys.do_not_track.value] : data.do_not_track,
      [this.signalKeys.plugins_or_active_x_object.value] : data.plugins_or_active_x_object,
      [this.signalKeys.plugins_named_item_item_refresh.plugins_named_item_item_refresh.value] : {
        [this.signalKeys.plugins_named_item_item_refresh.named_item.value] : data.plugins_named_item_item_refresh?.named_item,
        [this.signalKeys.plugins_named_item_item_refresh.item.value] : data.plugins_named_item_item_refresh?.item,
        [this.signalKeys.plugins_named_item_item_refresh.refresh.value] : data.plugins_named_item_item_refresh?.refresh
      },
      [this.signalKeys.canvas_hash.canvas_hash.value] : encode(this.encoders[1][1].encoder, {
        [this.signalKeys.canvas_hash.is_point_in_path.value] : data.canvas_hash?.is_point_in_path,
        [this.signalKeys.canvas_hash.to_data_url_image.value] : data.canvas_hash?.to_data_url_image,
        [this.signalKeys.canvas_hash.screen_is_global_composite_operation.value] : data.canvas_hash?.screen_is_global_composite_operation,
        [this.signalKeys.canvas_hash.hash.value] : encode(this.encoders[1][0].encoder, data.canvas_hash.hash),
      }),
      [this.signalKeys.webgl.webgl.value] : encode(this.encoders[5][1].encoder, {
        [this.signalKeys.webgl.get_supported_extensions.value] : data.webgl.get_supported_extensions,
        [this.signalKeys.webgl.canvas_hash.value] : encode(this.encoders[5][0].encoder, data.webgl.canvas_hash),
        [this.signalKeys.webgl.canvas_hash_error.value] : data.webgl?.canvas_hash_error,
        [this.signalKeys.webgl.aliased_line_width_range.value] : data.webgl?.aliased_line_width_range,
        [this.signalKeys.webgl.aliased_point_size_range.value] : data.webgl?.aliased_point_size_range,
        [this.signalKeys.webgl.alpha_bits.value] : data.webgl?.alpha_bits,
        [this.signalKeys.webgl.antialias.value] : data.webgl?.antialias,
        [this.signalKeys.webgl.blue_bits.value] : data.webgl?.blue_bits,
        [this.signalKeys.webgl.green_bits.value] : data.webgl?.green_bits,
        [this.signalKeys.webgl.depth_bits.value] : data.webgl?.depth_bits,
        [this.signalKeys.webgl.all_bits.value] : data.webgl?.all_bits,
        [this.signalKeys.webgl.max_combined_texture_image_units.value] : data.webgl?.max_combined_texture_image_units,
        [this.signalKeys.webgl.max_cube_map_texture_size.value] : data.webgl?.max_cube_map_texture_size,
        [this.signalKeys.webgl.max_fragment_uniform_vectors.value] : data.webgl?.max_fragment_uniform_vectors,
        [this.signalKeys.webgl.max_renderbuffer_size.value] : data.webgl?.max_renderbuffer_size,
        [this.signalKeys.webgl.max_texture_image_units.value] : data.webgl?.max_texture_image_units,
        [this.signalKeys.webgl.max_texture_size.value] : data.webgl?.max_texture_size,
        [this.signalKeys.webgl.max_varying_vectors.value] : data.webgl?.max_varying_vectors,
        [this.signalKeys.webgl.max_vertex_attribs.value] : data.webgl?.max_vertex_attribs,
        [this.signalKeys.webgl.max_vertex_texture_image_units.value] : data.webgl?.max_vertex_texture_image_units,
        [this.signalKeys.webgl.max_vertex_uniform_vectors.value] : data.webgl?.max_vertex_uniform_vectors,
        [this.signalKeys.webgl.max_viewport_dims.value] : data.webgl?.max_viewport_dims,
        [this.signalKeys.webgl.red_bits.value] : data.webgl?.red_bits,
        [this.signalKeys.webgl.renderer.value] : data.webgl?.renderer,
        [this.signalKeys.webgl.shading_language_version.value] : data.webgl?.shading_language_version,
        [this.signalKeys.webgl.stencil_bits.value] : data.webgl?.stencil_bits,
        [this.signalKeys.webgl.vendor.value] : data.webgl?.vendor,
        [this.signalKeys.webgl.version.value] : data.webgl?.version,
        [this.signalKeys.webgl.shader_precision_vertex_low_float.value] : data.webgl?.shader_precision_vertex_low_float,
        [this.signalKeys.webgl.shader_precision_vertex_low_float_min.value] : data.webgl?.shader_precision_vertex_low_float_min,
        [this.signalKeys.webgl.shader_precision_vertex_low_float_max.value] : data.webgl?.shader_precision_vertex_low_float_max,
        [this.signalKeys.webgl.shader_precision_vertex_medium_float.value] : data.webgl?.shader_precision_vertex_medium_float,
        [this.signalKeys.webgl.shader_precision_vertex_medium_float_min.value] : data.webgl?.shader_precision_vertex_medium_float_min,
        [this.signalKeys.webgl.shader_precision_vertex_medium_float_max.value] : data.webgl?.shader_precision_vertex_medium_float_max,
        [this.signalKeys.webgl.shader_precision_vertex_high_float.value] : data.webgl?.shader_precision_vertex_high_float,
        [this.signalKeys.webgl.shader_precision_vertex_high_float_min.value] : data.webgl?.shader_precision_vertex_high_float_min,
        [this.signalKeys.webgl.shader_precision_vertex_high_float_max.value] : data.webgl?.shader_precision_vertex_high_float_max,
        [this.signalKeys.webgl.shader_precision_vertex_low_int.value] : data.webgl?.shader_precision_vertex_low_int,
        [this.signalKeys.webgl.shader_precision_vertex_low_int_min.value] : data.webgl?.shader_precision_vertex_low_int_min,
        [this.signalKeys.webgl.shader_precision_vertex_low_int_max.value] : data.webgl?.shader_precision_vertex_low_int_max,
        [this.signalKeys.webgl.shader_precision_vertex_medium_int.value] : data.webgl?.shader_precision_vertex_medium_int,
        [this.signalKeys.webgl.shader_precision_vertex_medium_int_min.value] : data.webgl?.shader_precision_vertex_medium_int_min,
        [this.signalKeys.webgl.shader_precision_vertex_medium_int_max.value] : data.webgl?.shader_precision_vertex_medium_int_max,
        [this.signalKeys.webgl.shader_precision_vertex_high_int.value] : data.webgl?.shader_precision_vertex_high_int,
        [this.signalKeys.webgl.shader_precision_vertex_high_int_min.value] : data.webgl?.shader_precision_vertex_high_int_min,
        [this.signalKeys.webgl.shader_precision_vertex_high_int_max.value] : data.webgl?.shader_precision_vertex_high_int_max,
        [this.signalKeys.webgl.shader_precision_fragment_low_float.value] : data.webgl?.shader_precision_fragment_low_float,
        [this.signalKeys.webgl.shader_precision_fragment_low_float_min.value] : data.webgl?.shader_precision_fragment_low_float_min,
        [this.signalKeys.webgl.shader_precision_fragment_low_float_max.value] : data.webgl?.shader_precision_fragment_low_float_max,
        [this.signalKeys.webgl.shader_precision_fragment_medium_float.value] : data.webgl?.shader_precision_fragment_medium_float,
        [this.signalKeys.webgl.shader_precision_fragment_medium_float_min.value] : data.webgl?.shader_precision_fragment_medium_float_min,
        [this.signalKeys.webgl.shader_precision_fragment_medium_float_max.value] : data.webgl?.shader_precision_fragment_medium_float_max,
        [this.signalKeys.webgl.shader_precision_fragment_high_float.value] : data.webgl?.shader_precision_fragment_high_float,
        [this.signalKeys.webgl.shader_precision_fragment_high_float_min.value] : data.webgl?.shader_precision_fragment_high_float_min,
        [this.signalKeys.webgl.shader_precision_fragment_high_float_max.value] : data.webgl?.shader_precision_fragment_high_float_max,
        [this.signalKeys.webgl.shader_precision_fragment_low_int.value] : data.webgl?.shader_precision_fragment_low_int,
        [this.signalKeys.webgl.shader_precision_fragment_low_int_min.value] : data.webgl?.shader_precision_fragment_low_int_min,
        [this.signalKeys.webgl.shader_precision_fragment_low_int_max.value] : data.webgl?.shader_precision_fragment_low_int_max,
        [this.signalKeys.webgl.shader_precision_fragment_medium_int.value] : data.webgl?.shader_precision_fragment_medium_int,
        [this.signalKeys.webgl.shader_precision_fragment_medium_int_min.value] : data.webgl?.shader_precision_fragment_medium_int_min,
        [this.signalKeys.webgl.shader_precision_fragment_medium_int_max.value] : data.webgl?.shader_precision_fragment_medium_int_max,
        [this.signalKeys.webgl.shader_precision_fragment_high_int.value] : data.webgl?.shader_precision_fragment_high_int,
        [this.signalKeys.webgl.shader_precision_fragment_high_int_min.value] : data.webgl?.shader_precision_fragment_high_int_min,
        [this.signalKeys.webgl.shader_precision_fragment_high_int_max.value] : data.webgl?.shader_precision_fragment_high_int_max,
        [this.signalKeys.webgl.unmasked_vendor_webgl.value] : data.webgl?.unmasked_vendor_webgl,
        [this.signalKeys.webgl.unmasked_renderer_webgl.value] : data.webgl?.unmasked_renderer_webgl
      }),
      [this.signalKeys.webgl_meta.webgl_meta.value] : {
        [this.signalKeys.webgl_meta.webgl_rendering_context_get_parameter.value] : data.webgl_meta.webgl_rendering_context_get_parameter,
        [this.signalKeys.webgl_meta.is_native_webgl_rendering_context_get_parameter.value] : data.webgl_meta.is_native_webgl_rendering_context_get_parameter
      },
      [this.signalKeys.touch_event.touch_event.value] : encode(this.encoders[6][0].encoder, {
        [this.signalKeys.touch_event.max_touch_points.value] : data.touch_event?.max_touch_points,
        [this.signalKeys.touch_event.has_touch_event.value] : data.touch_event?.has_touch_event,
        [this.signalKeys.touch_event.on_touch_start_is_undefined.value] : data.touch_event?.on_touch_start_is_undefined
      }),
      [this.signalKeys.navigator_vendor.value] : data.navigator_vendor,
      [this.signalKeys.navigator_product.value] : data.navigator_product,
      [this.signalKeys.navigator_product_sub.value] : data.navigator_product_sub,
      [this.signalKeys.document.document.value] : {
        [this.signalKeys.document.document_location_protocol.value] : data.document?.document_location_protocol,
      },
      [this.signalKeys.canvas_fonts.value] : data.canvas_fonts,
      [this.signalKeys.document_children.document_children.value] : {
        [this.signalKeys.document_children.document_script_element_children.value] : data.document_children?.document_script_element_children,
        [this.signalKeys.document_children.document_head_element_children.value] : data.document_children?.document_head_element_children
      },
      [this.signalKeys.video.video.value] : encode(this.encoders[6][1].encoder, {
        [this.signalKeys.video.can_play_type_video_ogg.value] : data.video?.can_play_type_video_ogg,
        [this.signalKeys.video.can_play_type_video_mp4.value] : data.video?.can_play_type_video_mp4,
        [this.signalKeys.video.can_play_type_video_webm.value] : data.video?.can_play_type_video_webm
      }),
      [this.signalKeys.audio.audio.value] : encode(this.encoders[6][2].encoder, {
        [this.signalKeys.audio.can_play_type_audio_ogg.value] : data.audio?.can_play_type_audio_ogg,
        [this.signalKeys.audio.can_play_type_audio_mpeg.value] : data.audio?.can_play_type_audio_mpeg,
        [this.signalKeys.audio.can_play_type_audio_wav.value] : data.audio?.can_play_type_audio_wav,
        [this.signalKeys.audio.can_play_type_audio_xm4a.value] : data.audio?.can_play_type_audio_xm4a
      }),
      [this.signalKeys.browser.browser.value] : encode(this.encoders[6][3].encoder, {
        [this.signalKeys.browser.is_internet_explorer.value] : data.browser?.is_internet_explorer,
        [this.signalKeys.browser.is_chrome.value] : data.browser?.is_chrome,
        [this.signalKeys.browser.chrome.chrome.value] : {
          [this.signalKeys.browser.chrome.load_times.value] : data.browser.chrome?.load_times,
          [this.signalKeys.browser.chrome.app.value] : data.browser.chrome?.app
        },
        [this.signalKeys.browser.webdriver.value] : data.browser?.webdriver,
        [this.signalKeys.browser.connection_rtt.value] : data.browser?.connection_rtt
      }),
      [this.signalKeys.window.window.value] : encode(this.encoders[6][4].encoder, {
        [this.signalKeys.window.history_length.value] : data.window?.history_length,
        [this.signalKeys.window.navigator_hardware_concurrency.value] : data.window?.navigator_hardware_concurrency,
        [this.signalKeys.window.is_window_self_not_window_top.value] : data.window?.is_window_self_not_window_top,
        [this.signalKeys.window.is_native_navigator_get_battery.value] : data.window?.is_native_navigator_get_battery,
        [this.signalKeys.window.console_debug_name.value] : data.window?.console_debug_name,
        [this.signalKeys.window.is_native_console_debug.value] : data.window?.is_native_console_debug,
        [this.signalKeys.window._phantom.value] : data.window?._phantom,
        [this.signalKeys.window.call_phantom.value] : data.window?.call_phantom,
        [this.signalKeys.window.empty.value] : data.window?.empty,
        [this.signalKeys.window.persistent.value] : data.window?.persistent,
        [this.signalKeys.window.temporary.value] : data.window?.temporary,
        [this.signalKeys.window.performance_observer.performance_observer.value] : {
          [this.signalKeys.window.performance_observer.supported_entry_types.value] : data.window?.performance_observer.supported_entry_types
        }
      }),
      [this.signalKeys.webgl_rendering_call.webgl_rendering_call.value] : encode(this.encoders[6][5].encoder, {
        [this.signalKeys.webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_a.value] : data.webgl_rendering_call?.webgl_rendering_context_prototype_get_parameter_call_a,
        [this.signalKeys.webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_b.value] : data.webgl_rendering_call?.webgl_rendering_context_prototype_get_parameter_call_b
      }),
      [this.signalKeys.window_object_get_own_property_names.value] : encode(this.encoders[6][6].encoder, data.window_object_get_own_property_names),
      [this.signalKeys.visual_view_port.visual_view_port.value] : encode(this.encoders[6][7].encoder, {
        [this.signalKeys.visual_view_port.visual_view_port_width.value] : data.visual_view_port?.visual_view_port_width,
        [this.signalKeys.visual_view_port.visual_view_port_height.value] : data.visual_view_port?.visual_view_port_height,
        [this.signalKeys.visual_view_port.visual_view_port_scale.value] : data.visual_view_port?.visual_view_port_scale
      }),
      [this.key] : this.key_value
    });

    return encodedPayload;
  }

  decodePayload(data, xor, dropUniqueKey=true){

    const decode = (decoder, data) => {
      let mutatedData = null;
      //Apply the series of encoder loops, and returns the result as a Base64 string
      mutatedData = decoder(data, Number(xor));

      return mutatedData;

    };

    const rawDecodedPayload = decode(this.encoders[7][0].decoder, data);
    const decodedPayload = {};

    decodedPayload[`user_agent`] = rawDecodedPayload[this.signalKeys.user_agent.value];
    decodedPayload[`navigator_language`] = rawDecodedPayload[this.signalKeys.navigator_language.value];

    if(this.signalKeys.navigator_languages.navigator_languages.value in rawDecodedPayload){

      decodedPayload[`navigator_languages`] = {};
      const rawPayload = rawDecodedPayload[this.signalKeys.navigator_languages.navigator_languages.value];

      decodedPayload[`navigator_languages`][`languages_is_not_undefined`] = rawPayload[this.signalKeys.navigator_languages.languages_is_not_undefined.value];

    }
    if(this.signalKeys.window_size.window_size.value in rawDecodedPayload){

      decodedPayload[`window_size`] = {};
      const rawPayload = decode(this.encoders[0][0].decoder, rawDecodedPayload[this.signalKeys.window_size.window_size.value]);

      decodedPayload[`window_size`][`window_screen_width`] = rawPayload[this.signalKeys.window_size.window_screen_width.value];
      decodedPayload[`window_size`][`window_screen_height`] = rawPayload[this.signalKeys.window_size.window_screen_height.value];
      decodedPayload[`window_size`][`window_screen_avail_height`] = rawPayload[this.signalKeys.window_size.window_screen_avail_height.value];
      decodedPayload[`window_size`][`window_screen_avail_left`] = rawPayload[this.signalKeys.window_size.window_screen_avail_left.value];
      decodedPayload[`window_size`][`window_screen_avail_top`] = rawPayload[this.signalKeys.window_size.window_screen_avail_top.value];
      decodedPayload[`window_size`][`window_screen_avail_width`] = rawPayload[this.signalKeys.window_size.window_screen_avail_width.value];
      decodedPayload[`window_size`][`window_screen_pixel_depth`] = rawPayload[this.signalKeys.window_size.window_screen_pixel_depth.value];
      decodedPayload[`window_size`][`window_inner_width`] = rawPayload[this.signalKeys.window_size.window_inner_width.value];
      decodedPayload[`window_size`][`window_inner_height`] = rawPayload[this.signalKeys.window_size.window_inner_height.value];
      decodedPayload[`window_size`][`window_outer_width`] = rawPayload[this.signalKeys.window_size.window_outer_width.value];
      decodedPayload[`window_size`][`window_outer_height`] = rawPayload[this.signalKeys.window_size.window_outer_height.value];
      decodedPayload[`window_size`][`window_device_pixel_ratio`] = rawPayload[this.signalKeys.window_size.window_device_pixel_ratio.value];
      decodedPayload[`window_size`][`window_screen_orientation_type`] = rawPayload[this.signalKeys.window_size.window_screen_orientation_type.value];
      decodedPayload[`window_size`][`window_screenX`] = rawPayload[this.signalKeys.window_size.window_screenX.value];
      decodedPayload[`window_size`][`window_screenY`] = rawPayload[this.signalKeys.window_size.window_screenY.value];

    }
    decodedPayload[`date_get_time_zone_off_set`] = rawDecodedPayload[this.signalKeys.date_get_time_zone_off_set.value];
    decodedPayload[`has_indexed_db`] = rawDecodedPayload[this.signalKeys.has_indexed_db.value];
    decodedPayload[`has_body_add_behaviour`] = rawDecodedPayload[this.signalKeys.has_body_add_behaviour.value];
    decodedPayload[`open_database`] = rawDecodedPayload[this.signalKeys.open_database.value];
    decodedPayload[`cpu_class`] = rawDecodedPayload[this.signalKeys.cpu_class.value];
    decodedPayload[`platform`] = rawDecodedPayload[this.signalKeys.platform.value];
    decodedPayload[`do_not_track`] = rawDecodedPayload[this.signalKeys.do_not_track.value];
    decodedPayload[`plugins_or_active_x_object`] = rawDecodedPayload[this.signalKeys.plugins_or_active_x_object.value];

    if(this.signalKeys.plugins_named_item_item_refresh.plugins_named_item_item_refresh.value in rawDecodedPayload){

      decodedPayload[`plugins_named_item_item_refresh`] = {};
      const rawPayload = rawDecodedPayload[this.signalKeys.plugins_named_item_item_refresh.plugins_named_item_item_refresh.value];

      decodedPayload[`plugins_named_item_item_refresh`][`named_item`] = rawPayload[this.signalKeys.plugins_named_item_item_refresh.named_item.value];
      decodedPayload[`plugins_named_item_item_refresh`][`item`] = rawPayload[this.signalKeys.plugins_named_item_item_refresh.item.value];
      decodedPayload[`plugins_named_item_item_refresh`][`refresh`] = rawPayload[this.signalKeys.plugins_named_item_item_refresh.refresh.value];
    }

    if(this.signalKeys.canvas_hash.canvas_hash.value in rawDecodedPayload){

      decodedPayload[`canvas_hash`] = {};
      const rawPayload = decode(this.encoders[1][1].decoder, rawDecodedPayload[this.signalKeys.canvas_hash.canvas_hash.value]);

      decodedPayload[`canvas_hash`][`is_point_in_path`] = rawPayload[this.signalKeys.canvas_hash.is_point_in_path.value];
      decodedPayload[`canvas_hash`][`to_data_url_image`] = rawPayload[this.signalKeys.canvas_hash.to_data_url_image.value];
      decodedPayload[`canvas_hash`][`to_data_url_image_error`] = rawPayload[this.signalKeys.canvas_hash.to_data_url_image_error.value];
      decodedPayload[`canvas_hash`][`to_data_url_image_error`] === undefined && delete decodedPayload[`canvas_hash`][`to_data_url_image_error`];

      decodedPayload[`canvas_hash`][`screen_is_global_composite_operation`] = rawPayload[this.signalKeys.canvas_hash.screen_is_global_composite_operation.value];
      decodedPayload[`canvas_hash`][`hash`] = decode(this.encoders[1][0].decoder, rawPayload[this.signalKeys.canvas_hash.hash.value]);
    }

    if(this.signalKeys.webgl.webgl.value in rawDecodedPayload){

      decodedPayload[`webgl`] = {};
      const rawPayload = decode(this.encoders[5][0].decoder, rawDecodedPayload[this.signalKeys.webgl.webgl.value]);

      decodedPayload[`webgl`][`get_supported_extensions`] = rawPayload[this.signalKeys.webgl.get_supported_extensions.value];
      decodedPayload[`webgl`][`canvas_hash`] = decode(this.encoders[5][1].decoder, rawPayload[this.signalKeys.webgl.canvas_hash.value]);
      decodedPayload[`webgl`][`canvas_hash_error`] = rawPayload[this.signalKeys.webgl.canvas_hash_error.value];
      decodedPayload[`webgl`][`canvas_hash_error`] === undefined && delete decodedPayload[`webgl`][`canvas_hash_error`];

      decodedPayload[`webgl`][`aliased_line_width_range`] = rawPayload[this.signalKeys.webgl.aliased_line_width_range.value];
      decodedPayload[`webgl`][`aliased_point_size_range`] = rawPayload[this.signalKeys.webgl.aliased_point_size_range.value];
      decodedPayload[`webgl`][`alpha_bits`] = rawPayload[this.signalKeys.webgl.alpha_bits.value];
      decodedPayload[`webgl`][`antialias`] = rawPayload[this.signalKeys.webgl.antialias.value];
      decodedPayload[`webgl`][`blue_bits`] = rawPayload[this.signalKeys.webgl.blue_bits.value];
      decodedPayload[`webgl`][`green_bits`] = rawPayload[this.signalKeys.webgl.green_bits.value];
      decodedPayload[`webgl`][`depth_bits`] = rawPayload[this.signalKeys.webgl.depth_bits.value];
      decodedPayload[`webgl`][`all_bits`] = rawPayload[this.signalKeys.webgl.all_bits.value];
      decodedPayload[`webgl`][`max_combined_texture_image_units`] = rawPayload[this.signalKeys.webgl.max_combined_texture_image_units.value];
      decodedPayload[`webgl`][`max_cube_map_texture_size`] = rawPayload[this.signalKeys.webgl.max_cube_map_texture_size.value];
      decodedPayload[`webgl`][`max_fragment_uniform_vectors`] = rawPayload[this.signalKeys.webgl.max_fragment_uniform_vectors.value];
      decodedPayload[`webgl`][`max_renderbuffer_size`] = rawPayload[this.signalKeys.webgl.max_renderbuffer_size.value];
      decodedPayload[`webgl`][`max_texture_image_units`] = rawPayload[this.signalKeys.webgl.max_texture_image_units.value];
      decodedPayload[`webgl`][`max_texture_size`] = rawPayload[this.signalKeys.webgl.max_texture_size.value];
      decodedPayload[`webgl`][`max_varying_vectors`] = rawPayload[this.signalKeys.webgl.max_varying_vectors.value];
      decodedPayload[`webgl`][`max_vertex_attribs`] = rawPayload[this.signalKeys.webgl.max_vertex_attribs.value];
      decodedPayload[`webgl`][`max_vertex_texture_image_units`] = rawPayload[this.signalKeys.webgl.max_vertex_texture_image_units.value];
      decodedPayload[`webgl`][`max_vertex_uniform_vectors`] = rawPayload[this.signalKeys.webgl.max_vertex_uniform_vectors.value];
      decodedPayload[`webgl`][`max_viewport_dims`] = rawPayload[this.signalKeys.webgl.max_viewport_dims.value];
      decodedPayload[`webgl`][`red_bits`] = rawPayload[this.signalKeys.webgl.red_bits.value];
      decodedPayload[`webgl`][`renderer`] = rawPayload[this.signalKeys.webgl.renderer.value];
      decodedPayload[`webgl`][`shading_language_version`] = rawPayload[this.signalKeys.webgl.shading_language_version.value];
      decodedPayload[`webgl`][`stencil_bits`] = rawPayload[this.signalKeys.webgl.stencil_bits.value];
      decodedPayload[`webgl`][`vendor`] = rawPayload[this.signalKeys.webgl.vendor.value];
      decodedPayload[`webgl`][`version`] = rawPayload[this.signalKeys.webgl.version.value];
      decodedPayload[`webgl`][`shader_precision_vertex_low_float`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_low_float.value];
      decodedPayload[`webgl`][`shader_precision_vertex_low_float_min`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_low_float_min.value];
      decodedPayload[`webgl`][`shader_precision_vertex_low_float_max`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_low_float_max.value];
      decodedPayload[`webgl`][`shader_precision_vertex_medium_float`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_medium_float.value];
      decodedPayload[`webgl`][`shader_precision_vertex_medium_float_min`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_medium_float_min.value];
      decodedPayload[`webgl`][`shader_precision_vertex_medium_float_max`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_medium_float_max.value];
      decodedPayload[`webgl`][`shader_precision_vertex_high_float`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_high_float.value];
      decodedPayload[`webgl`][`shader_precision_vertex_high_float_min`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_high_float_min.value];
      decodedPayload[`webgl`][`shader_precision_vertex_high_float_max`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_high_float_max.value];
      decodedPayload[`webgl`][`shader_precision_vertex_low_int`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_low_int.value];
      decodedPayload[`webgl`][`shader_precision_vertex_low_int_min`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_low_int_min.value];
      decodedPayload[`webgl`][`shader_precision_vertex_low_int_max`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_low_int_max.value];
      decodedPayload[`webgl`][`shader_precision_vertex_medium_int`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_medium_int.value];
      decodedPayload[`webgl`][`shader_precision_vertex_medium_int_min`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_medium_int_min.value];
      decodedPayload[`webgl`][`shader_precision_vertex_medium_int_max`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_medium_int_max.value];
      decodedPayload[`webgl`][`shader_precision_vertex_high_int`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_high_int.value];
      decodedPayload[`webgl`][`shader_precision_vertex_high_int_min`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_high_int_min.value];
      decodedPayload[`webgl`][`shader_precision_vertex_high_int_max`] = rawPayload[this.signalKeys.webgl.shader_precision_vertex_high_int_max.value];
      decodedPayload[`webgl`][`shader_precision_fragment_low_float`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_low_float.value];
      decodedPayload[`webgl`][`shader_precision_fragment_low_float_min`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_low_float_min.value];
      decodedPayload[`webgl`][`shader_precision_fragment_low_float_max`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_low_float_max.value];
      decodedPayload[`webgl`][`shader_precision_fragment_medium_float`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_medium_float.value];
      decodedPayload[`webgl`][`shader_precision_fragment_medium_float_min`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_medium_float_min.value];
      decodedPayload[`webgl`][`shader_precision_fragment_medium_float_max`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_medium_float_max.value];
      decodedPayload[`webgl`][`shader_precision_fragment_high_float`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_high_float.value];
      decodedPayload[`webgl`][`shader_precision_fragment_high_float_min`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_high_float_min.value];
      decodedPayload[`webgl`][`shader_precision_fragment_high_float_max`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_high_float_max.value];
      decodedPayload[`webgl`][`shader_precision_fragment_low_int`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_low_int.value];
      decodedPayload[`webgl`][`shader_precision_fragment_low_int_min`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_low_int_min.value];
      decodedPayload[`webgl`][`shader_precision_fragment_low_int_max`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_low_int_max.value];
      decodedPayload[`webgl`][`shader_precision_fragment_medium_int`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_medium_int.value];
      decodedPayload[`webgl`][`shader_precision_fragment_medium_int_min`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_medium_int_min.value];
      decodedPayload[`webgl`][`shader_precision_fragment_medium_int_max`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_medium_int_max.value];
      decodedPayload[`webgl`][`shader_precision_fragment_high_int`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_high_int.value];
      decodedPayload[`webgl`][`shader_precision_fragment_high_int_min`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_high_int_min.value];
      decodedPayload[`webgl`][`shader_precision_fragment_high_int_max`] = rawPayload[this.signalKeys.webgl.shader_precision_fragment_high_int_max.value];
      decodedPayload[`webgl`][`unmasked_vendor_webgl`] = rawPayload[this.signalKeys.webgl.unmasked_vendor_webgl.value];
      decodedPayload[`webgl`][`unmasked_renderer_webgl`] = rawPayload[this.signalKeys.webgl.unmasked_renderer_webgl.value];
    }

    if(this.signalKeys.webgl_meta.webgl_meta.value in rawDecodedPayload){

      decodedPayload[`webgl_meta`] = {};
      const rawPayload = rawDecodedPayload[this.signalKeys.webgl_meta.webgl_meta.value];

      decodedPayload[`webgl_meta`][`webgl_rendering_context_get_parameter`] = rawPayload[this.signalKeys.webgl_meta.webgl_rendering_context_get_parameter.value];
      decodedPayload[`webgl_meta`][`is_native_webgl_rendering_context_get_parameter`] = rawPayload[this.signalKeys.webgl_meta.is_native_webgl_rendering_context_get_parameter.value];
    }

    if(this.signalKeys.touch_event.touch_event.value in rawDecodedPayload){

      decodedPayload[`touch_event`] = {};
      const rawPayload = decode(this.encoders[6][0].decoder, rawDecodedPayload[this.signalKeys.touch_event.touch_event.value]);

      decodedPayload[`touch_event`][`max_touch_points`] = rawPayload[this.signalKeys.touch_event.max_touch_points.value];
      decodedPayload[`touch_event`][`has_touch_event`] = rawPayload[this.signalKeys.touch_event.has_touch_event.value];
      decodedPayload[`touch_event`][`on_touch_start_is_undefined`] = rawPayload[this.signalKeys.touch_event.on_touch_start_is_undefined.value];
    }

    decodedPayload[`navigator_vendor`] = rawDecodedPayload[this.signalKeys.navigator_vendor.value];
    decodedPayload[`navigator_product`] = rawDecodedPayload[this.signalKeys.navigator_product.value];
    decodedPayload[`navigator_product_sub`] = rawDecodedPayload[this.signalKeys.navigator_product_sub.value];

    if(this.signalKeys.document.document.value in rawDecodedPayload){

      decodedPayload[`document`] = {};
      const rawPayload = rawDecodedPayload[this.signalKeys.document.document.value];

      decodedPayload[`document`][`document_location_protocol`] = rawPayload[this.signalKeys.document.document_location_protocol.value];

    }

    decodedPayload[`canvas_fonts`] = rawDecodedPayload[this.signalKeys.canvas_fonts.value];

    if(this.signalKeys.document_children.document_children.value in rawDecodedPayload){

      decodedPayload[`document_children`] = {};
      const rawPayload = rawDecodedPayload[this.signalKeys.document_children.document_children.value];

      decodedPayload[`document_children`][`document_script_element_children`] = rawPayload[this.signalKeys.document_children.document_script_element_children.value];
      decodedPayload[`document_children`][`document_head_element_children`] = rawPayload[this.signalKeys.document_children.document_head_element_children.value];
    }

    if(this.signalKeys.video.video.value in rawDecodedPayload){

      decodedPayload[`video`] = {};
      const rawPayload = decode(this.encoders[6][1].decoder, rawDecodedPayload[this.signalKeys.video.video.value]);

      decodedPayload[`video`][`can_play_type_video_ogg`] = rawPayload[this.signalKeys.video.can_play_type_video_ogg.value];
      decodedPayload[`video`][`can_play_type_video_mp4`] = rawPayload[this.signalKeys.video.can_play_type_video_mp4.value];
      decodedPayload[`video`][`can_play_type_video_webm`] = rawPayload[this.signalKeys.video.can_play_type_video_webm.value];
    }

    if(this.signalKeys.audio.audio.value in rawDecodedPayload){

      decodedPayload[`audio`] = {};
      const rawPayload = decode(this.encoders[6][2].decoder, rawDecodedPayload[this.signalKeys.audio.audio.value]);

      decodedPayload[`audio`][`can_play_type_audio_ogg`] = rawPayload[this.signalKeys.audio.can_play_type_audio_ogg.value];
      decodedPayload[`audio`][`can_play_type_audio_mpeg`] = rawPayload[this.signalKeys.audio.can_play_type_audio_mpeg.value];
      decodedPayload[`audio`][`can_play_type_audio_wav`] = rawPayload[this.signalKeys.audio.can_play_type_audio_wav.value];
      decodedPayload[`audio`][`can_play_type_audio_xm4a`] = rawPayload[this.signalKeys.audio.can_play_type_audio_xm4a.value];
    }

    if(this.signalKeys.browser.browser.value in rawDecodedPayload){

      decodedPayload[`browser`] = {};
      const rawPayload = decode(this.encoders[6][3].decoder, rawDecodedPayload[this.signalKeys.browser.browser.value]);

      decodedPayload[`browser`][`is_internet_explorer`] = rawPayload[this.signalKeys.browser.is_internet_explorer.value];
      decodedPayload[`browser`][`is_chrome`] = rawPayload[this.signalKeys.browser.is_chrome.value];

      const chrome = this.signalKeys.browser.chrome.chrome.value;

      if(chrome in rawPayload){
        decodedPayload[`browser`][`chrome`] = {};
        decodedPayload[`browser`][`chrome`][`load_times`] = rawPayload[chrome][this.signalKeys.browser.chrome.load_times.value];
        decodedPayload[`browser`][`chrome`][`app`] = rawPayload[chrome][this.signalKeys.browser.chrome.app.value];
      }

      decodedPayload[`browser`][`webdriver`] = rawPayload[this.signalKeys.browser.webdriver.value];
      decodedPayload[`browser`][`connection_rtt`] = rawPayload[this.signalKeys.browser.connection_rtt.value];
    }

    if(this.signalKeys.window.window.value in rawDecodedPayload){

      decodedPayload[`window`] = {};
      const rawPayload = decode(this.encoders[6][4].decoder, rawDecodedPayload[this.signalKeys.window.window.value]);

      decodedPayload[`window`][`history_length`] = rawPayload[this.signalKeys.window.history_length.value];
      decodedPayload[`window`][`navigator_hardware_concurrency`] = rawPayload[this.signalKeys.window.navigator_hardware_concurrency.value];
      decodedPayload[`window`][`is_window_self_not_window_top`] = rawPayload[this.signalKeys.window.is_window_self_not_window_top.value];
      decodedPayload[`window`][`is_native_navigator_get_battery`] = rawPayload[this.signalKeys.window.is_native_navigator_get_battery.value];
      decodedPayload[`window`][`console_debug_name`] = rawPayload[this.signalKeys.window.console_debug_name.value];
      decodedPayload[`window`][`is_native_console_debug`] = rawPayload[this.signalKeys.window.is_native_console_debug.value];
      decodedPayload[`window`][`_phantom`] = rawPayload[this.signalKeys.window._phantom.value];
      decodedPayload[`window`][`call_phantom`] = rawPayload[this.signalKeys.window.call_phantom.value];
      decodedPayload[`window`][`empty`] = rawPayload[this.signalKeys.window.empty.value];
      decodedPayload[`window`][`persistent`] = rawPayload[this.signalKeys.window.persistent.value];
      decodedPayload[`window`][`temporary`] = rawPayload[this.signalKeys.window.temporary.value];

      const performanceObserver = this.signalKeys.window.performance_observer.performance_observer.value;
      if(performanceObserver in rawPayload){
        decodedPayload[`window`][`performance_observer`] = {};
        decodedPayload[`window`][`performance_observer`][`supported_entry_types`] = rawPayload[performanceObserver][this.signalKeys.window.performance_observer.supported_entry_types.value];
      }
    }

    if(this.signalKeys.webgl_rendering_call.webgl_rendering_call.value in rawDecodedPayload){

      decodedPayload[`webgl_rendering_call`] = {};
      const rawPayload = decode(this.encoders[6][5].decoder, rawDecodedPayload[this.signalKeys.webgl_rendering_call.webgl_rendering_call.value]);

      decodedPayload[`webgl_rendering_call`][`webgl_rendering_context_prototype_get_parameter_call_a`] = rawPayload[this.signalKeys.webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_a.value];
      decodedPayload[`webgl_rendering_call`][`webgl_rendering_context_prototype_get_parameter_call_b`] = rawPayload[this.signalKeys.webgl_rendering_call.webgl_rendering_context_prototype_get_parameter_call_b.value];
    }

    decodedPayload[`window_object_get_own_property_names`] = decode(this.encoders[6][6].decoder, rawDecodedPayload[this.signalKeys.window_object_get_own_property_names.value]);

    if(this.signalKeys.visual_view_port.visual_view_port.value in rawDecodedPayload){

      decodedPayload[`visual_view_port`] = {};
      const rawPayload = decode(this.encoders[6][7].decoder, rawDecodedPayload[this.signalKeys.visual_view_port.visual_view_port.value]);

      decodedPayload[`visual_view_port`][`visual_view_port_width`] = rawPayload[this.signalKeys.visual_view_port.visual_view_port_width.value];
      decodedPayload[`visual_view_port`][`visual_view_port_height`] = rawPayload[this.signalKeys.visual_view_port.visual_view_port_height.value];
      decodedPayload[`visual_view_port`][`visual_view_port_scale`] = rawPayload[this.signalKeys.visual_view_port.visual_view_port_scale.value];
    }

    if(!dropUniqueKey){
      decodedPayload[this.key] = this.key_value;
    }

    return decodedPayload;
  }

  validate(data) {

    if (this._validate === null) {
      this._validate = ajv.compile(PayloadSchema);
    }

    return this._validate(data);

  }

}


module.exports = Reese84;
