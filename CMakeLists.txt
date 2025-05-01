project(rn-static-server C)
cmake_minimum_required(VERSION 3.22.1 FATAL_ERROR)

# 🔥 Force ARCH ngay từ đầu để override cả Podspec/Xcode
if(CMAKE_SYSTEM_NAME MATCHES "iOS" OR CMAKE_SYSTEM_NAME MATCHES "Darwin")
    set(CMAKE_OSX_ARCHITECTURES "arm64" CACHE STRING "" FORCE)
endif()

if (CMAKE_VERSION MATCHES "3.30.0")
  message(FATAL_ERROR "CMake v3.30.0 is not supported: https://github.com/birdofpreyru/react-native-static-server/issues/111")
elseif (CMAKE_VERSION MATCHES "3.30.1")
  message(FATAL_ERROR "CMake v3.30.1 is not supported: https://github.com/birdofpreyru/react-native-static-server/issues/111")
endif()

set(CMAKE_MACOSX_BUNDLE OFF)

if(CMAKE_CROSSCOMPILING AND CMAKE_HOST_SYSTEM_NAME MATCHES "Windows")
  file(
    COPY ${CMAKE_CURRENT_SOURCE_DIR}/windows/ReactNativeStaticServer/lighttpd/lemon.exe
    DESTINATION ${CMAKE_BINARY_DIR}/lighttpd1.4/build
  )
  set(LEMON_PATH ${CMAKE_BINARY_DIR}/lighttpd1.4/build/lemon.exe)
endif()

string(REPLACE " " "\\\;" ESCAPED_ARCHS "$ENV{ARCHS_STANDARD}")

if(CMAKE_SYSTEM_NAME MATCHES "Android")
  set(
    EXTRA_BUILD_ARGS
    -DANDROID_ABI=${ANDROID_ABI}
    -DANDROID_PLATFORM=${ANDROID_PLATFORM}
    -DANDROID_STL=${ANDROID_STL}
    -DCMAKE_TOOLCHAIN_FILE=${CMAKE_TOOLCHAIN_FILE}
    -GNinja
  )

elseif(CMAKE_SYSTEM_NAME MATCHES "Darwin")
  set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -target x86_64-apple-ios-macabi")
  set(
    EXTRA_BUILD_ARGS
    -DCMAKE_C_FLAGS=${CMAKE_C_FLAGS}
    -DCMAKE_OSX_ARCHITECTURES=arm64
  )
  set(EXTRA_INSTALL_ARGS "--;CODE_SIGNING_ALLOWED=NO")

elseif(CMAKE_SYSTEM_NAME MATCHES "iOS")
  set(
    EXTRA_BUILD_ARGS
    -DCMAKE_TOOLCHAIN_FILE=${CMAKE_TOOLCHAIN_FILE}
    -DCMAKE_OSX_ARCHITECTURES=arm64
    -DCMAKE_OSX_DEPLOYMENT_TARGET=${CMAKE_OSX_DEPLOYMENT_TARGET}
    -DCMAKE_IOS_INSTALL_COMBINED=${CMAKE_IOS_INSTALL_COMBINED}
    -GXcode
  )
  set(EXTRA_INSTALL_ARGS "--;CODE_SIGNING_ALLOWED=NO")
endif()

if(CMAKE_SYSTEM_NAME MATCHES "Android|Windows")
  set(EXTRA_BUILD_ARGS ${EXTRA_BUILD_ARGS} -DBUILD_SHARED_LIBS=ON)
endif()

execute_process(
  COMMAND ${CMAKE_COMMAND} ${CMAKE_CURRENT_SOURCE_DIR}/pcre2
    -B ${CMAKE_BINARY_DIR}/pcre2
    -DCMAKE_BUILD_TYPE=Release
    -DCMAKE_INSTALL_PREFIX=${CMAKE_BINARY_DIR}/sysroot
    -DCMAKE_MAKE_PROGRAM=${CMAKE_MAKE_PROGRAM}
    ${EXTRA_BUILD_ARGS}
  COMMAND_ECHO STDOUT
  COMMAND_ERROR_IS_FATAL ANY
)

execute_process(
  COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR}/pcre2
    --config Release ${EXTRA_INSTALL_ARGS}
)

execute_process(COMMAND ${CMAKE_COMMAND} --install ${CMAKE_BINARY_DIR}/pcre2)

if(CMAKE_SYSTEM_NAME MATCHES "Android")
  file(
    COPY ${CMAKE_BINARY_DIR}/sysroot/lib/libpcre2-8.so
    DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/android/src/main/jniLibs/${ANDROID_ABI}
  )
endif()

if(CMAKE_SYSTEM_NAME MATCHES "Android")
  execute_process(
    COMMAND ${CMAKE_COMMAND} ${CMAKE_CURRENT_SOURCE_DIR}/glob
      -B ${CMAKE_BINARY_DIR}/glob
      -DCMAKE_BUILD_TYPE=Release
      -DCMAKE_INSTALL_PREFIX=${CMAKE_BINARY_DIR}/sysroot
      -DCMAKE_MAKE_PROGRAM=${CMAKE_MAKE_PROGRAM}
      ${EXTRA_BUILD_ARGS}
    COMMAND_ECHO STDOUT
    COMMAND_ERROR_IS_FATAL ANY
  )
  execute_process(
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_BINARY_DIR}/glob
      --config Release ${EXTRA_INSTALL_ARGS}
  )
  execute_process(COMMAND ${CMAKE_COMMAND} --install ${CMAKE_BINARY_DIR}/glob)
  file(
    COPY ${CMAKE_BINARY_DIR}/sysroot/lib/libglob.so
    DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/android/src/main/jniLibs/${ANDROID_ABI}
  )
endif()

if(CMAKE_SYSTEM_NAME MATCHES "Android|Windows")
  set(BUILD_SHARED_LIBS 1)
endif()

if(CMAKE_SYSTEM_NAME MATCHES "Windows")
  set(ENV{PKG_CONFIG_PATH} "${CMAKE_BINARY_DIR}/sysroot/lib/pkgconfig")
else()
  set(CMAKE_PREFIX_PATH "${CMAKE_BINARY_DIR}/sysroot")
endif()

add_subdirectory(lighttpd1.4)

set(PLUGIN_STATIC
  PLUGIN_INIT(mod_access)\n
  PLUGIN_INIT(mod_alias)\n
  PLUGIN_INIT(mod_dirlisting)\n
  PLUGIN_INIT(mod_evhost)\n
  PLUGIN_INIT(mod_expire)\n
  PLUGIN_INIT(mod_fastcgi)\n
  PLUGIN_INIT(mod_h2)\n
  PLUGIN_INIT(mod_indexfile)\n
  PLUGIN_INIT(mod_redirect)\n
  PLUGIN_INIT(mod_rewrite)\n
  PLUGIN_INIT(mod_scgi)\n
  PLUGIN_INIT(mod_setenv)\n
  PLUGIN_INIT(mod_simple_vhost)\n
  PLUGIN_INIT(mod_staticfile)\n
)

if(WITH_MOD_WEBDAV)
  set(PLUGIN_STATIC "${PLUGIN_STATIC}PLUGIN_INIT(mod_webdav)\n")
endif()

file(WRITE ${CMAKE_BINARY_DIR}/lighttpd1.4/build/plugin-static.h
  ${PLUGIN_STATIC}
)
