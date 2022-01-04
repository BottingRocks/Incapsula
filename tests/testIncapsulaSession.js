
const IncapsulaSession = require("../incapsula/session.js");
const DefaultUtmvcPayload = require("../incapsula/payloads/utmvc.js");
//const DefaultReese84Payload = require("../incapsula/payloads/reese84.js");
const DefaultReese84Payload = require("../incapsula/payloads/reese84-firefox-linux.js");

(async function(){
  //const session = new IncapsulaSession();
  const userAgent = `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:95.0) Gecko/20100101 Firefox/95.0`;
  const session = new IncapsulaSession({proxyUrl : `http://192.168.122.1:8888`, userAgent});
  //const session = new IncapsulaSession({proxyUrl : `http://127.0.0.1:1080`});
  const result = await session.go({url : `https://www.pokemoncenter.com`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload});
  //const result = await session.go({url : `https://www.corsair.com/us/en/`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload});
  //const result = await session.go({url : `https://driverpracticaltest.dvsa.gov.uk/`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload});
  console.log(result);



}())

