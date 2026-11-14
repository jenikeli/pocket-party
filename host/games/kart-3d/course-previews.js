// The saved picture and one-line description of each 3D course, for the setup screen, so it shows the courses
// without building them. Used by the 3D setup screen (host/games/kart-3d/) and by tools/course-previews.js, which
// shoots each picture at the distance `s` along the road named here (`npm run course-previews`).

export const COURSE_PREVIEWS = Object.freeze({
  'palm-bay-airport': {
    picture: '/assets/kart-3d/previews/palm-bay-airport.jpg',
    blurb: 'Apron, a tunnel under the runway, an anti-gravity ring, a glide over the bay',
    s: 20,
  },
  'seaside-skyway': {
    picture: '/assets/kart-3d/previews/seaside-skyway.jpg',
    blurb: 'Bridges and decks high over the sea',
    s: 600,
  },
  'test-track': {
    picture: '/assets/kart-3d/previews/test-track.jpg',
    blurb: 'A plain loop for trying the handling',
    s: 100,
  },
});
