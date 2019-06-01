import { Inject } from '@angular/core';
import { NavigationExtras, NavigationStart, RouteConfigLoadEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, pairwise, skip } from 'rxjs/operators';
import { LocalizeRouterSettings } from './localize-router.config';
import { LocalizeParser } from './localize-router.parser';


/**
 * Localization service
 * modifyRoutes
 */
export class LocalizeRouterService {
  routerEvents: Subject<string>;

  /**
   * CTOR
   */
  constructor(
    @Inject(LocalizeParser) public parser: LocalizeParser,
    @Inject(LocalizeRouterSettings) public settings: LocalizeRouterSettings,
    @Inject(Router) private router: Router) {
    this.routerEvents = new Subject<string>();
  }

  /**
   * Start up the service
   */
  init(): void {
    this.router.resetConfig(this.parser.routes);
    // subscribe to router events
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationStart),
        pairwise()
      )
      .subscribe(this._routeChanged());
    this.lazyModuleLoaded();
  }

  lazyModuleLoaded() {
    this.router.events.pipe(filter(event => event instanceof RouteConfigLoadEnd), skip(1)).subscribe((e: RouteConfigLoadEnd) => {
      this.parser.initChildRoutes([].concat(...[e.route]));
    });
  }

  /**
   * Change language and navigate to translated route
   */
  changeLanguage(lang: string, extras?: NavigationExtras, useNavigateMethod?: boolean): void {
    // if (this.route) {
    //   console.log(this.route);
    // }
    if (lang !== this.parser.currentLang) {
      let url: string = this.router.url; //this.router.routerState.snapshot.root;

      this.parser.translateRoutes(lang).subscribe(() => {

        //let url = this.traverseRouteSnapshot(rootSnapshot);
        url = this.translateRoute(url) as string;

        if (!this.settings.alwaysSetPrefix) {
          let urlSegments = url.split('/');
          const languageSegmentIndex = urlSegments.indexOf(this.parser.currentLang);
          // If the default language has no prefix make sure to remove and add it when necessary
          if (this.parser.currentLang === this.parser.defaultLang) {
            // Remove the language prefix from url when current language is the default language
            if (languageSegmentIndex === 0 || (languageSegmentIndex === 1 && urlSegments[0] === '')) {
              // Remove the current aka default language prefix from the url
              urlSegments = urlSegments.slice(0, languageSegmentIndex).concat(urlSegments.slice(languageSegmentIndex + 1));
            }
          } else {
            // When coming from a default language it's possible that the url doesn't contain the language, make sure it does.
            if (languageSegmentIndex === -1) {
              // If the url starts with a slash make sure to keep it.
              const injectionIndex = urlSegments[0] === '' ? 1 : 0;
              urlSegments = urlSegments.slice(0, injectionIndex).concat(this.parser.currentLang, urlSegments.slice(injectionIndex));
            }
          }
          url = urlSegments.join('/');
        }

        const lastSlashIndex = url.lastIndexOf('/');
        if (lastSlashIndex > 0 && lastSlashIndex === url.length - 1) {
          url = url.slice(0, -1);
        }

        this.router.resetConfig(this.parser.routes);
        if (useNavigateMethod) {
          this.router.navigate([url], extras);
        } else {
          // if (!extras) {
          //   this.location.replaceState(url); // go(url)
          // } else {
          //   this.router.navigateByUrl(url, extras);
          // }
          this.router.navigateByUrl(url, extras);
        }
      });
    }
  }

  /**
   * Translate route to current language
   * If new language is explicitly provided then replace language part in url with new language
   */
  translateRoute(path: string | any[]): string | any[] {
    if (typeof path === 'string') {
      const url = this.parser.translateRoute(path);
      return !path.indexOf('/') ? `/${this.parser.urlPrefix}${url}` : url;
    }
    // it's an array
    const result: any[] = [];
    (path as Array<any>).forEach((segment: any, index: number) => {
      if (typeof segment === 'string') {
        const res = this.parser.translateRoute(segment);
        if (!index && !segment.indexOf('/')) {
          result.push(`/${this.parser.urlPrefix}${res}`);
        } else {
          result.push(res);
        }
      } else {
        result.push(segment);
      }
    });
    return result;
  }

  /**
   * Event handler to react on route change
   */
  private _routeChanged(): (eventPair: [NavigationStart, NavigationStart]) => void {
    return ([previousEvent, currentEvent]: [NavigationStart, NavigationStart]) => {
      const previousLang = this.parser.currentLang; // this.parser.getLocationLang(previousEvent.url) || this.parser.defaultLang;
      const currentLang = this.parser.getLocationLang(currentEvent.url) || this.parser.defaultLang;
      if (currentLang !== previousLang) {
        this.parser.translateRoutes(currentLang).subscribe(() => {
          this.router.resetConfig(this.parser.routes);
          // Fire route change event
          this.routerEvents.next(currentLang);
        });
      }
    };
  }
}