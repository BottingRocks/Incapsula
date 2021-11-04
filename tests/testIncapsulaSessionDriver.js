
const IncapsulaSession = require("../incapsula/session.js");
const DefaultUtmvcPayload = require("../incapsula/payloads/utmvc.js");
const DefaultReese84Payload = require("../incapsula/payloads/reese84.js");

(async function(){
  const session = new IncapsulaSession({
    _2captchaKey : "dccc7554e94f86cbf510942091d0c8b8",
    //proxyUrl : 'http://bbbbilling:No7jX08aKGwPxhtT_country-UnitedStates_session-yCyY7myl@proxy.packetstream.io:31112'
    //proxyUrl : 'http://bbbbilling:No7jX08aKGwPxhtT_country-UnitedStates_session-yCyY7myl@proxy.packetstream.io:31112'
    proxyUrl : `http://192.168.122.1:8888`
  });
  await session.go({
    url : `https://driverpracticaltest.dvsa.gov.uk`,
    utmvc : DefaultUtmvcPayload,
    reese84 : DefaultReese84Payload
  });
  console.log("finishing")
  let refresh = await session.fetch(`https://driverpracticaltest.dvsa.gov.uk`,  { headers: session.defaultHeaders, agent: session.agent })

  console.log(session.getCookies(`https://driverpracticaltest.dvsa.gov.uk`))
}())
