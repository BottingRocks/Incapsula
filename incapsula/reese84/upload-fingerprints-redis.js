const crypto = require(`crypto`);
const fs = require(`fs`);
const redis = require(`redis`);
const Reese84 = require(`./reese84.js`);
const { fromFile } = require(`../ast.js`);

const REDIS_URL = process.env.REDIS_URL || `redis://fuckyoupaymenow@157.90.233.246:6379/0`;
const reese84File = process.argv.slice(-2)[0];
const payloadFile = process.argv.slice(-1)[0];

const ast = fromFile(reese84File);

function decomposeRedisUrl(url) {
  const [[, , password, host, port]] = [...(url.matchAll(/redis:\/\/(([^@]*)@)?(.*?):(\d*)/g))];
  return { password, host, port };
}

function hash(str){
  return crypto.createHash(`sha256`, `wtf`).update(str).digest(`hex`);
}

Reese84.deobfuscate(ast);

const reese84 = new Reese84(ast);


(async () => {
  const client = redis.createClient(REDIS_URL);
  await client.auth( decomposeRedisUrl(REDIS_URL).password);

  const rawPayloadData = fs.readFileSync(payloadFile, {encoding : `UTF-8`}).toString();

  const rawPayloads = JSON.parse(rawPayloadData);

  const decodedPayloads = [];

  rawPayloads.forEach((rawPayload, index) => {
    let decodedPayload = null;
    try{
      decodedPayload = JSON.stringify(reese84.decodePayload(rawPayload.solution.interrogation.p, rawPayload.solution.interrogation.cr));
    }catch(e){
      console.log(`error`, e);//, rawPayload)
    }finally{

      if(decodedPayload !== null){
        decodedPayloads.push(decodedPayload);
      }else{
        console.log(`Error while trying to insert index:`, index);
      }
    }
  });

  let _client = client.multi();
  console.log(`Loaded :${decodedPayloads.length}`);

  decodedPayloads.forEach((decodedPayload) => {
    _client = _client.hset(`Incapsula`,hash(decodedPayload), decodedPayload);
  });

  _client.exec(function(error, replies){
    console.log(`Inserted:${replies.filter((r) => r === 1).length}`);
    client.quit();
  });
})();







