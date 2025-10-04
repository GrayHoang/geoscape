cmake_minimum_required(VERSION 3.14)
project(stormhacks LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# ------------------------------------------------------------------
# 1.  FetchContent declarations (SDL2, GLM, Dear ImGui)
# ------------------------------------------------------------------
include(FetchContent)

FetchContent_Declare(
  SDL2
  GIT_REPOSITORY https://github.com/libsdl-org/SDL.git
  GIT_TAG        release-2.30.10
  GIT_SHALLOW    TRUE
)
FetchContent_Declare(
  glm
  GIT_REPOSITORY https://github.com/g-truc/glm.git
  GIT_TAG        1.0.1
  GIT_SHALLOW    TRUE
)
FetchContent_Declare(
  imgui
  GIT_REPOSITORY https://github.com/ocornut/imgui.git
  GIT_TAG        v1.91.0
  GIT_SHALLOW    TRUE
)

# Make SDL2 build as a static library and disable unwanted subsystems
set(SDL_SHARED     OFF CACHE BOOL "")
set(SDL_STATIC     ON  CACHE BOOL "")
set(SDL_TEST       OFF CACHE BOOL "")
set(SDL_RENDER     OFF CACHE BOOL "")   # we use OpenGL directly
FetchContent_MakeAvailable(SDL2 glm imgui)

# ------------------------------------------------------------------
# 2.  Platform-specific OpenGL setup
# ------------------------------------------------------------------
if(APPLE)
    # macOS: use built-in Cocoa OpenGL framework
    find_library(OPENGL_LIBRARY OpenGL REQUIRED)
    set(PLATFORM_LIBS ${OPENGL_LIBRARY})
    set(PLATFORM_SOURCES
        ${imgui_SOURCE_DIR}/backends/imgui_impl_opengl3.cpp
        ${imgui_SOURCE_DIR}/backends/imgui_impl_sdl2.cpp)
elseif(WIN32)
    # Windows: link against opengl32.dll
    set(PLATFORM_LIBS opengl32)
    set(PLATFORM_SOURCES
        ${imgui_SOURCE_DIR}/backends/imgui_impl_opengl3.cpp
        ${imgui_SOURCE_DIR}/backends/imgui_impl_sdl2.cpp)
else()
    # Linux / NixOS: use pkg-config to find GL and dl
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(GL REQUIRED gl)
    set(PLATFORM_LIBS ${GL_LIBRARIES} dl)
    set(PLATFORM_SOURCES
        ${imgui_SOURCE_DIR}/backends/imgui_impl_opengl3.cpp
        ${imgui_SOURCE_DIR}/backends/imgui_impl_sdl2.cpp)
endif()

# ------------------------------------------------------------------
# 3.  Your own sources
# ------------------------------------------------------------------
add_executable(my_app
    src/main.cpp
    src/renderer.cpp          # example extra file
    ${imgui_SOURCE_DIR}/imgui.cpp
    ${imgui_SOURCE_DIR}/imgui_demo.cpp
    ${imgui_SOURCE_DIR}/imgui_draw.cpp
    ${imgui_SOURCE_DIR}/imgui_tables.cpp
    ${imgui_SOURCE_DIR}/imgui_widgets.cpp
    ${PLATFORM_SOURCES})

# ------------------------------------------------------------------
# 4.  Include directories
# ------------------------------------------------------------------
target_include_directories(my_app PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${imgui_SOURCE_DIR}
    ${imgui_SOURCE_DIR}/backends
    ${SDL2_SOURCE_DIR}/include
    ${glm_SOURCE_DIR})

# ------------------------------------------------------------------
# 5.  Link libraries
# ------------------------------------------------------------------
target_link_libraries(my_app PRIVATE SDL2-static ${PLATFORM_LIBS})

# ------------------------------------------------------------------
# 6.  macOS bundle extras (optional)
# ------------------------------------------------------------------
if(APPLE)
    set_target_properties(my_app PROPERTIES
        MACOSX_BUNDLE TRUE
        MACOSX_BUNDLE_INFO_PLIST ${CMAKE_CURRENT_SOURCE_DIR}/Info.plist.in)
endif()

# ------------------------------------------------------------------
# 7.  Copy SDL2.dll next to the exe on Windows (convenience)
# ------------------------------------------------------------------
if(WIN32 AND TARGET SDL2-static)
    add_custom_command(TARGET my_app POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
        $<TARGET_FILE:SDL2-static>
        $<TARGET_FILE_DIR:my_app>)
endif()
