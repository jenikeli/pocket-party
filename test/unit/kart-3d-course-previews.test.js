// Unit tests for the saved course pictures (host/games/kart-3d/course-previews.js, made by tools/course-previews.js).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { COURSES } from '../../host/games/kart-3d/courses.js';
import { COURSE_PREVIEWS } from '../../host/games/kart-3d/course-previews.js';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { previewFile } from '../../tools/course-previews.js';

const JPEG_START = [0xff, 0xd8, 0xff];

test('every course has a preview entry and no entry is for an unknown course', () => {
  assert.deepEqual(Object.keys(COURSE_PREVIEWS).sort(), COURSES.map((course) => course.id).sort());
});

test('every entry has a distance that is on the course', () => {
  for (const course of COURSES) {
    const { s } = COURSE_PREVIEWS[course.id];
    assert.ok(s >= 0 && s < buildTrack(course).length, `${course.id}: s ${s} is on the course`);
  }
});

test('every course has its picture on disk, a JPEG', () => {
  for (const course of COURSES) {
    const file = previewFile(course.id);
    assert.equal(COURSE_PREVIEWS[course.id].picture, `/assets/kart-3d/previews/${course.id}.jpg`);
    assert.ok(fs.existsSync(file), `${course.id}: ${file} exists (run npm run course-previews)`);
    assert.deepEqual([...fs.readFileSync(file).subarray(0, 3)], JPEG_START, `${course.id} is a JPEG`);
  }
});
