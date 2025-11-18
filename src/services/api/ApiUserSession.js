export class ApiUserSession {
    constructor() {
        this.getSession();
    }

    get isActive() {
        return this.savedAt !== null;
    }

    getSession() {
        const sessionData = localStorage.getItem('userSession');
        try {
            if (sessionData) {
                const session = JSON.parse(sessionData);
                this.apiUrl = session.apiUrl || "";
                this.user = {
                    id: session.user.id || "",
                    email: session.user.email || ""
                }
                this.savedAt = session.savedAt || null;
                this.expiresAt = session.expiresAt || null;
            } else {
                throw new Error('No session data');
            }
        } catch (error) {
            // Si le parsing échoue, réinitialiser la session
            this.apiUrl = "";
            this.user = {
                id: "",
                email: ""
            };
            this.savedAt = null;
            this.expiresAt = null;
        }
    }
    
    setSession(user = {}, apiUrl = "") {
        const session = {
            apiUrl: apiUrl || "",
            user: {
                id: user.id || "",
                email: user.email || ""
            },
            savedAt: new Date(),
            expiresAt: null
        }
        this.apiUrl = session.apiUrl;
        this.user = session.user;
        this.savedAt = session.savedAt;
        this.expiresAt = session.expiresAt;

        localStorage.setItem('userSession', JSON.stringify(session));
    }

    clearSession() {
        this.apiUrl = "";
        this.user = {
            id: "",
            email: ""
        };
        this.savedAt = null;
        this.expiresAt = null;

        localStorage.removeItem('userSession');
    }
}