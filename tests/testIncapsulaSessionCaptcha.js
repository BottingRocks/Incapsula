
const IncapsulaSession = require("../incapsula/session.js");
const DefaultUtmvcPayload = require("../incapsula/payloads/utmvc.js");
const DefaultReese84Payload = require("../incapsula/payloads/reese84.js");

(async function(){
  const session = new IncapsulaSession({
    _2captchaKey : "dccc7554e94f86cbf510942091d0c8b8",
    //proxyUrl : 'http://bbbbilling:No7jX08aKGwPxhtT_country-UnitedStates_session-OwzmuvQU@proxy.packetstream.io:31112',
    //proxyUrl : 'http://kcxqtp12:9lve7X84Nz@162.33.166.81:65437',
    proxyUrl : `http://192.168.122.1:8888`,
    //proxyUrl : `http://49.12.203.123:38080`
    askForCaptcha : true
  });
  await session.go({
    url : `https://driverpracticaltest.dvsa.gov.uk/`,
    utmvc : DefaultUtmvcPayload,
    reese84 : DefaultReese84Payload
  });

  await session.fetch('https://driverpracticaltest.dvsa.gov.uk/', { headers : session.defaultHeaders, agent : session.agent})
  console.log("finishing")
  console.log(session.getCookies(`https://driverpracticaltest.dvsa.gov.uk/`));


}())
