class StatusManager {

	isAnimating;
	viewStatus;

	constructor(element) {
		this.isAnimating = false;
		this.viewStatus = element;
	}

	setStatusText(text) {
		this.viewStatus.css({opacity: 0});
		this.viewStatus.html(text);
		if(!this.isAnimating) {
			this.animationStarted();
			this.viewStatus.animate({opacity: 1}, 400, this.animationStopped.bind(this));
		}
	}

	animationStarted() {
		console.debug('animationStarted()');
		this.isAnimating = true;
	}

	animationStopped() {
		console.debug('animationStopped()');
		this.isAnimating = false;
	}

}
