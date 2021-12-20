
const IncapsulaSession = require("../incapsula/session.js");
const DefaultUtmvcPayload = require("../incapsula/payloads/utmvc.js");
const DefaultReese84Payload = require("../incapsula/payloads/reese84.js");

(async function(){
  const session = new IncapsulaSession();
  //const session = new IncapsulaSession({proxyUrl : `http://192.168.122.1:8888`});
  //const session = new IncapsulaSession({ proxyUrl: `quic://127.0.0.1:4477` });
  const result = await session.go({url : `https://www.pokemoncenter.com`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload});
  console.log(result);


  console.log(`cookies:${session.getCookies('https://www.pokemoncenter.com')}`)


}())
