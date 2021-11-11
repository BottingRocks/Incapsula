
const IncapsulaSession = require("../incapsula/session.js");
const DefaultUtmvcPayload = require("../incapsula/payloads/utmvc.js");
const DefaultReese84Payload = require("../incapsula/payloads/reese84.js");

(async function(){
  //const session = new IncapsulaSession();
  const session = new IncapsulaSession({proxyUrl : `http://192.168.122.1:8888`});
  //await session.go({url : `https://www.id.me/session/new`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload});
  await session.go({url : `https://www.id.me/session/new`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload});
  //await session.go({url : `https://api.id.me/en/session/new`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload});


  console.log(`cookies:${session.getCookies('https://www.id.me/')}`)
  console.log(`\n`)
  console.log(`cookies:${session.getCookies('https://api.id.me/')}`)


}())
