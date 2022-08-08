
const IncapsulaSession = require("../incapsula/session.js")
const DefaultUtmvcPayload = require("../incapsula/payloads/utmvc.js");
//const DefaultReese84Payload = require("../incapsula/payloads/reese84.js");
const DefaultReese84Payload = require("../incapsula/payloads/reese84-firefox-linux.js");
const DefaultReese84Payload2 = require("../incapsula/payloads/reese84-balance.js");

(async function(){
  //const session = new IncapsulaSession();
  //const userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36`;
  const userAgent = `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:103.0) Gecko/20100101 Firefox/103.0`;
  const session = new IncapsulaSession({proxyUrl : `http://127.0.0.1:8888`, userAgent});
  //const session = new IncapsulaSession({proxyUrl : `http://127.0.0.1:1080`});
  //const result = await session.go({url : `https://www.pokemoncenter.com`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload2});
  const result = await session.go({url : `https://balance.vanillagift.com/`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload2});
  //const result = await session.go({url : `https://www.corsair.com/us/en/`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload});
  //const result = await session.go({url : `https://driverpracticaltest.dvsa.gov.uk/`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload});
  console.log(result);



}())

