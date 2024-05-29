project(callstack-repack)
cmake_minimum_required(VERSION 3.9.0)

set (PACKAGE_NAME "@callstack/repack")
set (BUILD_DIR ${CMAKE_SOURCE_DIR}/build)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 17)

# Add callstack-repack sources
add_library(
        callstack-repack  # <-- Library name
        SHARED
        src/main/cpp/cpp-adapter.cpp
)
# Configure C++ 17
set_target_properties(
        callstack-repack PROPERTIES
        CXX_STANDARD 17
        CXX_EXTENSIONS OFF
        POSITION_INDEPENDENT_CODE ON
)

find_package(ReactAndroid REQUIRED CONFIG)

target_link_libraries(
        callstack-repack
        ReactAndroid::jsi   # <-- JSI
        android             # <-- Android JNI core
)
