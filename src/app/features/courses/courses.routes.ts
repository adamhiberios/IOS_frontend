import { type Routes } from '@angular/router';

/**
 * Student learning routes (wired to `/learning/*` via `CoursesStore`).
 *
 *   /courses                              → CoursesIndexPage  (enrolled certs + progress)
 *   /courses/:certId                      → CurriculumPage    (module/lesson tree)
 *   /courses/:certId/lessons/:lessonId    → LessonPage        (content + video + quiz)
 *
 * All are enrolment-gated server-side (403 when not purchased); the pages surface
 * that as an inline error. The feature is lazy-loaded and behind `authGuard`
 * (see `app.routes.ts`).
 */
export const COURSES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'My Courses — Institute of Scrum',
    loadComponent: () => import('./pages/courses-index.page').then((m) => m.CoursesIndexPage),
  },
  {
    path: ':certId',
    title: 'Curriculum — Institute of Scrum',
    loadComponent: () => import('./pages/curriculum.page').then((m) => m.CurriculumPage),
  },
  {
    path: ':certId/lessons/:lessonId',
    title: 'Lesson — Institute of Scrum',
    loadComponent: () => import('./pages/lesson.page').then((m) => m.LessonPage),
  },
];

export default COURSES_ROUTES;
