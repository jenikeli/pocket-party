# The palm for the M7d4c2 Blender spike (run by `npm run blender -- palm`): a detailed palm (a trunk of
# scalloped, bark-textured scales; fronds of real blades) baked with Cycles onto a game palm (a ringed tube and
# folded cards), exported as a .glb with two meshes, `trunk` and `fronds`. Same size and pose as kit/palm.js:
# it stands on the ground at the origin, 8.5 tall, leaning toward +x. Blender is z up; the exporter turns that
# into glTF's y up, so Blender's (x, y, z) is the game's (x, -z, y).

import math
import os
import random
import sys
import time

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
# No __pycache__ folder next to the scripts in the repo.
sys.dont_write_bytecode = True
import common  # noqa: E402 (found through the path added above)

HEIGHT = 8.5
LEAN = 1.6
RINGS = 12
FOOT_RADIUS = 0.4
TOP_RADIUS = 0.24
# A scale's lip is this much wider than the trunk's core (0.47 at the foot, inside the layout's 0.5), and its
# top tucks in under the next scale's lip.
FLARE = 1.18
TUCK = 0.9
TEETH = 8
FRONDS = 10
FROND_LENGTH = 4.4
FROND_WIDTH = 0.85
# Each half of a frond slopes down from the midrib like a roof, by this much per metre out.
FOLD = 0.35
BLADES = 26
BLADE_ANGLE = math.radians(50)
# The frond whose blades are baked into the one texture every frond card shares.
TEMPLATE_RISE = 1.7

BARK_LIGHT = '#d4873a'
BARK_DARK = '#74401c'
CROWN_COLOUR = '#7d7a34'
COCONUT_COLOUR = '#6a4420'
GREENS = ['#2f8f2c', '#56b83c']
MIDRIB_COLOUR = '#c6d36a'


def trunk_point(share):
    """The trunk's centre line at `share` (0 at the foot, 1 at the crown): straight up, bending over near the top."""
    return Vector((LEAN * share * share, 0, HEIGHT * share))


def trunk_section(share, angle, radius):
    """A point `radius` out from the centre line at `share`, `angle` round it, in the plane square to the line."""
    tangent = Vector((2 * LEAN * share, 0, HEIGHT)).normalized()
    out = Vector((tangent.z, 0, -tangent.x))
    return trunk_point(share) + radius * (math.cos(angle) * out + math.sin(angle) * Vector((0, 1, 0)))


def zigzag(angle, ring):
    """0 at a notch of a scale's lower edge, 1 at a tooth's tip; every other ring half a tooth round, like scales."""
    x = angle * TEETH / (2 * math.pi) + 0.5 * (ring % 2)
    return 1 - abs(2 * (x - math.floor(x)) - 1)


def scale_point(ring, angle, t):
    """A point on scale `ring`, from its lip (t = 0: flared out, its teeth hanging over the scale below) to its top
    (t = 1: tucked in under the next lip). The radius curves in like a bell, so each scale looks plump. Rows go
    up and angles round toward +y, so faces built row on row point out of the trunk."""
    lip = max(0.0, (ring - 0.15 - 0.25 * zigzag(angle, ring)) / RINGS)
    share = lip + t * ((ring + 1.05) / RINGS - lip)
    core = FOOT_RADIUS + (TOP_RADIUS - FOOT_RADIUS) * share
    return trunk_section(share, angle, core * (TUCK + (FLARE - TUCK) * (1 - t) ** 2))


def add_crown(bm, segments, colour=None):
    """The knob where the fronds meet and three coconuts under it, as UV spheres (given UVs if the bmesh has a
    UV layer). `colour`, a colour attribute layer, is filled for the detailed palm's material."""
    top = trunk_point(1)
    parts = [(Matrix.Translation(top + Vector((0, 0, 0.12))) @ Matrix.Diagonal((0.45, 0.45, 0.38, 1)), CROWN_COLOUR)]
    for nut in range(3):
        angle = 2 * math.pi * nut / 3 + 0.5
        place = top + Vector((0.34 * math.cos(angle), 0.34 * math.sin(angle), -0.3))
        parts.append((Matrix.Translation(place) @ Matrix.Scale(0.22, 4), COCONUT_COLOUR))
    for matrix, hex_colour in parts:
        made = bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=segments // 2, radius=1,
                                         matrix=matrix, calc_uvs=bool(bm.loops.layers.uv))
        for vert in made['verts'] if colour else []:
            vert[colour] = common.linear(hex_colour)


def frond_height(share, rise):
    """A frond's midrib rises by about `rise` from the crown, then droops 2 below it at the tip (share 1)."""
    return rise * share - (rise + 2) * share * share


def blade_reach(share):
    """How far out from the midrib the blades reach: shortest at the foot and the tip."""
    return FROND_WIDTH * math.sin(math.pi * (0.06 + 0.94 * share)) ** 0.6


def card_reach(share):
    """Half the card's width: it must also cover blades from further back, whose tips reach past their own share."""
    return 1.08 * max(blade_reach(share), blade_reach(max(0.0, share - 0.16))) + 0.03


def frond_surface(along, lateral, rise):
    """A point on a frond's roof-like surface, `along` metres from its foot (+x) and `lateral` out to the side."""
    return Vector((along, lateral, frond_height(along / FROND_LENGTH, rise) - FOLD * abs(lateral)))


# ---- The detailed palm, only for baking ----

def build_high_trunk():
    """Every scale its own shell of 96 x 12 quads, which modifiers thicken, round off and roughen. A `shade`
    value up each scale (0 at the lip, 1 at the top) lets the material darken it toward the next lip."""
    bm = bmesh.new()
    shade = bm.verts.layers.float.new('shade')
    columns, rows = 96, 12
    for ring in range(RINGS):
        grid = []
        for row in range(rows + 1):
            grid.append([bm.verts.new(scale_point(ring, 2 * math.pi * column / columns, row / rows))
                         for column in range(columns)])
            for vert in grid[-1]:
                vert[shade] = row / rows
        common.grid_faces(bm, grid, closed=True)
    trunk = common.object_from_bmesh('trunk_high', bm)
    # The shell's thickness gives each lip a rim; subdividing rounds the rim and the teeth (no sharp edges).
    trunk.modifiers.new('thickness', 'SOLIDIFY').thickness = 0.05
    rounding = trunk.modifiers.new('round', 'SUBSURF')
    rounding.levels = rounding.render_levels = 2
    fibres = bpy.data.textures.new('fibres', 'CLOUDS')
    fibres.noise_scale = 0.05
    relief = trunk.modifiers.new('bark', 'DISPLACE')
    relief.texture = fibres
    relief.texture_coords = 'OBJECT'
    relief.texture_coords_object = fibre_stretch()
    relief.strength = 0.03
    trunk.data.materials.append(bark_material())
    return trunk


def fibre_stretch():
    """An empty stretched eight times up the trunk: noise read through it is long and thin, like bark fibres."""
    stretch = bpy.data.objects.get('fibre_stretch')
    if stretch is None:
        stretch = bpy.data.objects.new('fibre_stretch', None)
        stretch.scale = (1, 1, 8)
        bpy.context.scene.collection.objects.link(stretch)
    return stretch


def bark_material():
    """Orange-brown at each scale's lip, darker toward the crease under the next one, streaked along the fibres."""
    material = bpy.data.materials.new('bark')
    tree = material.node_tree
    shade = tree.nodes.new('ShaderNodeAttribute')
    shade.attribute_name = 'shade'
    ramp = tree.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.3
    ramp.color_ramp.elements[0].color = common.linear(BARK_LIGHT)
    ramp.color_ramp.elements[1].color = common.linear(BARK_DARK)
    tree.links.new(shade.outputs['Fac'], ramp.inputs['Fac'])
    coordinates = tree.nodes.new('ShaderNodeTexCoord')
    coordinates.object = fibre_stretch()
    noise = tree.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 14
    tree.links.new(coordinates.outputs['Object'], noise.inputs['Vector'])
    streaks = tree.nodes.new('ShaderNodeMapRange')
    streaks.inputs['To Min'].default_value = 0.75
    streaks.inputs['To Max'].default_value = 1.2
    tree.links.new(noise.outputs['Fac'], streaks.inputs['Value'])
    tint = tree.nodes.new('ShaderNodeVectorMath')
    tint.operation = 'SCALE'
    tree.links.new(ramp.outputs['Color'], tint.inputs['Vector'])
    tree.links.new(streaks.outputs['Result'], tint.inputs['Scale'])
    tree.links.new(tint.outputs['Vector'], tree.nodes['Principled BSDF'].inputs['Base Color'])
    return material


def build_high_crown():
    bm = bmesh.new()
    add_crown(bm, 48, bm.verts.layers.float_color.new('colour'))
    crown = common.object_from_bmesh('crown_high', bm)
    crown.data.materials.append(common.attribute_material('crown'))
    return crown


def add_blade(bm, colour, side, root, reach, green):
    """One blade from the midrib at share `root` out to `reach`, angled toward the tip: pointed, with a ridge down
    its middle (for the normal map), drooping a little, darker at its foot. Returns its faces."""
    forward = reach / math.tan(BLADE_ANGLE)
    direction = Vector((forward, side * reach)).normalized()
    across = Vector((-direction.y, direction.x))
    rows = []
    for step in range(7):
        u = step / 6
        centre = Vector((root * FROND_LENGTH + u * forward, side * (0.03 + u * (reach - 0.03))))
        half_width = max(0.003, 0.058 * math.sin(math.pi * (0.12 + 0.88 * u)) ** 0.7)
        row = []
        for offset in (-1, 0, 1):
            point = centre + offset * half_width * across
            lift = (0.012 if offset == 0 else 0) - 0.1 * u * u
            vert = bm.verts.new(frond_surface(point.x, point.y, TEMPLATE_RISE) + Vector((0, 0, lift)))
            vert[colour] = tuple(channel * (0.7 + 0.3 * u) for channel in common.linear(green)[:3]) + (1.0,)
            row.append(vert)
        rows.append(row)
    return common.grid_faces(bm, rows, closed=False)


def add_midrib(bm, colour):
    """A tapering tube along the frond's ridge (rows along +x, round toward +z, so its faces point out)."""
    rows = []
    for step in range(17):
        share = step / 16
        centre = frond_surface(share * FROND_LENGTH, 0, TEMPLATE_RISE)
        radius = 0.04 - 0.028 * share
        rows.append([bm.verts.new(centre + radius * Vector((0, math.cos(angle), math.sin(angle))))
                     for angle in (2 * math.pi * side / 6 for side in range(6))])
        for vert in rows[-1]:
            vert[colour] = common.linear(MIDRIB_COLOUR)
    common.grid_faces(bm, rows, closed=True)


def build_high_frond():
    """The template frond's midrib and blades on both sides, varied a little (seeded, so every build is the same)."""
    bm = bmesh.new()
    colour = bm.verts.layers.float_color.new('colour')
    add_midrib(bm, colour)
    rng = random.Random(83)
    blade_faces = []
    for side in (-1, 1):
        for blade in range(BLADES):
            root = 0.04 + 0.9 * (blade + rng.uniform(-0.25, 0.25)) / BLADES
            reach = blade_reach(root) * rng.uniform(0.85, 1.0)
            blade_faces += add_blade(bm, colour, side, root, reach, rng.choice(GREENS))
    # Blades must face up, as the card does, or their baked normals come out upside down.
    bm.normal_update()
    for face in blade_faces:
        if face.normal.z < 0:
            face.normal_flip()
    frond = common.object_from_bmesh('frond_high', bm)
    frond.data.materials.append(common.attribute_material('blades'))
    return frond


# ---- The game palm ----

LOW_COLUMNS = 16  # two per tooth, so the lips' lower edges zigzag like the detailed scales'
LOW_ROWS = (0.0, 0.3, 0.65, 1.0)
RINGS_PER_ISLAND = 3
CARD_STEPS = 10
# Listed from +y to -y so the card's faces point up.
CARD_ACROSS = (1, 0.5, 0, -0.5, -1)
CARD_HALF_WIDTH = max(card_reach(step / 100) for step in range(101))


def build_low_trunk():
    """One tube through every scale's lip, bulge and tucked top (each lip's underside folds back down to the next
    lip), then the crown and coconuts. UVs: the tube unrolled in metres, in islands of three scales, then packed
    with the spheres'."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    rows, row_rings = [], []
    for ring in range(RINGS):
        for t in LOW_ROWS:
            rows.append([bm.verts.new(scale_point(ring, 2 * math.pi * column / LOW_COLUMNS, t))
                         for column in range(LOW_COLUMNS)])
            row_rings.append(ring)
    distance = [[0.0] * LOW_COLUMNS]
    for lower, upper in zip(rows, rows[1:]):
        distance.append([so_far + (top.co - bottom.co).length for so_far, bottom, top in zip(distance[-1], lower, upper)])
    for index, face in enumerate(common.grid_faces(bm, rows, closed=True)):
        row, column = divmod(index, LOW_COLUMNS)
        island = row_rings[row + 1] // RINGS_PER_ISLAND
        start = 0 if island == 0 else island * RINGS_PER_ISLAND * len(LOW_ROWS) - 1
        middle = (island + 0.5) * RINGS_PER_ISLAND / RINGS
        width = 2 * math.pi * (FOOT_RADIUS + (TOP_RADIUS - FOOT_RADIUS) * middle) / LOW_COLUMNS
        # Columns count 0..16 without wrapping, so the island's seam gets both of its edges.
        corners = ((row, column), (row, column + 1), (row + 1, column + 1), (row + 1, column))
        for loop, (r, c) in zip(face.loops, corners):
            loop[uv].uv = (c * width, distance[r][c % LOW_COLUMNS] - distance[start][c % LOW_COLUMNS])
    add_crown(bm, 10)
    trunk = common.object_from_bmesh('trunk', bm)
    common.pack_uvs(trunk, margin=0.01)
    return trunk


def build_cards(name, placements):
    """A folded card for each (rise, matrix) placement, all on the template card's UVs: across 0..1 (the midrib
    at 0.5), along 0..1 to the tip, so every card shows the one baked frond."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    for rise, matrix in placements:
        rows, uvs = [], {}
        for step in range(CARD_STEPS + 1):
            share = step / CARD_STEPS
            row = []
            for across in CARD_ACROSS:
                lateral = across * card_reach(share)
                vert = bm.verts.new(matrix @ frond_surface(share * FROND_LENGTH, lateral, rise))
                uvs[vert] = (0.5 + lateral / (2 * CARD_HALF_WIDTH), share)
                row.append(vert)
            rows.append(row)
        for face in common.grid_faces(bm, rows, closed=False):
            for loop in face.loops:
                loop[uv].uv = uvs[loop.vert]
    return common.object_from_bmesh(name, bm)


def frond_placements():
    """Ten fronds round the crown, each turned, raised and sized a little differently (seeded)."""
    rng = random.Random(89)
    placements = []
    for index in range(FRONDS):
        turn = 2 * math.pi * index / FRONDS + rng.uniform(-0.2, 0.2)
        rise, size = rng.uniform(1.2, 2.2), rng.uniform(0.85, 1.1)
        matrix = Matrix.Translation(trunk_point(1)) @ Matrix.Rotation(turn, 4, 'Z') @ Matrix.Scale(size, 4)
        placements.append((rise, matrix))
    return placements


# ---- Baking, export and checks ----

def bake_trunk(trunk, high_objects):
    """Normal, shade (AO) and colour maps from the detailed trunk and crown. The colour is darkened by half the
    shade too, so the crease under each lip stays dark in full sun, where an occlusion map has no effect."""
    size = 1024
    colour = common.new_image('trunk_colour', size, size)
    normal = common.new_image('trunk_normal', size, size, data=True)
    shade = common.new_image('trunk_occlusion', size, size, data=True)
    trunk.data.materials.append(common.game_material('trunk', colour, normal, shade, roughness=0.85))
    reach = {'extrusion': 0.08, 'ray_distance': 0.25, 'margin': 8}
    common.bake('NORMAL', high_objects, trunk, normal, samples=4, **reach)
    common.bake('AO', high_objects, trunk, shade, samples=32, **reach)
    common.bake('DIFFUSE', high_objects, trunk, colour, samples=4, pass_filter={'COLOR'}, **reach)
    pixels = common.pixel_array(colour)
    pixels[:, :3] *= 0.5 + 0.5 * common.pixel_array(shade)[:, :1]
    common.set_pixels(colour, pixels)


def bake_fronds(template, high_frond):
    """The frond's colour, cut-out and normal map onto the template card. Colour and cut-out are baked at twice
    the size and halved, so the cut-out's edge is soft rather than stair-stepped. The colour bleeds past the
    blades (margin), so their edges do not fade to black; the cut-out is baked with no margin, so its alpha is
    only where blades were hit."""
    width, height = 512, 1024
    colour = common.new_image('fronds_colour', width, height, alpha=True)
    normal = common.new_image('fronds_normal', width, height, data=True)
    material = common.game_material('fronds', colour, normal, alpha_clip=True, roughness=0.7)
    template.data.materials.append(material)
    reach = {'extrusion': 0.12, 'ray_distance': 0.3}
    common.bake('NORMAL', [high_frond], template, normal, samples=4, margin=8, **reach)
    bled = common.new_image('fronds_bled', 2 * width, 2 * height, alpha=True)
    covered = common.new_image('fronds_covered', 2 * width, 2 * height, alpha=True)
    common.bake('DIFFUSE', [high_frond], template, bled, samples=1, margin=32, pass_filter={'COLOR'}, **reach)
    common.bake('DIFFUSE', [high_frond], template, covered, samples=1, margin=0, pass_filter={'COLOR'}, **reach)
    for image in (bled, covered):
        image.scale(width, height)
    pixels = common.pixel_array(bled)
    pixels[:, 3] = common.pixel_array(covered)[:, 3]
    common.set_pixels(colour, pixels)
    return material


def render_previews(folder):
    """The re-imported palm on a sunny day: at eye height from 10 m, close to the trunk, and the crown from above."""
    common.setup_preview_stage('#5d9c35')
    shots = {
        'eye': ((1.0, -10, 1.2), (1.0, 0, 4.6), 22),
        'trunk': ((2.0, -2.8, 1.6), (0.2, 0, 2.3), 35),
        'crown': ((-3, -7, 11.5), (1.6, 0, 8.0), 35),
    }
    for name, (eye, target, lens) in shots.items():
        common.render_preview(os.path.join(os.path.abspath(folder), f'palm-preview-{name}.png'), eye, target, lens)


def main():
    args = common.script_arguments()
    started = time.time()
    common.clear_scene()
    high_trunk, high_crown, high_frond = build_high_trunk(), build_high_crown(), build_high_frond()
    trunk = build_low_trunk()
    template = build_cards('frond_template', [(TEMPLATE_RISE, Matrix.Identity(4))])
    fronds = build_cards('fronds', frond_placements())
    for obj in (high_trunk, high_crown, high_frond, trunk, fronds):
        print(f'triangles {obj.name}: {common.triangle_count(obj)}')
    bake_trunk(trunk, [high_trunk, high_crown])
    print(f'trunk baked at {time.time() - started:.0f} s')
    fronds.data.materials.append(bake_fronds(template, high_frond))
    print(f'fronds baked at {time.time() - started:.0f} s')
    common.export_glb(args.out, [trunk, fronds])
    print('glb', common.glb_summary(args.out))
    print('re-imported', common.reimport_summary(args.out))
    if args.preview:
        render_previews(args.preview)
    print(f'palm done in {time.time() - started:.0f} s')


main()
