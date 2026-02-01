const API_BASE_URL = 'http://localhost:3002/api';

// ==================== TOKEN MANAGEMENT ====================

/**
 * get token from localStorage
 */
export const getToken = () => {
    return localStorage.getItem('auth_token');
};

/**
 * save token to localStorage
 */
export const setToken = (token) => {
    localStorage.setItem('auth_token', token);
};

/**
 * remove token (logout)
 */
export const clearToken = () => {
    localStorage.removeItem('auth_token');
};

// ==================== HTTP HELPERS ====================

/**
 * Fetch wrapper with auto token and error handling
 */
const authFetch = async (endpoint, options = {}) => {
    const token = getToken();

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
        },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Parse JSON response
    const data = await response.json();

    // If response is not OK, throw error
    if (!response.ok) {
        // If 401/403 and has token -> token expired -> clear
        if ((response.status === 401 || response.status === 403) && token) {
            clearToken();
        }
        throw new Error(data.error || 'Có lỗi xảy ra');
    }

    return data;
};

// ==================== AUTH API ====================

export const auth = {
    /**
     * register new account
     * @param {string} username - username
     * @param {string} email - email
     * @param {string} password - password
     * @returns {Promise<{token: string, user: object}>}
     */
    register: async (username, email, password) => {
        const data = await authFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password }),
        });
        return data;
    },

    /**
     * login
     * @param {string} email - email
     * @param {string} password - password
     * @returns {Promise<{token: string, user: object}>}
     */
    login: async (email, password) => {
        const data = await authFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username: email, password }),
        });
        return data;
    },

    /**
     * @returns {Promise<object>} User info
     */
    me: async () => {
        const data = await authFetch('/auth/me');
        return data;
    },

    /**
     * change password
     * @param {string} currentPassword - current password
     * @param {string} newPassword - new password
     */
    changePassword: async (currentPassword, newPassword) => {
        return authFetch('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    },
};

// ==================== CHARACTER API ====================

export const characters = {
    /**
     * get character of user
     * @param {number} userId - ID of user
     * @returns {Promise<object|null>} Character data or null
     */
    get: async (userId) => {
        try {
            const data = await authFetch(`/characters/${userId}`);
            return data.character;
        } catch (error) {
            // If no character, return null
            if (error.message.includes('not found') || error.message.includes('không tìm thấy')) {
                return null;
            }
            throw error;
        }
    },

    /**
     * create new character
     * @param {number} userId - ID of user
     * @returns {Promise<object>} new character
     */
    create: async (userId) => {
        const data = await authFetch('/characters', {
            method: 'POST',
            body: JSON.stringify({ userId }),
        });
        return data.character;
    },

    /**
     * save/update character
     * @param {number} characterId - ID of character
     * @param {object} characterData - Character data
     */
    save: async (characterId, characterData) => {
        return authFetch(`/characters/${characterId}`, {
            method: 'PUT',
            body: JSON.stringify(characterData),
        });
    },
};

// ==================== INVENTORY API ====================

export const inventory = {
    /**
     * get inventory of character
     * @param {number} characterId 
     */
    get: async (characterId) => {
        const data = await authFetch(`/inventory/${characterId}`);
        return data.items;
    },

    /**
     * sync inventory
     * @param {number} characterId 
     * @param {Array} items - items list
     */
    sync: async (characterId, items) => {
        return authFetch(`/inventory/${characterId}/sync`, {
            method: 'PUT',
            body: JSON.stringify({ items }),
        });
    },

    /**
     * add item to inventory
     * @param {number} characterId 
     * @param {string} itemId 
     * @param {number} quantity 
     */
    add: async (characterId, itemId, quantity = 1) => {
        return authFetch(`/inventory/${characterId}/add`, {
            method: 'POST',
            body: JSON.stringify({ itemId, quantity }),
        });
    },
};

// ==================== EQUIPMENT API ====================

export const equipment = {
    /**
     * get equipment
     * @param {number} characterId 
     */
    get: async (characterId) => {
        const data = await authFetch(`/equipment/${characterId}`);
        return data.equipment;
    },

    /**
     * equip equipment
     * @param {number} characterId 
     * @param {string} slot 
     * @param {string} itemId 
     */
    equip: async (characterId, slot, itemId) => {
        return authFetch(`/equipment/${characterId}/equip`, {
            method: 'POST',
            body: JSON.stringify({ slot, itemId }),
        });
    },

    /**
     * unequip equipment
     * @param {number} characterId 
     * @param {string} slot 
     */
    unequip: async (characterId, slot) => {
        return authFetch(`/equipment/${characterId}/unequip`, {
            method: 'POST',
            body: JSON.stringify({ slot }),
        });
    },
};

// ==================== LEADERBOARD API ====================

export const leaderboard = {
    /**
     * get cultivation leaderboard
     * @param {number} limit - limit results (default 10)
     */
    getCultivation: async (limit = 10) => {
        const data = await authFetch(`/leaderboard?limit=${limit}`);
        return data.leaderboard;
    },

    /**
     * get power leaderboard
     * @param {number} limit 
     */
    getPower: async (limit = 10) => {
        const data = await authFetch(`/leaderboard/power?limit=${limit}`);
        return data.leaderboard;
    },

    /**
     * get reputation leaderboard
     * @param {number} limit 
     */
    getReputation: async (limit = 10) => {
        const data = await authFetch(`/leaderboard/reputation?limit=${limit}`);
        return data.leaderboard;
    },
};

// ==================== SHOP API ====================

export const shop = {
    /**
     * get shop items
     */
    getItems: async () => {
        const data = await authFetch('/shop/items');
        return data.items;
    },

    /**
     * buy item
     * @param {number} characterId 
     * @param {string} itemId 
     * @param {number} quantity 
     */
    buy: async (characterId, itemId, quantity = 1) => {
        return authFetch('/shop/buy', {
            method: 'POST',
            body: JSON.stringify({ characterId, itemId, quantity }),
        });
    },

    /**
     * sell item
     * @param {number} characterId 
     * @param {string} itemId 
     * @param {number} quantity 
     */
    sell: async (characterId, itemId, quantity = 1) => {
        return authFetch('/shop/sell', {
            method: 'POST',
            body: JSON.stringify({ characterId, itemId, quantity }),
        });
    },
};

// ==================== EVENTS API ====================

export const events = {
    /**
     * get event log
     * @param {number} characterId 
     * @param {number} limit 
     */
    get: async (characterId, limit = 20) => {
        const data = await authFetch(`/events/${characterId}?limit=${limit}`);
        return data.events;
    },

    /**
     * add event log
     * @param {number} characterId 
     * @param {string} eventType 
     * @param {string} message 
     */
    add: async (characterId, eventType, message) => {
        return authFetch(`/events/${characterId}`, {
            method: 'POST',
            body: JSON.stringify({ eventType, message }),
        });
    },
};

// ==================== SKILLS API ====================

export const skills = {
    /**
     * get skills
     * @param {number} characterId 
     */
    get: async (characterId) => {
        const data = await authFetch(`/skills/${characterId}`);
        return data.skills;
    },

    /**
     * learn skill
     * @param {number} characterId 
     * @param {string} skillId 
     */
    learn: async (characterId, skillId) => {
        return authFetch(`/skills/${characterId}/learn`, {
            method: 'POST',
            body: JSON.stringify({ skillId }),
        });
    },
};

// ==================== HEALTH CHECK ====================

export const health = {
    /**
     * check backend is running
     */
    check: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            return response.ok;
        } catch {
            return false;
        }
    },
};
