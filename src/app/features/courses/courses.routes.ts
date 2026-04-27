import { type Routes } from '@angular/router';

export const COURSES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Courses',
    children: [],
  },
  {
    path: ':courseId',
    title: 'Course detail',
    children: [],
  },
];

export default COURSES_ROUTES;
