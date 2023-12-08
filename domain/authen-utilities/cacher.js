const tokenManager = require('./verifytoken.js');

module.exports = {
    async set(adapter, broker, key, value) {
        let encodedValue = tokenManager.createToken({
            data: value
        })
        if (process.env.USE_DB_CACHE.toString() == '1')
            try {
                let res = await adapter.db.query(`CALL cache_insert_delete_select_update('${key}', '${encodedValue}', 'Insert')`);
                console.log('Kết QUẢ TU LENH SET -------------------------------------------------', res)
                return true
            } catch (error) {
                return false
            }
        else
            return broker.cacher.set(key, value)
    },
    async get(adapter, broker, key) {
        if (process.env.USE_DB_CACHE.toString() == '1')
            try {
                let result = await adapter.db.query(`CALL cache_insert_delete_select_update('${key}', '', 'Select')`);
                if (result.length > 0) {
                    let returnData = tokenManager.decodeToken(result[0].Value).data;
                    return returnData;
                }
                else
                    return false;
            } catch (error) {
                return false
            }
        else
            return broker.cacher.get(key)
    },
    async del(adapter, broker, key) {
        if (process.env.USE_DB_CACHE.toString() == '1')
            try {
                await adapter.db.query(`CALL cache_insert_delete_select_update('${key}', '', 'Delete')`);
                return true
            } catch (error) {
                return false
            }
        else
            return broker.cacher.del(key);

    },
    async updateCurrentUserCachedPermissionList(currentToken, adapter, broker) {
        //1st update for the current user
        let userID = tokenManager.decodeToken(currentToken).userID;
        let res = await this.get(adapter, broker, userID);
        console.log('GET Quyen Cu tu Cache Thanh CONG-----------------------------------------')

        if (res) {
            let getUserPermissionResult = await adapter.db.query(`CALL find_user_permission_and_role('${userID}')`)
            console.log('GET QUYEN Cu tu Recent -----------------------------------------')
            // console.log(getUserPermissionResult)
            if (getUserPermissionResult != null) {
                if (Array.isArray(res)) {
                    for (let i = 0; i < res.length; ++i) {
                        res[i].role_permission = getUserPermissionResult
                    }
                    try {
                        await this.set(adapter, broker, userID, res);
                        console.log('SET Quyen MOI Thanh CONG-----------------------------------------')
                    } catch (error) {
                        console.log(error)
                    }              
                }
                else
                    {
                        try {
                            await this.set(adapter, broker, userID, { token: currentToken, role_permission: getUserPermissionResult, user_info: res.user_info });
                            console.log('SET Quyen MOI Thanh CONG-----------------------------------------')
                        } catch (error) {
                            console.log(error)
                        }
                       
                    }
            
                }
        }

        // then update for the super-admin
        this.updateCurrentUserCachedPermissionList_forSuperRole(userID, adapter, broker);
        return true
    },

    async updateCurrentUserCachedPermissionList_forSuperRole(current_userID, adapter, broker) {
        let listOfAllSupers = await adapter.db.query(`CALL find_all_users_with_role('super_admin')`)
        let groupByKey = (list, key, { omitKey = false }) => list.reduce((hash, { [key]: value, ...rest }) => ({ ...hash, [value]: (hash[value] || []).concat(omitKey ? { ...rest } : { [key]: value, ...rest }) }), {})
        let groupedByUser = groupByKey(listOfAllSupers, 'UserID', { omitKey: true });
        for (const user_ID in groupedByUser) {

            if (user_ID != current_userID) {
                console.log(user_ID, current_userID)
                //chỉ update cho user khác user hiện tại và có quyền super-admin
                res = await this.get(adapter, broker, user_ID.toString());
                if (res) {
                    let getUserPermissionResult = groupedByUser[user_ID]
                    if (getUserPermissionResult != null) {
                        if (Array.isArray(res)) {
                            for (let i = 0; i < res.length; ++i) {
                                res[i].role_permission = getUserPermissionResult
                            }
                            await this.set(adapter, broker, user_ID, res);
                        }
                        else
                            await this.set(adapter, broker, user_ID, { token: res.token, role_permission: getUserPermissionResult, user_info: res.user_info });
                    }
                }
            }
        }
    }
};