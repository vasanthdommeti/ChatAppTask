if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "/Users/rovia/.gradle/caches/9.0.0/transforms/8a14c760638736beb3e8a45632c6b17d/transformed/hermes-android-0.14.0-debug/prefab/modules/hermesvm/libs/android.arm64-v8a/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/rovia/.gradle/caches/9.0.0/transforms/8a14c760638736beb3e8a45632c6b17d/transformed/hermes-android-0.14.0-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

