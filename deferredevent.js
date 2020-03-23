export default class DeferredEvent {
  constructor(defer=1000) {
    this.timer = null;
    this.defer = defer;
  }

  trigger(act) {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setTimeout(() => {
      act();
      this.timer = null;
    }, this.defer);
  }
};
