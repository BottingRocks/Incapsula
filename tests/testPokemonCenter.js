
const { nonCaptchaMode } = require("../incapsula/pokemoncenter.js");
const DefaultUtmvcPayload = require("../incapsula/payloads/utmvc.js");
const DefaultReese84Payload = require("../incapsula/payloads/reese84.js");

(async function(){

  const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36`;
  //const proxyUrl = `http://kcxqtp12:9lve7X84Nz@162.33.166.81:65437`;
  const proxyUrl = `http://192.168.122.1:8888`;
  const utmvcPayload = DefaultUtmvcPayload;
  const reese84Payload = DefaultReese84Payload;

  await nonCaptchaMode({userAgent, proxyUrl, utmvcPayload, reese84Payload});


}())
