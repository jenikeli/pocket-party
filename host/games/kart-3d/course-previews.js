// The saved picture of each 3D course, for the setup screen, so it shows the courses without building them. Used
// by the 3D setup screen (host/games/kart-3d/) and by tools/course-previews.js, which shoots each picture at the
// distance `s` along the road named here (`npm run course-previews`).

export const COURSE_PREVIEWS = Object.freeze({
  'palm-bay-airport': {
    picture: '/assets/kart-3d/previews/palm-bay-airport.jpg',
    s: 20,
  },
  'seaside-skyway': {
    picture: '/assets/kart-3d/previews/seaside-skyway.jpg',
    s: 600,
  },
  'test-track': {
    picture: '/assets/kart-3d/previews/test-track.jpg',
    s: 100,
  },
});
