const PayloadSchema = {
  type : 'object',
  properties : {
    'events' : {
      type : 'object',
      properties : {
        'mouse' : {
          type : 'array',
          items : {
            type : 'object',
            properties : {
              'type' : { type : 'string' },
              'timestamp' : { type : 'number' },
              'client_x' : { type : 'number' },
              'client_y' : { type : 'number' },
              'screen_x' : { type : 'number' },
              'screen_y' : { type : 'number' }
            }
          }
        },
        'touch' : {
          type : 'array',
          items : {
          type : 'object',
            properties : {
              'type' : { type : 'string' },
              'timestamp' : { type : 'number' },
              'identifier' : { type : 'string' },
              'client_x' : { type : 'number' },
              'client_y' : { type : 'number' },
              'screen_x' : { type : 'number' },
              'screen_y' : { type : 'number' },
              'radius_x' : { type : 'number' },
              'radius_y' : { type : 'number' },
              'rotation_angle' : { type : 'number' },
              'force' : { type : 'number' },
            }
          }
        }
      }
    },
    'user_agent' : { type : 'string' },
    'navigator_language' : { type : 'string' },
    'navigator_languages' : {
      type : 'object',
      properties : {
        'languages_is_not_undefined' : { type : 'boolean'},
        'languages' : { type : 'array',items : { type : 'string'}}
      }
    },
    /*
    'navigator_build_id' : {type : 'string'},
    */
    'timestamps' : {
      type : 'object',
      properties : {
        'date_get_time' : { type : 'number' },
        'file_last_modified' : { type : 'number' },
        'performance_now' : { type : 'number' },
        'decent_timeline' : { type : 'number' },
        'performance_timing' : { type : 'number' }
      }
    },
    'mime_types' : {
      type : 'array',
      items : 'string',
    }
    'window_size' : {
      type : 'object',
      properties : {
        'window_screen_width' : { type : 'number' },
        'window_screen_height' : { type : 'number' },
        'window_screen_avail_height' : { type : 'number' },
        'window_screen_avail_left' : { type : 'number' },
        'window_screen_avail_top' : { type : 'number' },
        'window_screen_avail_width' : { type : 'number' },
        'window_screen_pixel_depth' : { type : 'number' },
        'window_inner_width' : { type : 'number' },
        'window_inner_height' : { type : 'number' },
        'window_outer_width' : { type : 'number' },
        'window_outer_height' : { type : 'number' },
        'window_device_pixel_ratio' : { type : 'number' },
        'window_screen_orientation_type' : { type : 'number' },
        'window_screenX' : { type : 'number' },
        'window_screenY' : { type : 'number' }
      }
    },
    'date_get_time_zone_off_set' : { type : 'number' },
    'has_indexed_db' : { type : 'boolean' },
    'has_body_add_behaviour' : { type : 'boolean' },
    'open_database' : { type : 'string' },
    'cpu_class' : { type : 'string' },
    'platform' : { type : 'string' },
    'do_not_track' : { type : 'string' },
    'plugins_or_active_x_object' : { type : 'string' },
    'plugins_named_item_item_refresh' : {
      type : 'object',
      properties : {
        'named_item' : { type : 'string' },
        'item' : { type : 'string' },
        'refresh' : { type : 'string' }
      }
    },
    'canvas_hash' : {
      type : 'object',
      properties : {
        'is_point_in_path' : { type : 'boolean' },
        'to_data_url_image' : { type : 'string' },
        'to_data_url_image_error' : { type : 'string' },
        'screen_is_global_composite_operation' : { type : 'boolean' },
        'hash' : { type : 'string' }
      },
    },
    'webgl' : {
      type : 'object',
      properties : {
        'get_supported_extensions' : { type : 'string' },
        'canvas_hash' : { type : 'string' },
        'canvas_hash_error' : { type : 'string' },
        'aliased_line_width_range' : { type : 'array', items : { type : 'number' }},
        'aliased_point_size_range' : { type : 'array', items : { type : 'number' }},
        'alpha_bits' : { type : 'number' },
        'antialias' : { type : 'number' },
        'blue_bits' : { type : 'number' },
        'green_bits' : { type : 'number' },
        'depth_bits' : { type : 'number' },
        'all_bits' : { type : 'number' },
        'max_combined_texture_image_units' : { type : 'number' },
        'max_cube_map_texture_size' : { type : 'number' },
        'max_fragment_uniform_vectors' : { type : 'number' },
        'max_renderbuffer_size' : { type : 'number' },
        'max_texture_image_units' : { type : 'number' },
        'max_texture_size' : { type : 'number' },
        'max_varying_vectors' : { type : 'number' },
        'max_vertex_attribs' : { type : 'number' },
        'max_vertex_texture_image_units' : { type : 'number' },
        'max_vertex_uniform_vectors' : { type : 'number' },
        'max_viewport_dims' : { type : 'array', items : { type : 'number' }},
        'red_bits' : { type : 'number' },
        'renderer' : { type : 'string' },
        'shading_language_version' : { type : 'string' },
        'stencil_bits' : { type : 'number' },
        'vendor' : { type : 'string' },
        'version' : { type : 'string' },
        'shader_precision_vertex_low_float' : { type : 'number' },
        'shader_precision_vertex_low_float_min' : { type : 'number' },
        'shader_precision_vertex_low_float_max' : { type : 'number' },
        'shader_precision_vertex_medium_float' : { type : 'number' },
        'shader_precision_vertex_medium_float_min' : { type : 'number' },
        'shader_precision_vertex_medium_float_max' : { type : 'number' },
        'shader_precision_vertex_high_float' : { type : 'number' },
        'shader_precision_vertex_high_float_min' : { type : 'number' },
        'shader_precision_vertex_high_float_max' : { type : 'number' },
        'shader_precision_vertex_low_int' : { type : 'number' },
        'shader_precision_vertex_low_int_min' : { type : 'number' },
        'shader_precision_vertex_low_int_max' : { type : 'number' },
        'shader_precision_vertex_medium_int' : { type : 'number' },
        'shader_precision_vertex_medium_int_min' : { type : 'number' },
        'shader_precision_vertex_medium_int_max' : { type : 'number' },
        'shader_precision_vertex_high_int' : { type : 'number' },
        'shader_precision_vertex_high_int_min' : { type : 'number' },
        'shader_precision_vertex_high_int_max' : { type : 'number' },
        'shader_precision_fragment_low_float' : { type : 'number' },
        'shader_precision_fragment_low_float_min' : { type : 'number' },
        'shader_precision_fragment_low_float_max' : { type : 'number' },
        'shader_precision_fragment_medium_float' : { type : 'number' },
        'shader_precision_fragment_medium_float_min' : { type : 'number' },
        'shader_precision_fragment_medium_float_max' : { type : 'number' },
        'shader_precision_fragment_high_float' : { type : 'number' },
        'shader_precision_fragment_high_float_min' : { type : 'number' },
        'shader_precision_fragment_high_float_max' : { type : 'number' },
        'shader_precision_fragment_low_int' : { type : 'number' },
        'shader_precision_fragment_low_int_min' : { type : 'number' },
        'shader_precision_fragment_low_int_max' : { type : 'number' },
        'shader_precision_fragment_medium_int' : { type : 'number' },
        'shader_precision_fragment_medium_int_min' : { type : 'number' },
        'shader_precision_fragment_medium_int_max' : { type : 'number' },
        'shader_precision_fragment_high_int' : { type : 'number' },
        'shader_precision_fragment_high_int_min' : { type : 'number' },
        'shader_precision_fragment_high_int_max' : { type : 'number' },
        'unmasked_vendor_webgl' : { type : 'string' },
        'unmasked_renderer_webgl' : { type : 'string' },
      }
    },
    'webgl_meta' : {
      type : 'object',
      properties : {
        'webgl_rendering_context_get_parameter' : { type : 'string' },
        'is_native_webgl_rendering_context_get_parameter' : { type : 'boolean' },

      }
    },
    'touch_event' : {
      type : 'object',
      properties : {
        'max_touch_points' : { type : 'string' },
        'has_touch_event' : { type : 'boolean' },
        'on_touch_start_is_undefined' : { type : 'boolean' }
      }
    },
    'video' : {
      type : 'object',
      properties : {
        'can_play_type_video_ogg' : { type : 'string' },
        'can_play_type_video_mp4' : { type : 'string' },
        'can_play_type_video_webm' : { type : 'string' }
      }
    },
    'audio' : {
      type : 'object',
      properties : {
        'can_play_type_audio_ogg' : { type : 'string' },
        'can_play_type_audio_mpeg' : { type : 'string' },
        'can_play_type_audio_wav' : { type : 'string' },
        'can_play_type_audio_xm4a' : { type : 'string' },
        'can_play_type_audio_empty_array' : { type : 'string' },
        'can_play_type_audio_mp4' : { type : 'string' },
      }
    },
    'navigator_vendor' : { type : 'string' },
    'navigator_product' : { type : 'string' },
    'navigator_product_sub' : { type : 'string' },
    'browser' : {
      type : 'object',
      properties : {
        'is_internet_explorer' : { type : 'boolean' },
        'is_chrome' : { type : 'boolean' },
        'chrome' : {
          type : 'object',
          properties : {
            'load_times' : { type : 'boolean'},
            'app' : {
              type : 'array',
              items : {
                type : 'array',
                items : {type : 'string'}
              }
            },
            'chrome' : {
              type : 'array',
              items : {
                type : 'array',
                items : {type : 'string'}
              }
            }
          }
        },
        'webdriver' : { type : 'boolean' },
        'connection_rtt' : { type : 'number' },
      }
    },
    'window' : {
      type : 'object',
      properties : {
        'history_length' : { type : 'number' },
        'navigator_hardware_concurrency' : { type : 'number' },
        'is_window_self_not_window_top' : { type : 'boolean' },
        'is_native_navigator_get_battery' : { type : 'boolean' },
        'console_debug_name' : { type : 'string' },
        'is_native_console_debug' : { type : 'boolean' },
        '_phantom' : { type : 'boolean' },
        'call_phantom' : { type : 'boolean' },
        'empty' : { type : 'string' },
        'persistent' : { type : 'number' },
        'temporary' : { type : 'number' },
        'performance_observer' : {
          type : 'object',
          properties : {
            'supported_entry_types' : {
              type : 'array',
              items : { type : 'string'}
            }
          }
        },
      }
    },
    'document' : {
      type : 'object',
      properties : {
        'document_location_protocol' : { type : 'string' }
      }
    },
    'canvas_fonts' : { type : 'array', items : { type : 'string'} },
    'document_children' : {
      type : 'object',
      properties : {
        'document_script_element_children' : { type : 'array', 'items' : { '$ref' : '#/$defs/document_children' }},
        'document_head_element_children' : { type : 'array', 'items' : { '$ref' : '#/$defs/document_children' }}
      }
    },
    'webgl_rendering_call' : {
      type : 'object',
      properties : {
        'webgl_rendering_context_prototype_get_parameter_call_a' : { type : 'boolean' },
        'webgl_rendering_context_prototype_get_parameter_call_b' : { type : 'boolean' },
        'hash' : { type : 'string' }
      }
    },
    'window_object_get_own_property_names_a' : { type : 'string'},
    'window_object_get_own_property_names_b' : {
      type : 'object',
      properties : {
        'prev' : { type : 'string' },
        'next' : { type : 'string' }
      },
    },
    'window_object_get_own_property_names_last_30' : {
      type : 'array',
      items : { type : 'string'}
    },
    'visual_view_port' : {
      type : 'object',
      properties : {
        'visual_view_port_width' : { type : 'number' },
        'visual_view_port_height' : { type : 'number' },
        'visual_view_port_scale' : { type : 'number' },
      },
    'performance_difference' : {
      type : 'object',
      properties : {
        'dump_a' : { type : 'number' },
        'dump_b' : { type : 'number' },
        'btoa_a' : { type : 'number' },
        'btoa_b' : { type : 'number' }
      }
    }
  },
  '$defs' : {
    'document_children' : {
      'type' : 'object',
      'required' : [ 'src'],
      'properties' : {
        'src' : {'type' : 'string'}
      }
    }
  },
  additionalProperties : false,
};
module.exports = PayloadSchema;
