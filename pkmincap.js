


const redis = require('redis');
const IncapsulaSession = require(`./incapsula/session.js`);

exports.handler = async (event) => {
    /*
    const client = await redis.createClient({
        url: process.env.REDIS_URL,
    });
    */

    try {
        let response = {}
        /*
        await client.connect();
        console.log(`Connected to Redis...`);
        const newFpObj = client.sRandMember('Incapsula.1')
        //access fingerprint like this
        const fp = newFpObj.fingerprint
        */

        //access proxy through json body posted to lambda
        const proxy = event.body.proxy
        let reese84Cookie = ''  //set this below using code
        /*
          Use fp and proxy to generate reese84 cookie
        */
        response = {
            statusCode: 200,
            body: JSON.stringify(reese84Cookie ),
        };
    } catch (error) {
        console.log(`Error ${error}`);
        response = {
            statusCode: 400,
            body: JSON.stringify(error),
        };
    }
    return response;
};

