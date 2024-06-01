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
        src/main/cpp/NativeScriptLoader.h
        src/main/cpp/NativeScriptLoader.cpp
)

# Configure C++ 17
set_target_properties(
        ${PACKAGE_NAME}
        PROPERTIES
        CXX_STANDARD 17
        CXX_EXTENSIONS OFF
        POSITION_INDEPENDENT_CODE ON
)

find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)
find_package(hermes-engine REQUIRED CONFIG)

target_include_directories(
        ${PACKAGE_NAME}
        PRIVATE
        "${REACT_NATIVE_DIR}/ReactCommon"
        "${REACT_NATIVE_DIR}/ReactCommon/runtimeexecutor"
)

target_link_libraries(
        ${PACKAGE_NAME}
        ReactAndroid::jsi
        ReactAndroid::reactnativejni
        fbjni::fbjni
        android
)
