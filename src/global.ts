// Entry of the IIFE build: exposes the library as window.NetteFormsLive for pages that load scripts without a bundler.
import NetteFormsLive from './nette-forms-live';

declare global {
    interface Window {
        NetteFormsLive: typeof NetteFormsLive;
    }
}

window.NetteFormsLive = NetteFormsLive;
