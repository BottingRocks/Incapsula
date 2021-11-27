

const fetchCookie = require(`fetch-cookie`);
const fs = require(`fs`);
const HttpsProxyAgent = require(`https-proxy-agent`);
const nodeFetch = require(`node-fetch`);
const path = require(`path`);
const Reese84 = require(`./reese84/reese84.js`);
const Utmvc = require(`./utmvc/utmvc.js`);


async function nonCaptchaMode({userAgent, proxyUrl, utmvcPayload, reese84Payload}){

  const agent = proxyUrl !== undefined ? new HttpsProxyAgent(proxyUrl) : undefined;
  const ua = userAgent === undefined ? `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:93.0) Gecko/20100101 Firefox/93.0` : userAgent;

  const cookieJar =  new fetchCookie.toughCookie.CookieJar();
  const fetch = fetchCookie(nodeFetch, cookieJar, false);
  const defaultHeaders = {
    "User-Agent" : ua,
    "Kept-Alive" : "Yes",
    "Accept-Language" : "en-US,en;q=0.9",
    "Accept" : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    'Host' : 'www.pokemoncenter.com',
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8' ,
    'Accept-Language: en-US,en;q=0.5',
    'Upgrade-Insecure-Requests: 1',
    'Sec-Fetch-Dest: document',
    'Sec-Fetch-Mode: navigate',
    'Sec-Fetch-Site: none',
    'Sec-Fetch-User' : '?1' ,
    'Pragma' : 'no-cache',
    'Cache-Control: no-cache'
  }

  const result = {
    "status" : null,
    "cookies" : ""
  };

  console.log(`fetching page`)
  const mainPage = await fetch('https://www.pokemoncenter.com/', { headers : defaultHeaders, agent : agent});
  const body = await mainPage.text();

  const hasCaptchaFrame = (html) => html.indexOf(`<iframe id="main-iframe"`) !== -1;

  //If we find a captcha then we exit as we are currently not handling captchas here
  if(hasCaptchaFrame(body)){
    result["status"] = "captcha"
    console.log(`found captcha`, body)
    return result;
  }


  console.log(`body`, body);
  const mainPage2 = await fetch('https://www.pokemoncenter.com/', { headers : defaultHeaders, agent : agent});
  const body2 = await mainPage2.text();

  console.log(`body2`, body2);
}


module.exports = {
  nonCaptchaMode
};
