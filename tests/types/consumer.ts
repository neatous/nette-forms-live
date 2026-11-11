// Compiled by `npm run typecheck`: the library must accept the real nette-forms instance with its own types.
import Nette from 'nette-forms';
import NetteFormsLive, { type ErrorsEventDetail } from '../../src/nette-forms-live';

NetteFormsLive.install(Nette, { preset: 'bootstrap4', validateOn: { blur: 'always' } });

document.addEventListener('nette-forms-live:errors', (event) => {
    const detail = (event as CustomEvent<ErrorsEventDetail>).detail;

    console.log(detail.source, detail.errors.length);
});
