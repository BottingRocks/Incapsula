
const IncapsulaSession = require("../incapsula/session.js")
const DefaultUtmvcPayload = require("../incapsula/payloads/utmvc.js");
const DefaultReese84Payload = require("../incapsula/payloads/reese84.js");
//const DefaultReese84Payload = require("../incapsula/payloads/reese84_dummy_mouse_touch.js");
//const DefaultReese84Payload = require("../incapsula/payloads/p.js");

(async function(){
  //const session = new IncapsulaSession();
  const userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36`;
  const session = new IncapsulaSession({proxyUrl : `http://127.0.0.1:8888`, userAgent});
  //const session = new IncapsulaSession({proxyUrl : `http://127.0.0.1:1080`});
  const result = await session.go({url : `https://www.pokemoncenter.com`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload});
  //const result = await session.go({url : `https://www.vanillaprepaid.com`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload});
  //const result = await session.go({url : `https://balance.vanillagift.com/`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload});
  //const result = await session.go({url : `https://www.corsair.com/us/en/`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload});
  //const result = await session.go({url : `https://driverpracticaltest.dvsa.gov.uk/`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload2});
  console.log(result);



}())

