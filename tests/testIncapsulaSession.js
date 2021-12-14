
const IncapsulaSession = require("../incapsula/session.js");
const DefaultUtmvcPayload = require("../incapsula/payloads/utmvc.js");
const DefaultReese84Payload = require("../incapsula/payloads/reese84.js");

(async function(){
  const session = new IncapsulaSession({proxyUrl : `http://192.168.122.1:8888`});
  //const session = new IncapsulaSession({ proxyUrl: `quic://127.0.0.1:4477` });
  await session.go({url : `https://www.pokemoncenter.com`, utmvc : DefaultUtmvcPayload, reese84 : DefaultReese84Payload});


  {

    let mainPage = await session.fetch(`https://www.pokemoncenter.com`, { headers : session.defaultHeaders, agent : session.agent});
    let body = await mainPage.text();
    console.log(body)

    //const utmvcUrl = session.findUtmvcUrl({url : `https://www.pokemoncenter.com`, body});
    await session.doNonCaptchaMode({url : `https://www.pokemoncenter.com`, body, options : { utmvc : DefaultReese84Payload, reese84 : DefaultReese84Payload}});
  }

  {

    let mainPage = await session.fetch(`https://www.pokemoncenter.com`, { headers : session.defaultHeaders, agent : session.agent});
    let body = await mainPage.text();
    console.log(mainPage.status)
  }




  console.log(`cookies:${session.getCookies('https://www.pokemoncenter.com')}`)


}())
