let notifier = null;

export function setNotifier(fn) {
  notifier = fn;
}

export function notify(options) {
  if (typeof notifier === 'function') {
    notifier(options);
  }
}


