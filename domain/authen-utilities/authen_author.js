module.exports= async (ctx, broker) =>{
    let res = null
    try {
        res = [];
        res.push(await broker.call("authen.authenticate", ctx));
        res.push(await broker.call("authorize.authorization", ctx));
        console.log('Success >>', res);
        return { res: res, success: 1 };
    } catch (err) {
        console.log('Fail >>', err.message);
        return { err: err.message, success: 0 };
    }

    // return { res: res, success: 1 };

}