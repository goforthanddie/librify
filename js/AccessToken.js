class AccessToken {
    constructor(token, type, refreshToken, expiresIn) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.type = type;
        this.expiresIn = expiresIn;
    }
}