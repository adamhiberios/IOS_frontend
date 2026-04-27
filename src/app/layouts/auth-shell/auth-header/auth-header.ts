import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LanguageSelector } from '@ui';

/**
 * `ios-auth-header` — minimal, responsive top bar used across the auth shell
 * (login, register, password reset, MFA).
 *
 * Contents (left → right, swapped automatically in RTL):
 *  - Brand logo as a link back to `/`.
 *  - Language selector.
 *
 * No background by default — pages choose their own surface and overlay this
 * header absolutely if they need the form to peek behind it.
 */
@Component({
  selector: 'ios-auth-header',
  imports: [NgOptimizedImage, RouterLink, LanguageSelector],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="absolute inset-x-0 top-0 z-10
             border-b border-gray-200 bg-white/90 backdrop-blur-sm"
    >
      <div class="flex items-center justify-between px-4 md:px-8 py-3">
        <a routerLink="/" aria-label="Institute of Scrum — home">
          <img
            ngSrc="/assets/icons/logo_institute_of_scrum.png"
            alt="Institute of Scrum"
            width="50"
            height="50"
            class="h-10 w-auto"
            priority
          />
        </a>
        <ios-language-selector />
      </div>
    </header>
  `,
})
export class AuthHeader {}
