const DefaultUtmvcPayload = require(`../payloads/utmvc.js`);
const IncapsulaSession = require(`../session.js`);
const redis = require(`redis`);
const util = require(`util`);

function decomposeRedisUrl(url) {
  const [[, , password, host, port]] = [...(url.matchAll(/redis:\/\/(([^@]*)@)?(.*?):(\d*)/g))];
  return { password, host, port };
}


const handler = async (event) => {
  const client = await redis.createClient({
    url : process.env.REDIS_URL,
  });
  const send_command = util.promisify(client.send_command).bind(client);

  let response = {};
  try {
    await client.auth( decomposeRedisUrl(process.env.REDIS_URL).password);
    const reese84fp = await send_command(`hrandfield`, [`Incapsula`, 1, `WITHVALUES`]);

    const session = new IncapsulaSession({
      proxyUrl : event.body.proxy
    });

    const result = await session.go({
      url : `https://www.pokemoncenter.com/`,
      utmvc : DefaultUtmvcPayload,
      reese84 : reese84fp
    });

    if(result.success){
      response = {
        statusCode : 200,
        body : result.cookies
      };

    }else{
      response = {
        statusCode : 400,
        body : result.error
      };
    }
  } catch (error) {
    response = {
      statusCode : 400,
      body : JSON.stringify(error),
    };
  }
  return response;
};


const event = {
  "body" : {
    "proxy" : `http://kcxqtp12:9lve7X84Nz@162.33.163.180:64293`
  }

};


(async () => {
  console.log(await handler(event));

})();
