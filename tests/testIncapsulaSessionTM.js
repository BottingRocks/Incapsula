
const IncapsulaSession = require("../incapsula/tmsession.js");
const DefaultReese84Payload2 = require("../incapsula/payloads/reese84-balance.js");

(async function(){
  //const session = new IncapsulaSession();
  //const userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36`;
  const userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:100.0) Gecko/20100101 Firefox/100.0`;
  const session = new IncapsulaSession({proxyUrl : `http://127.0.0.1:8888`, userAgent : DefaultReese84Payload2["user_agent"]});
  //const session = new IncapsulaSession({proxyUrl : `http://127.0.0.1:1080`});
  const result = await session.go({reese84 : DefaultReese84Payload2});
  console.log(result);



}())


