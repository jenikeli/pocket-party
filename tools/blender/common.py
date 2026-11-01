# Shared helpers for the model scripts in tools/blender/ (run headless by tools/blender.js): an empty scene,
# meshes and colours, baking a map from a detailed model onto a game model with Cycles, glTF-ready materials,
# the .glb export and its check, and preview renders. Blender's own Python runs these, so they use only what it
# bundles: bpy, mathutils, numpy and its glTF add-on, besides the standard library.

import argparse
import json
import os
import struct
import sys

import bpy
import numpy
from mathutils import Vector
from io_scene_gltf2.blender.com.material_helpers import create_settings_group, get_gltf_node_name


def script_arguments():
    """The script's own arguments, after `--` on Blender's command line: --out <glb> and --preview <folder>."""
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', required=True)
    parser.add_argument('--preview')
    return parser.parse_args(argv)


def clear_scene():
    """An empty scene drawn by Cycles on the CPU (the dev box has no GPU Blender can use)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    # Standard, not AgX: the baked colours and the previews should keep the colours as picked.
    scene.view_settings.view_transform = 'Standard'
    # AO bakes count only what lies within this many metres, so creases darken but a whole side does not.
    scene.world = bpy.data.worlds.new('bake')
    scene.world.light_settings.distance = 0.5


def linear(hex_colour):
    """'#rrggbb' (sRGB, as picked by eye) to the linear RGBA Blender's colour sockets and attributes expect."""
    def channel(value):
        value /= 255
        return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4
    return tuple(channel(int(hex_colour[index:index + 2], 16)) for index in (1, 3, 5)) + (1.0,)


def object_from_bmesh(name, bm):
    """Turns a bmesh into a smooth-shaded mesh object of the same name in the scene (and frees the bmesh)."""
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.shade_smooth()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def grid_faces(bm, rows, closed):
    """Quads between consecutive rows of verts (a `closed` row goes all the way round). Each quad's normal points
    along (next column - column) x (next row - row). Returns the faces, row by row."""
    faces = []
    for lower, upper in zip(rows, rows[1:]):
        for column in range(len(lower) if closed else len(lower) - 1):
            following = (column + 1) % len(lower)
            faces.append(bm.faces.new((lower[column], lower[following], upper[following], upper[column])))
    return faces


def attribute_material(name):
    """A material coloured by the mesh's `colour` attribute, for detailed models that are only baked from."""
    material = bpy.data.materials.new(name)
    colour = material.node_tree.nodes.new('ShaderNodeAttribute')
    colour.attribute_name = 'colour'
    principled = material.node_tree.nodes['Principled BSDF']
    material.node_tree.links.new(colour.outputs['Color'], principled.inputs['Base Color'])
    return material


def triangle_count(obj):
    """Triangles as drawn, with the object's modifiers applied."""
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    count = len(mesh.loop_triangles)
    evaluated.to_mesh_clear()
    return count


def select_only(objects, active=None):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = active or objects[0]


def pack_uvs(obj, margin):
    """Gives every UV island the same texel density for its size in metres, then packs them into 0..1 without
    overlap, as the bakes need (each texel belongs to one place on the model)."""
    select_only([obj])
    bpy.context.scene.tool_settings.use_uv_select_sync = True
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(rotate=True, margin=margin)
    bpy.ops.object.mode_set(mode='OBJECT')


def new_image(name, width, height, alpha=False, data=False):
    """A blank image to bake into. `data` for maps that are not colours (normal, AO), so no sRGB curve is applied."""
    return bpy.data.images.new(name, width, height, alpha=alpha, is_data=data)


def bake(kind, high_objects, low_object, image, samples, margin, extrusion, ray_distance, pass_filter=None):
    """Bakes one map (Cycles bake type `kind`: NORMAL, AO, DIFFUSE...) from the detailed objects onto the game
    object's UVs, into `image`. Rays start `extrusion` outside the game surface and look inward up to
    `ray_distance`, so they find the detailed surface whether it stands proud of the game one or sinks below it.
    Cycles bakes into the active image node of the target's material, so one is added for the bake. Every other
    object leaves the render for it, and the game object is hidden from rays, so only the detailed objects
    shade and occlude each other (the game object lies on top of them and would darken their AO)."""
    bpy.context.scene.cycles.samples = samples
    nodes = low_object.active_material.node_tree.nodes
    target = nodes.new('ShaderNodeTexImage')
    target.image = image
    nodes.active = target
    others = [obj for obj in bpy.context.scene.objects if obj not in high_objects and obj != low_object]
    set_bake_visibility(others, low_object, hidden=True)
    select_only(high_objects + [low_object], active=low_object)
    try:
        bpy.ops.object.bake(
            type=kind, use_selected_to_active=True, cage_extrusion=extrusion, max_ray_distance=ray_distance,
            margin=margin, normal_space='TANGENT', target='IMAGE_TEXTURES', use_clear=True,
            pass_filter=pass_filter or set())
    finally:
        nodes.remove(target)
        set_bake_visibility(others, low_object, hidden=False)


def set_bake_visibility(others, low_object, hidden):
    for obj in others:
        obj.hide_render = hidden
    low_object.visible_diffuse = low_object.visible_glossy = low_object.visible_shadow = not hidden


def pixel_array(image):
    """The image's pixels as a numpy array of RGBA rows, one row per pixel (bottom row of the image first)."""
    pixels = numpy.empty(image.size[0] * image.size[1] * 4, dtype=numpy.float32)
    image.pixels.foreach_get(pixels)
    return pixels.reshape(-1, 4)


def set_pixels(image, pixels):
    image.pixels.foreach_set(pixels.ravel())


def game_material(name, base, normal=None, occlusion=None, alpha_clip=False, roughness=0.8):
    """A Principled material the glTF exporter writes as baseColorTexture (its alpha as a MASK cut-out at 0.5 when
    `alpha_clip`), normalTexture and occlusionTexture. Single-sided unless it has a cut-out (fronds are seen from
    both sides)."""
    material = bpy.data.materials.new(name)
    material.use_backface_culling = not alpha_clip
    tree = material.node_tree
    principled = tree.nodes['Principled BSDF']
    principled.inputs['Roughness'].default_value = roughness
    base_node = image_node(tree, base)
    tree.links.new(base_node.outputs['Color'], principled.inputs['Base Color'])
    if alpha_clip:
        # The exporter reads alpha -> Round -> Alpha as alphaMode MASK with a cutoff of 0.5.
        rounding = tree.nodes.new('ShaderNodeMath')
        rounding.operation = 'ROUND'
        tree.links.new(base_node.outputs['Alpha'], rounding.inputs[0])
        tree.links.new(rounding.outputs['Value'], principled.inputs['Alpha'])
    if normal:
        normal_map = tree.nodes.new('ShaderNodeNormalMap')
        tree.links.new(image_node(tree, normal).outputs['Color'], normal_map.inputs['Color'])
        tree.links.new(normal_map.outputs['Normal'], principled.inputs['Normal'])
    if occlusion:
        add_occlusion(tree, image_node(tree, occlusion))
    return material


def image_node(tree, image):
    node = tree.nodes.new('ShaderNodeTexImage')
    node.image = image
    return node


def add_occlusion(tree, occlusion_node):
    """Blender's shaders have no occlusion input, so the exporter takes glTF's occlusionTexture from a node group
    named "glTF Material Output" with an Occlusion socket (the group the glTF importer makes). It has no effect
    on Blender's own renders. The map's red channel is the occlusion, as glTF reads it."""
    group = bpy.data.node_groups.get(get_gltf_node_name()) or create_settings_group(get_gltf_node_name())
    output = tree.nodes.new('ShaderNodeGroup')
    output.node_tree = group
    separate = tree.nodes.new('ShaderNodeSeparateColor')
    tree.links.new(occlusion_node.outputs['Color'], separate.inputs['Color'])
    tree.links.new(separate.outputs['Red'], output.inputs['Occlusion'])


def export_glb(path, objects):
    """Writes the objects, and nothing else, as a binary glTF, y up, modifiers applied, textures inside. Maps
    become JPEG (smaller), except a colour map whose alpha is used, which the exporter keeps as PNG. Tangents
    go along, so Three.js reads the normal maps in the same tangent frames Cycles baked them in (without them
    it guesses the frames from screen-space derivatives)."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    select_only(objects)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
        export_cameras=False, export_lights=False, export_animations=False, export_extras=False,
        export_tangents=True, export_vertex_color='NONE', export_image_format='JPEG', export_jpeg_quality=90)


def glb_summary(path):
    """What the .glb holds, read back from its JSON chunk: each mesh, each material's alpha mode, sidedness and
    maps, each image's type and size in bytes. A GLB is a 12-byte header, then chunks of (length, type, data)."""
    with open(path, 'rb') as file:
        data = file.read()
    json_length, chunk_type = struct.unpack_from('<II', data, 12)
    if chunk_type != 0x4E4F534A:
        raise ValueError(f'{path}: the first chunk is not JSON')
    gltf = json.loads(data[20:20 + json_length])
    maps = ['normalTexture', 'occlusionTexture']
    return {
        'bytes': len(data),
        'meshes': [mesh['name'] for mesh in gltf['meshes']],
        'materials': [{
            'name': material['name'],
            'alphaMode': material.get('alphaMode', 'OPAQUE'),
            'alphaCutoff': material.get('alphaCutoff'),
            'doubleSided': material.get('doubleSided', False),
            'maps': [key for key in maps if key in material]
            + (['baseColorTexture'] if 'baseColorTexture' in material.get('pbrMetallicRoughness', {}) else []),
        } for material in gltf['materials']],
        'images': [{
            'name': image.get('name'),
            'mimeType': image['mimeType'],
            'bytes': gltf['bufferViews'][image['bufferView']]['byteLength'],
        } for image in gltf['images']],
    }


def reimport_summary(path):
    """Imports the .glb into an empty scene, as a check that it reads back: each mesh object's name, materials
    and triangles."""
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=path)
    return [{
        'name': obj.name,
        'materials': [slot.material.name for slot in obj.material_slots],
        'triangles': triangle_count(obj),
    } for obj in bpy.context.scene.objects if obj.type == 'MESH']


def setup_preview_stage(ground_colour):
    """A sunny day for the previews: pale blue sky light, a sun from the front left, a big flat ground."""
    scene = bpy.context.scene
    world = bpy.data.worlds.new('sky')
    world.color = linear('#a8d4ff')[:3]
    background = world.node_tree.nodes['Background']
    background.inputs['Color'].default_value = linear('#a8d4ff')
    background.inputs['Strength'].default_value = 1.0
    scene.world = world
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 4.0
    sun.data.angle = 0.05
    sun.rotation_euler = (0.75, 0.0, -0.6)
    scene.collection.objects.link(sun)
    bpy.ops.mesh.primitive_plane_add(size=80)
    ground = bpy.context.active_object
    ground_material = bpy.data.materials.new('ground')
    ground_material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = linear(ground_colour)
    ground.data.materials.append(ground_material)


def render_preview(path, eye, target, lens):
    """Renders the scene from `eye` looking at `target` (metres, z up) into a PNG at `path`."""
    scene = bpy.context.scene
    camera = bpy.data.objects.new('camera', bpy.data.cameras.new('camera'))
    camera.data.lens = lens
    camera.location = eye
    camera.rotation_euler = (Vector(target) - Vector(eye)).to_track_quat('-Z', 'Y').to_euler()
    scene.collection.objects.link(camera)
    scene.camera = camera
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera)
