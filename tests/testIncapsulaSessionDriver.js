
const IncapsulaSession = require("../incapsula/session.js");
const DefaultUtmvcPayload = require("../incapsula/payloads/utmvc.js");
const DefaultReese84Payload = require("../incapsula/payloads/reese84.js");

(async function(){
  const session = new IncapsulaSession({
    _2captchaKey : "dccc7554e94f86cbf510942091d0c8b8",
    proxyUrl : 'http://bbbbilling:No7jX08aKGwPxhtT_country-UnitedStates_session-OwzmuvQU@proxy.packetstream.io:31112'
    //proxyUrl : `http://192.168.122.1:8888`
    //proxyUrl : `http://49.12.203.123:38080`
  });
  await session.go({
    url : `https://7net.omni7.jp/detail/1106482072`,
    utmvc : DefaultUtmvcPayload,
    reese84 : DefaultReese84Payload
  });
  console.log("finishing")
  console.log(session.getCookies(`https://7net.omni7.jp/detail/1106482072`));
  let refreshPageAgain, refreshPageBodyAgain;

  refreshPageAgain = await session.fetch('https://7net.omni7.jp/detail/1106482072', {
    headers: {
      ...session.defaultHeaders,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "*/*"
    },
    agent: session.agent,
  });

  refreshPageBodyAgain = await refreshPageAgain.text();
  console.log(`refresh page from main session \n\n`, refreshPageBodyAgain);

  console.log(session.getCookies(`https://7net.omni7.jp/detail/1106482072`))

}())
