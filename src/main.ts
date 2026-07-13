import { mount } from 'svelte';
import App from './app/App.svelte';
import './app/app.css';
import { markStartup } from './editor/performance/performance-sampler';
import { logger } from './logging/logger';

markStartup('bootstrap-start');

const target = document.getElementById('app');

if (!target) {
  throw new Error('Application mount element was not found');
}

window.addEventListener('error', (event) => logger.error('Unhandled window error', event.error));
window.addEventListener('unhandledrejection', (event) =>
  logger.error('Unhandled promise rejection', event.reason),
);

mount(App, { target });
