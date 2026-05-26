export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002/api';

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
        throw new Error(data.error?.message || data.error || 'Có lỗi xảy ra');
    }

    if (data && data.success === true && Object.prototype.hasOwnProperty.call(data, 'data')) {
        return data.data;
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
            return data;
        } catch (error) {
            // If no character, return null
            if (error.message.includes('not found') || error.message.includes('Không tìm thấy nhân vật') || error.message.includes('Character not found')) {
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
    create: async (userId, name) => {
        const data = await authFetch('/characters', {
            method: 'POST',
            body: JSON.stringify({ userId, name }),
        });
        return data;
    },

    /**
     * save/update character
     * @param {number} characterId - ID of character
     * @param {object} characterData - Character data
     */
    save: async (characterId, characterData) => {
        const data = await authFetch(`/characters/${characterId}`, {
            method: 'PUT',
            body: JSON.stringify(characterData),
        });
        return data;
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
        return data;
    },

    /**
     * use consumable/book item
     * @param {number} characterId
     * @param {string} itemId
     * @param {number} quantity
     * @param {number} enhanceLevel
     */
    use: async (characterId, itemId, quantity = 1, enhanceLevel = 0) => {
        return authFetch(`/inventory/${characterId}/use`, {
            method: 'POST',
            body: JSON.stringify({ itemId, quantity, enhanceLevel }),
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
        return data;
    },

    /**
     * equip equipment
     * @param {number} characterId 
     * @param {string} slot 
     * @param {string} itemId 
     * @param {number} enhanceLevel
     */
    equip: async (characterId, slot, itemId, enhanceLevel = 0) => {
        return authFetch(`/equipment/${characterId}/equip`, {
            method: 'POST',
            body: JSON.stringify({ slot, itemId, enhanceLevel }),
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

    /**
     * upgrade equipped item
     * @param {number} characterId
     * @param {string} slot
     */
    upgrade: async (characterId, slot) => {
        return authFetch(`/equipment/${characterId}/upgrade`, {
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
        return data.leaderboard || data.data || data;
    },

    /**
     * get power leaderboard
     * @param {number} limit 
     */
    getPower: async (limit = 10) => {
        const data = await authFetch(`/leaderboard/power?limit=${limit}`);
        return data.leaderboard || data.data || data;
    },

    /**
     * get reputation leaderboard
     * @param {number} limit 
     */
    getReputation: async (limit = 10) => {
        const data = await authFetch(`/leaderboard/reputation?limit=${limit}`);
        return data.leaderboard || data.data || data;
    },
};

// ==================== SHOP API ====================

export const shop = {
    /**
     * get shop items
     */
    getItems: async (category) => {
        const query = category ? `?category=${encodeURIComponent(category)}` : '';
        const data = await authFetch(`/shop/items${query}`);
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

// ==================== ITEM CATALOG API ====================

export const items = {
    getAll: async (type) => {
        const query = type ? `?type=${encodeURIComponent(type)}` : '';
        const data = await authFetch(`/items${query}`);
        return data.items;
    },

    getById: async (itemId) => {
        const data = await authFetch(`/items/${encodeURIComponent(itemId)}`);
        return data.item;
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
        return data.events || data;
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
        return data.skills || data;
    },

    /**
     * learn skill
     * @param {number} characterId 
     * @param {string} skillId 
     */
    learn: async (characterId, skillId, bookItemId = skillId) => {
        return authFetch(`/skills/${characterId}/learn`, {
            method: 'POST',
            body: JSON.stringify({ skillId, bookItemId }),
        });
    },
};

// ==================== CULTIVATION API ====================

export const cultivation = {
    /**
     * perform a server-authoritative cultivation tick
     * @param {number} characterId
     * @param {'manual'|'meditation'} mode
     */
    cultivate: async (characterId, mode = 'manual') => {
        return authFetch(`/cultivation/${characterId}/cultivate`, {
            method: 'POST',
            body: JSON.stringify({ mode }),
        });
    },

    /**
     * perform multiple server-authoritative cultivation ticks in one request
     * @param {number} characterId
     * @param {number} ticks
     * @param {'manual'|'meditation'} mode
     */
    cultivateBatch: async (characterId, ticks, mode = 'manual') => {
        return authFetch(`/cultivation/${characterId}/cultivate/batch`, {
            method: 'POST',
            body: JSON.stringify({ mode, ticks }),
        });
    },

    /**
     * attempt breakthrough
     * @param {number} characterId
     * @param {boolean} usePill
     */
    breakthrough: async (characterId, usePill = false) => {
        return authFetch(`/cultivation/${characterId}/breakthrough`, {
            method: 'POST',
            body: JSON.stringify({ usePill }),
        });
    },

    startMeditation: async (characterId) => {
        return authFetch(`/cultivation/${characterId}/meditation/start`, {
            method: 'POST',
        });
    },

    finishMeditation: async (characterId) => {
        return authFetch(`/cultivation/${characterId}/meditation/finish`, {
            method: 'POST',
        });
    },

    meditate: async (characterId) => {
        return authFetch(`/cultivation/${characterId}/meditate`, {
            method: 'POST',
        });
    },
};

// ==================== WORLD API ====================

export const world = {
    /**
     * explore a world zone
     * @param {number} characterId
     * @param {string} zoneId
     */
    explore: async (characterId, zoneId) => {
        return authFetch(`/world/${characterId}/explore`, {
            method: 'POST',
            body: JSON.stringify({ zoneId }),
        });
    },

    refreshExploration: async (characterId) => {
        return authFetch(`/world/${characterId}/refresh-exploration`, {
            method: 'POST',
        });
    },
};

// ==================== QUEST API ====================

export const quests = {
    getActive: async (characterId) => {
        return authFetch(`/quests/${characterId}/active`);
    },

    claimReward: async (characterId) => {
        return authFetch(`/quests/${characterId}/claim`, {
            method: 'POST',
        });
    },
};

// ==================== ALCHEMY API ====================

export const alchemy = {
    /**
     * craft a pill by recipe id
     * @param {number} characterId
     * @param {string} recipeId
     */
    craft: async (characterId, recipeId) => {
        return authFetch(`/alchemy/${characterId}/craft`, {
            method: 'POST',
            body: JSON.stringify({ recipeId }),
        });
    },
};

// ==================== REPUTATION API ====================

export const reputation = {
    /**
     * list reputation title thresholds from the backend catalog
     */
    getTitles: async () => {
        const response = await authFetch('/reputation/titles');
        return response.titles || [];
    },
};

// ==================== SECT / BOSS API ====================

export const sects = {
    getAll: async () => {
        const data = await authFetch('/sects');
        return data.sects || [];
    },

    getProfile: async (characterId) => {
        return authFetch(`/sects/character/${characterId}`);
    },

    getLeaderboard: async () => {
        const data = await authFetch('/sects/leaderboard');
        return data.leaderboard || [];
    },

    create: async (characterId, name, description = '') => {
        return authFetch('/sects', {
            method: 'POST',
            body: JSON.stringify({ characterId, name, description }),
        });
    },

    join: async (sectId, characterId) => {
        return authFetch(`/sects/${sectId}/join`, {
            method: 'POST',
            body: JSON.stringify({ characterId }),
        });
    },

    leave: async (sectId, characterId) => {
        return authFetch(`/sects/${sectId}/leave`, {
            method: 'POST',
            body: JSON.stringify({ characterId }),
        });
    },

    spawnBoss: async (sectId, characterId, bossId) => {
        return authFetch(`/sects/${sectId}/bosses/spawn`, {
            method: 'POST',
            body: JSON.stringify({ characterId, bossId }),
        });
    },

    attackBoss: async (sectId, instanceId, characterId) => {
        return authFetch(`/sects/${sectId}/bosses/${instanceId}/attack`, {
            method: 'POST',
            body: JSON.stringify({ characterId }),
        });
    },

    buyShopItem: async (sectId, characterId, shopItemId) => {
        return authFetch(`/sects/${sectId}/shop/buy`, {
            method: 'POST',
            body: JSON.stringify({ characterId, shopItemId }),
        });
    },

    claimQuest: async (sectId, characterId, questId) => {
        return authFetch(`/sects/${sectId}/quests/${questId}/claim`, {
            method: 'POST',
            body: JSON.stringify({ characterId }),
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
