import NetteFormsLive from './nette-forms-live';
declare global {
    interface Window {
        NetteFormsLive: typeof NetteFormsLive;
    }
}
