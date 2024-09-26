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

# due to the following problem: https://github.com/react-native-community/discussions-and-proposals/discussions/816#discussioncomment-10659654
# REACTNATIVE_MERGED_SO is not set, therefore - before it is fixed - the version is being compared
# fix to be tracked for publish in https://github.com/facebook/react-native/pull/46606
if (REACTNATIVE_MERGED_SO OR ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
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
