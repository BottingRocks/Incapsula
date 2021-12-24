
const IncapsulaSession = require("../incapsula/session.js");
const DefaultUtmvcPayload = require("../incapsula/payloads/utmvc.js");
const DefaultReese84Payload = require("../incapsula/payloads/reese84.js");

(async function(){
  //const session = new IncapsulaSession();
  const session = new IncapsulaSession({proxyUrl : `http://192.168.122.1:8888`});
  const result = await session.go({url : `https://www.pokemoncenter.com`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload});
  //const result = await session.go({url : `https://driverpracticaltest.dvsa.gov.uk/`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload});
  console.log(result);

  //console.log(`cookies:${session.getCookies('https://www.pokemoncenter.com')}`)
  console.log(`cookies:${session.getCookies('https://driverpracticaltest.dvsa.gov.uk/')}`)


}())
