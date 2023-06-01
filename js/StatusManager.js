class StatusManager {

	viewStatus;

	constructor(element) {
		this.viewStatus = element;
	}

	setStatusText(text) {
		this.viewStatus.hide().html(text).fadeIn(1500);
	}

	updateStatusText(text) {
		this.viewStatus.html(text);
	}



}
