project(RePack)
cmake_minimum_required(VERSION 3.9.0)

set(PACKAGE_NAME "callstack-repack")
set(BUILD_DIR ${CMAKE_SOURCE_DIR}/build)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 17)

# Add callstack-repack sources
add_library(
        ${PACKAGE_NAME}
        SHARED
        src/main/cpp/OnLoad.cpp
        src/main/cpp/NativeScriptLoader.cpp
)

# Configure C++ 17
set_target_properties(
        ${PACKAGE_NAME}
        PROPERTIES
        CXX_STANDARD 17
        CXX_EXTENSIONS OFF
        POSITION_INDEPENDENT_CODE ON
        LINKER_LANGUAGE CXX
)

find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)

target_include_directories(
        ${PACKAGE_NAME}
        PRIVATE
        "src/main/cpp"
        "${REACT_NATIVE_DIR}/ReactCommon"
        "${REACT_NATIVE_DIR}/ReactCommon/callinvoker"
        "${REACT_NATIVE_DIR}/ReactAndroid/src/main/jni/react/turbomodule"
)
# REACT_NATIVE_MERGED_SO is not set properly
# use version check instead
if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
        target_link_libraries(
                ${PACKAGE_NAME}
                ReactAndroid::reactnative
        )
else()
        target_link_libraries(
                ${PACKAGE_NAME}
                ReactAndroid::reactnativejni
        )
endif()

target_link_libraries(
        ${PACKAGE_NAME}
        android
        fbjni::fbjni
        ReactAndroid::jsi
)

# Enable Android 16kb native library alignment
if(CMAKE_ANDROID_NDK_VERSION VERSION_LESS "27")
        target_link_options(${PACKAGE_NAME} PRIVATE "-Wl,-z,max-page-size=16384")
endif()
