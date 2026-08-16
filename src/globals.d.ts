/**
 * Shared state for scripts that re-initialize on every view transition
 * (astro:page-load). Each component stores its previous run's listeners
 * (and animation loops) here so the next run can tear them down instead of
 * stacking duplicates across navigations.
 */
interface Window {
  __fxCleanup?: Array<
    [EventTarget, string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined]
  >;
  __navCleanup?: Array<
    [EventTarget, string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined]
  >;
  __blobCleanup?: Array<[EventTarget, string, EventListenerOrEventListenerObject]>;
  __blobRafs?: number[] | null;
  __quoteTimer?: number | null;
  __aboutParallaxCleanup?: Array<
    [EventTarget, string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined]
  >;
}
